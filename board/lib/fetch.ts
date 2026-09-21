import { google } from "googleapis";
import Papa from "papaparse";
import { readEntries, namesOn, azToday as oooToday, storeConfigured } from "./ooo";
import { computeBoard, BOARDS, type BoardData, type Channel } from "./board";

const POWERBI = process.env.POWERBI_FOLDER_ID || "1kNFwyV5Jn-JNtlKdXph2KoWFwwX_A5yk";
const CALLS = process.env.CALL_REPORTS_FOLDER_ID || "16al-d-n0hlYV_X84pj74ChMR-b-b5nYJ";
const TICKETS = process.env.TICKETS_FOLDER_ID || "1BUT5Qxv4LNX-tGSJ5JTgfYB-baQbKep2";

// Out-of-office roster.
//
// Primary source is a plain Google Sheet that managers edit directly — no new
// app, no new login, and it reuses the same service account the board already
// uses for Drive. Share the sheet with GOOGLE_SERVICE_ACCOUNT_EMAIL (viewer is
// enough) and set OOO_SHEET_ID to the id in its URL.
//
// Sheet layout — one row per absence, header row required:
//
//     Name              | Start      | End        | Note
//     Bryce Welker      | 2026-08-17 | 2026-08-21 | vacation
//     Mari Woods        | 2026-08-18 |            | appointment
//
// End blank means a single day. Dates may be YYYY-MM-DD or M/D/YYYY. Rows are
// evaluated against the Arizona business day, so a range covers whole days.
//
// OOO_URL is the projections app: set it to https://<projections host>/api/ooo
// and OOO_KEY to the same value as that deployment's OOO_KEY. It serves
// { date, ooo: [names] } for the day the board asks for.
//
// All three sources are merged, not ranked — see fetchOOO below. Each is
// independent, so leaving one unset simply drops it from the union.
const OOO_SHEET_ID = process.env.OOO_SHEET_ID || "";
const OOO_URL = process.env.OOO_URL || "";
const OOO_KEY = process.env.OOO_KEY || "";

function hasCreds() { return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY); }
function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

type DFile = { id: string; name: string; modifiedTime: string };

/** Every CSV in a folder, newest first, paging until `max` or exhaustion.
 *  The live board only ever wants the newest file and so asks for 25; a week
 *  replay has to reach back through five days of half-hourly snapshots, which
 *  is several hundred. */
export async function listAllCsvs(folderId: string, max = 1200): Promise<DFile[]> {
  const d = client();
  const out: DFile[] = [];
  let pageToken: string | undefined;
  do {
    const res: any = await d.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType = 'text/csv' or name contains '.csv')`,
      fields: "nextPageToken, files(id,name,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files || []) {
      out.push({ id: f.id, name: f.name, modifiedTime: f.modifiedTime || "" });
      if (out.length >= max) return out;
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return out;
}

export { download as driveDownload, azDateStr as azDayOf };
export const FOLDERS = { prod: POWERBI, calls: CALLS, tickets: TICKETS };
export function driveReady() { return hasCreds(); }

async function listCsvs(folderId: string): Promise<DFile[]> {
  const d = client();
  const res: any = await d.files.list({
    q: `'${folderId}' in parents and trashed = false and (mimeType = 'text/csv' or name contains '.csv')`,
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 25,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files || []).map((f: any) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime || "" }));
}
async function download(id: string): Promise<string> {
  const d = client();
  const res: any = await d.files.get({ fileId: id, alt: "media", supportsAllDrives: true }, { responseType: "text" });
  return typeof res.data === "string" ? res.data : String(res.data);
}

function azTimeLabel(iso: string): string {
  try {
    const t = new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit" });
    return t + " MST";
  } catch { return "—"; }
}
function azDateStr(iso: string): string {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix" })).toDateString();
}
function azTodayStr(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" })).toDateString();
}

/** Today's Arizona date as YYYY-MM-DD — the business day both sources agree on. */
function azTodayISO(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" }));
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
/** Accepts 2026-08-17 or 8/17/2026; returns YYYYMMDD as a number, or 0. */
function dayKey(v: string): number {
  const t = (v || "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return +m[1] * 10000 + +m[2] * 100 + +m[3];
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return +m[3] * 10000 + +m[1] * 100 + +m[2];
  return 0;
}

/** Read the OOO sheet and return whoever is out on the given Arizona day. */
async function oooFromSheet(todayKey: number): Promise<string[]> {
  const d = client();
  // Exporting as CSV works with the read-only Drive scope the board already has,
  // so no extra API needs enabling.
  const res: any = await d.files.export({ fileId: OOO_SHEET_ID, mimeType: "text/csv" }, { responseType: "text" });
  const csv = typeof res.data === "string" ? res.data : String(res.data);
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase(),
  });
  const out: string[] = [];
  for (const r of parsed.data) {
    const name = (r["name"] || r["ae"] || "").trim();
    if (!name) continue;
    const start = dayKey(r["start"] || r["date"] || "");
    if (!start) continue;
    const end = dayKey(r["end"] || "") || start;   // blank end = single day
    if (todayKey >= start && todayKey <= end) out.push(name);
  }
  return out;
}

/**
 * Optional second source: an endpoint returning
 *   { "date": "2026-08-17", "ooo": ["Bryce Welker", "Mari Woods"] }
 */
async function oooFromUrl(today: string): Promise<string[]> {
  const url = OOO_URL + (OOO_URL.includes("?") ? "&" : "?") + "date=" + today;
  const res = await fetch(url, {
    headers: OOO_KEY ? { "x-api-key": OOO_KEY } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    /*
     * Say something before giving up.
     *
     * This used to return an empty list on any non-OK response, which is the
     * right BEHAVIOUR — one broken source must never blank the board — but it
     * made a misconfiguration indistinguishable from a quiet day. A key that
     * does not match the projections app returns 401 here, and the board
     * showed exactly what it shows when nobody is out: nothing. There was no
     * way to tell the two apart from outside, so a wrong key could sit there
     * for months.
     *
     * The status is enough to diagnose it: 401 is a key mismatch, 503 is the
     * far end not configured, a timeout is the far end down. Nothing secret
     * is logged.
     */
    console.warn(
      `[ooo] projections feed returned ${res.status} ${res.statusText} — ` +
        `no names taken from it. 401 means OOO_KEY here does not match the ` +
        `one on the projections deployment.`
    );
    return [];
  }
  const j: any = await res.json();
  if (j?.date && j.date !== today) return [];      // never apply a stale list
  return Array.isArray(j?.ooo) ? j.ooo.filter((n: any) => typeof n === "string") : [];
}

/** Whoever the /ooo screen's own store says is out today. */
async function oooFromStore(): Promise<string[]> {
  return namesOn(await readEntries(), oooToday());
}

/**
 * Who is out today, from every source that is configured.
 *
 * A UNION, not a priority order. These are three genuinely different entry
 * points — the /ooo screen where a manager books someone's week of vacation,
 * a Google Sheet for whoever would rather use a spreadsheet, and the
 * projections app where an AE marks a single day from their phone — and a
 * name from any of them is equally true. Ranking them meant the Blob store,
 * once connected, silently discarded the other two, so an absence entered
 * anywhere else simply never reached the board.
 *
 * Each source is isolated with allSettled: one failing or timing out never
 * suppresses the others, and every source failing leaves "nobody is out",
 * which is the safe default the board already assumed.
 */
async function fetchOOO(): Promise<string[]> {
  const today = azTodayISO();
  const jobs: Promise<string[]>[] = [];
  if (storeConfigured()) jobs.push(oooFromStore());
  if (OOO_SHEET_ID) jobs.push(oooFromSheet(Number(today.replace(/-/g, ""))));
  if (OOO_URL) jobs.push(oooFromUrl(today));
  if (jobs.length === 0) return [];

  const settled = await Promise.allSettled(jobs);

  // Dedupe case-insensitively, keeping the first spelling seen. The same
  // person marked out in two places must not appear twice, and downstream
  // matching (computeBoard, the digest) is case-insensitive anyway.
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value) {
      const name = String(raw ?? "").trim();
      if (!name) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
  }
  return out;
}

function emptyBoard(channel: Channel): BoardData {
  const cfg = BOARDS[channel];
  return {
    rows: [], today: {}, mtd: {}, tix: {}, tixTotal: 0, dashAEs: [], roles: {}, noTierAEs: [], newAEs: [], exemptAEs: [], stage: {}, teamManagers: {}, oooAEs: [], callsPending: true, tixPending: true,
    kpi: { pipeline: 0, pipeLocked: 0, pipeUnlocked: 0, lockedPct: 0, pipeSoft: 0, pipeStale: 0, pipeStaleN: 0, funded: 0, fundedUnits: 0, goalElig: 0, ctc: 0, ctcUnits: 0, fundedCtc: 0, docCheckToday: 0, uwToday: 0, subsToday: 0 },
    updatedLabel: "—",
    callsUpdatedLabel: "—",
    title: cfg.title, goal: cfg.goal, channel,
  };
}

export async function getBoard(channel: Channel = "wholesale"): Promise<BoardData> {
  const EMPTY = emptyBoard(channel);
  if (!hasCreds()) return { ...EMPTY, error: "no-credentials" };
  try {
    const [prodFiles, callFiles, ticketFiles, ooo] = await Promise.all([
      listCsvs(POWERBI), listCsvs(CALLS), listCsvs(TICKETS), fetchOOO(),
    ]);
    // Newest production CSV that actually contains the Sales Board header.
    let prodCsv = "", prodFile: DFile | null = null;
    for (const f of prodFiles) {
      const text = await download(f.id);
      if (text.includes("Lender Account Executive Name")) { prodCsv = text; prodFile = f; break; }
    }
    if (!prodFile) return { ...EMPTY, error: "no-production" };

    // Newest "Users Summary" call report. Match is separator-tolerant so it
    // catches both "Users Summary_….csv" (space) and "users_summary_….csv"
    // (underscore) — the export's filename format changed 2026-07-23.
    const callFile = callFiles.find((f) => /users[^a-z0-9]*summary/i.test(f.name)) || null;
    let callsCsv: string | null = null, callsIsToday = false;
    if (callFile) {
      callsCsv = await download(callFile.id);
      callsIsToday = azDateStr(callFile.modifiedTime) === azTodayStr();
    }
    const callsLabel = callFile ? azTimeLabel(callFile.modifiedTime) : "—";

    // Newest tickets CSV that actually parses as text (skips the occasional
    // image accidentally saved with a .csv name). Header has "User Name".
    let ticketsCsv: string | null = null, tixIsToday = false;
    for (const f of ticketFiles) {
      const text = await download(f.id);
      if (text.includes("User Name")) {
        ticketsCsv = text;
        tixIsToday = azDateStr(f.modifiedTime) === azTodayStr();
        break;
      }
    }

    return computeBoard(prodCsv, callsCsv, callsIsToday, azTimeLabel(prodFile.modifiedTime), callsLabel, channel, ticketsCsv, tixIsToday, ooo);
  } catch (e: any) {
    return { ...EMPTY, error: e?.message || String(e) };
  }
}
