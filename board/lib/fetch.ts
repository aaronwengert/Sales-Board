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
// OOO_URL is the optional second source, for when the projections app is ready
// to serve the same information; the sheet wins if both are configured.
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
  if (!res.ok) return [];
  const j: any = await res.json();
  if (j?.date && j.date !== today) return [];      // never apply a stale list
  return Array.isArray(j?.ooo) ? j.ooo.filter((n: any) => typeof n === "string") : [];
}

/**
 * Who is out today. Sources in priority order:
 *   1. the /ooo screen's own store (Vercel Blob) — the normal path
 *   2. a Google Sheet, if OOO_SHEET_ID is set
 *   3. an external endpoint, if OOO_URL is set (e.g. the projections app later)
 *
 * Nobody-is-out is the safe default: any failure here leaves the board as-is.
 */
async function fetchOOO(): Promise<string[]> {
  const today = azTodayISO();
  try {
    if (storeConfigured()) return namesOn(await readEntries(), oooToday());
    if (OOO_SHEET_ID) return await oooFromSheet(Number(today.replace(/-/g, "")));
    if (OOO_URL) return await oooFromUrl(today);
  } catch { /* fall through */ }
  return [];
}

function emptyBoard(channel: Channel): BoardData {
  const cfg = BOARDS[channel];
  return {
    rows: [], today: {}, mtd: {}, tix: {}, tixTotal: 0, dashAEs: [], exemptAEs: [], oooAEs: [], callsPending: true, tixPending: true,
    kpi: { pipeline: 0, pipeLocked: 0, pipeUnlocked: 0, lockedPct: 0, pipeSoft: 0, pipeStale: 0, pipeStaleN: 0, funded: 0, fundedUnits: 0, goalElig: 0, ctc: 0, ctcUnits: 0, fundedCtc: 0 },
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
