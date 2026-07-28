import Papa from "papaparse";
import { google } from "googleapis";
import { roster, type Channel } from "./board";

// ─────────────────────────────────────────────────────────────
//  Activity reporting engine — WTD / MTD / custom-range rollups.
//
//  The calls and tickets exports land in Drive many times a day and reset
//  overnight, so each day's LAST file holds that day's full totals. This
//  engine takes, for every business day in the range, the final calls file
//  and final tickets file, counts subs by Opened Date from the newest sales
//  file, and rolls everything up per AE and per team.
// ─────────────────────────────────────────────────────────────

const POWERBI = process.env.POWERBI_FOLDER_ID || "1kNFwyV5Jn-JNtlKdXph2KoWFwwX_A5yk";
const CALLS = process.env.CALL_REPORTS_FOLDER_ID || "16al-d-n0hlYV_X84pj74ChMR-b-b5nYJ";
const TICKETS = process.env.TICKETS_FOLDER_ID || "1BUT5Qxv4LNX-tGSJ5JTgfYB-baQbKep2";

const CALLS_GOAL = 75, TALK_GOAL = 90, SUB_GOAL = 1, TIX_GOAL = 3;

type DayFiles = { date: string; callsCsv: string | null; ticketsCsv: string | null };
export type AERow = { name: string; team: string; calls: number; talk: number; tix: number; subs: number; hitDays: number };
export type TeamRow = { team: string; reps: number; calls: number; talk: number; tix: number; subs: number; hitDays: number };
export type Report = {
  channel: Channel;
  label: string;
  from: string; to: string;           // YYYY-MM-DD (AZ)
  days: string[];                     // business days covered
  daysMissingCalls: string[];         // days with no calls file found
  daysMissingTix: string[];
  perAE: AERow[];
  perTeam: TeamRow[];
};

function azNow(): Date { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" })); }
function ymd(d: Date): string { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function azDateStr(iso: string): string { return ymd(new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix" }))); }
function toMin(s: string) { const p = (s || "00:00:00").split(":"); return p.length === 3 ? +p[0] * 60 + +p[1] + +p[2] / 60 : 0; }

// Resolve a range keyword to [from, to] in AZ. Weekends are kept (activity is
// rare but real); "wtd" starts Monday of the current week, "mtd" on the 1st.
export function resolveRange(range: string, from?: string, to?: string): { from: string; to: string; label: string } {
  const now = azNow(); now.setHours(0, 0, 0, 0);
  if (range === "custom" && from && to) return { from, to, label: `${from} → ${to}` };
  if (range === "mtd") { const f = new Date(now); f.setDate(1); return { from: ymd(f), to: ymd(now), label: "Month to date" }; }
  // default: wtd (Monday-start)
  const f = new Date(now); const dow = (f.getDay() + 6) % 7; f.setDate(f.getDate() - dow);
  return { from: ymd(f), to: ymd(now), label: "Week to date" };
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00"); const end = new Date(to + "T12:00:00");
  while (d <= end) { out.push(ymd(d)); d.setDate(d.getDate() + 1); }
  return out;
}

// ── Pure aggregation (testable without Drive) ────────────────
export function buildReport(prodCsv: string, dayFiles: DayFiles[], channel: Channel, from: string, to: string, label: string): Report {
  const { norm, nkey, canon, teamFor, counts, mdy } = roster;
  const days = eachDay(from, to);

  type Acc = { calls: number; talk: number; tix: number; subs: number; hitDays: number };
  const acc: Record<string, Acc> = {};
  const A = (n: string) => (acc[n] ||= { calls: 0, talk: 0, tix: 0, subs: 0, hitDays: 0 });

  // Seed the current roster so zero-activity reps still appear.
  for (const [, d] of Object.entries(roster.TEAMS)) {
    if (d.channel === channel) for (const nm of d.aes) if (!roster.retired(nm)) A(nm);
  }

  // Subs per AE per day from the sales file (Opened Date).
  const subsByDay: Record<string, Record<string, number>> = {}; // date -> name -> n
  {
    const lines = prodCsv.split(/\r?\n/);
    const hi = lines.findIndex((l) => l.includes("Lender Account Executive Name"));
    if (hi >= 0) {
      const rest = lines.slice(hi + 1).filter((l, i) => !(i === 0 && /^[\s",|-]*-{3,}/.test(l)) && l.trim() !== "");
      const rows = Papa.parse<Record<string, string>>([lines[hi], ...rest].join("\n"), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() }).data;
      for (const r of rows) {
        const name = canon((r["Lender Account Executive Name"] || "").trim());
        if (!name || !(r["Loan Number"] || "").trim() || !counts(name, channel)) continue;
        const ch = (r["Loan Channel"] || "").trim().toLowerCase();
        if (channel !== "correspondent" && ch === "correspondent") continue;
        const od = mdy(r["Opened Date"]);
        if (!od) continue;
        const key = od.y + "-" + String(od.m).padStart(2, "0") + "-" + String(od.d).padStart(2, "0");
        if (key < from || key > to) continue;
        (subsByDay[key] ||= {})[name] = ((subsByDay[key] || {})[name] || 0) + 1;
      }
    }
  }

  const missCalls: string[] = [], missTix: string[] = [];
  const byDate: Record<string, DayFiles> = {};
  for (const f of dayFiles) byDate[f.date] = f;

  for (const date of days) {
    const df = byDate[date];
    const dayCalls: Record<string, [number, number]> = {};
    const dayTix: Record<string, number> = {};
    if (df?.callsCsv) {
      const rows = Papa.parse<Record<string, string>>(df.callsCsv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() }).data;
      for (const r of rows) {
        const k = nkey(r["User"] || "");
        if (k) dayCalls[k] = [parseInt(r["Outbound Calls"] || "0", 10) || 0, toMin(r["Outbound Call Duration"])];
      }
    } else missCalls.push(date);
    if (df?.ticketsCsv) {
      const rows = Papa.parse<Record<string, string>>(df.ticketsCsv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() }).data;
      for (const r of rows) {
        const k = nkey(r["User Name"] || "");
        if (k) dayTix[k] = (dayTix[k] || 0) + 1;
      }
    } else missTix.push(date);

    const daySubs = subsByDay[date] || {};
    for (const name of Object.keys(acc)) {
      const k = nkey(name);
      const c = dayCalls[k]?.[0] || 0, t = dayCalls[k]?.[1] || 0;
      const x = dayTix[k] || 0, s = daySubs[name] || 0;
      const a = acc[name];
      a.calls += c; a.talk += t; a.tix += x; a.subs += s;
      if (c >= CALLS_GOAL || t >= TALK_GOAL || s >= SUB_GOAL || x >= TIX_GOAL) a.hitDays += 1;
    }
  }

  const perAE: AERow[] = Object.entries(acc).map(([name, a]) => ({
    name, team: teamFor(name) || "—",
    calls: a.calls, talk: Math.round(a.talk), tix: a.tix, subs: a.subs, hitDays: a.hitDays,
  })).sort((x, y) => y.calls - x.calls);

  const tm: Record<string, TeamRow> = {};
  for (const r of perAE) {
    const t = (tm[r.team] ||= { team: r.team, reps: 0, calls: 0, talk: 0, tix: 0, subs: 0, hitDays: 0 });
    t.reps += 1; t.calls += r.calls; t.talk += r.talk; t.tix += r.tix; t.subs += r.subs; t.hitDays += r.hitDays;
  }
  const perTeam = Object.values(tm).sort((x, y) => y.calls - x.calls);

  return { channel, label, from, to, days, daysMissingCalls: missCalls, daysMissingTix: missTix, perAE, perTeam };
}

// ── Drive layer ──────────────────────────────────────────────
function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}
async function listAll(folderId: string, pageSize = 200) {
  const d = client();
  const res: any = await d.files.list({
    q: `'${folderId}' in parents and trashed = false and (mimeType = 'text/csv' or name contains '.csv')`,
    fields: "files(id,name,modifiedTime)", orderBy: "modifiedTime desc", pageSize,
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  return (res.data.files || []) as { id: string; name: string; modifiedTime: string }[];
}
async function download(id: string): Promise<string> {
  const d = client();
  const res: any = await d.files.get({ fileId: id, alt: "media", supportsAllDrives: true }, { responseType: "text" });
  return typeof res.data === "string" ? res.data : String(res.data);
}

export async function fetchReport(range: string, channel: Channel = "wholesale", from?: string, to?: string): Promise<Report> {
  const R = resolveRange(range, from, to);
  const [prodFiles, callFiles, tixFiles] = await Promise.all([listAll(POWERBI, 50), listAll(CALLS), listAll(TICKETS)]);

  // Newest sales file with the real header.
  let prodCsv = "";
  for (const f of prodFiles) {
    const text = await download(f.id);
    if (text.includes("Lender Account Executive Name")) { prodCsv = text; break; }
  }

  // Last calls + tickets file per AZ day in range (files are sorted newest-first,
  // so the first one seen for a date is that day's final snapshot).
  const lastCalls: Record<string, string> = {}, lastTix: Record<string, string> = {};
  for (const f of callFiles) {
    if (!/users[^a-z0-9]*summary/i.test(f.name)) continue;
    const d = azDateStr(f.modifiedTime);
    if (d >= R.from && d <= R.to && !lastCalls[d]) lastCalls[d] = f.id;
  }
  for (const f of tixFiles) {
    const d = azDateStr(f.modifiedTime);
    if (d >= R.from && d <= R.to && !lastTix[d]) lastTix[d] = f.id;
  }

  const days = eachDay(R.from, R.to);
  const dayFiles: DayFiles[] = [];
  for (const date of days) {
    let callsCsv: string | null = null, ticketsCsv: string | null = null;
    if (lastCalls[date]) callsCsv = await download(lastCalls[date]);
    if (lastTix[date]) {
      const text = await download(lastTix[date]);
      if (text.includes("User Name")) ticketsCsv = text;
    }
    dayFiles.push({ date, callsCsv, ticketsCsv });
  }
  return buildReport(prodCsv, dayFiles, channel, R.from, R.to, R.label);
}

// ── CSV serialization ────────────────────────────────────────
export function reportCsv(rep: Report, by: "ae" | "team" | "both" = "both"): string {
  const esc = (s: string) => '"' + String(s).replace(/"/g, '""') + '"';
  const L: string[] = [];
  L.push(`# ${rep.label} — ${rep.from} to ${rep.to} — ${rep.channel}`);
  if (rep.daysMissingCalls.length) L.push(`# no calls file found for: ${rep.daysMissingCalls.join(" ")}`);
  if (rep.daysMissingTix.length) L.push(`# no tickets file found for: ${rep.daysMissingTix.join(" ")}`);
  if (by !== "ae") {
    L.push("Team,Reps,Out Calls,Talk Min,Tickets,Subs,Goal-Hit Days");
    for (const t of rep.perTeam) L.push([esc(t.team), t.reps, t.calls, t.talk, t.tix, t.subs, t.hitDays].join(","));
  }
  if (by === "both") L.push("");
  if (by !== "team") {
    L.push("AE,Team,Out Calls,Talk Min,Tickets,Subs,Goal-Hit Days");
    for (const r of rep.perAE) L.push([esc(r.name), esc(r.team), r.calls, r.talk, r.tix, r.subs, r.hitDays].join(","));
  }
  return L.join("\n") + "\n";
}
