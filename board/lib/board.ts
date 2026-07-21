import Papa from "papaparse";

// ─────────────────────────────────────────────────────────────
//  Roster — wholesale teams (count toward the $100M goal) plus the
//  retail/correspondent desks and former AEs.
// ─────────────────────────────────────────────────────────────
type Channel = "wholesale" | "retail" | "correspondent";
const TEAMS: Record<string, { channel: Channel; aes: string[] }> = {
  "The Rainmakers": { channel: "wholesale", aes: ["Brian Sherrill","Benjamin Martin","Djimon Colbert","Gregory Ward","Jacob Andrew","Joseph Marino","Kyle Shanahan","Logan Kincade","Mari Woods","Reese Rogers","Zia Hasso"] },
  "Cash Flow Commanders": { channel: "wholesale", aes: ["Matthew Cefalo","Jeff Laux","John Oliveri","Paul Goodwin","Robert Morton","Adam Paniagua"] },
  "Cash Flow Cowboys": { channel: "wholesale", aes: ["John Giordano","Francisco Cueto","Jeremy Rohrer","Keir Buettner","Kyle Bilby","Kyle Holmes","Paul Gallegos","Reginald Peterson","Tyler Bilby"] },
  "CTC Crusaders": { channel: "wholesale", aes: ["Adam Martin","Andrew Nwaoko","Bryce Welker","Caleb Sherrill","Michael Blaschuk","Ryan Matyniak"] },
  "Lien Kings": { channel: "wholesale", aes: ["Eric Ferguson","Alfredo Sanchez II","Alfredo Sanchez","Christopher Nish","Cody Aadland","Dylan Bray","John Carnino","Myles Taylor","Waleed Smith"] },
  "Bone Crushers": { channel: "wholesale", aes: ["Mike Ernst","Da'Shann Austin","Johnny Salmons","Owen Wakeman","Sonny Haskins"] },
  "Retail": { channel: "retail", aes: ["Garrett Bowlby","Tom Wright","Kenneth Kohnhorst","Robert Bosolet","Kenneth Bowlby","Eric Bowlby","Carlos Hidalgo"] },
  "Correspondent": { channel: "correspondent", aes: ["Danielle King","Hugh Sinclair","Tracy Collins","Darin Judis","Dianne Minor","Todd Lautzenheiser"] },
};
// Former AEs still count: their wholesale-channel funded loans count toward the
// goal, and they show on the board (tagged "· former") any month they funded.
const FORMER_TEAM: Record<string, string> = { "aj laux": "The Rainmakers", "amari aiu": "The Rainmakers" };

const PIPE = new Set(["approved","condition review","in underwriting","final underwriting"]);
const CTC = new Set(["clear to close","docs out","docs back","docs ordered"]);
const FUND = new Set(["funded","loan shipped","in purchase review","in final purchase review","ready for sale"]);

function norm(s: string) { return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }
const NAME2TEAM: Record<string, string> = {};
const TEAM2CH: Record<string, Channel> = {};
for (const [t, d] of Object.entries(TEAMS)) { TEAM2CH[t] = d.channel; for (const a of d.aes) NAME2TEAM[norm(a)] = t; }
function teamFor(ae: string) { return NAME2TEAM[norm(ae)] || ""; }
function isFormer(ae: string) { return norm(ae) in FORMER_TEAM; }
function chanFor(ae: string): Channel | "" { const t = teamFor(ae); return t ? TEAM2CH[t] : ""; }
function counts(ae: string) { return chanFor(ae) === "wholesale" || isFormer(ae); }

function money(s: string) { const n = parseFloat((s || "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; }
function mdy(s: string): { m: number; d: number; y: number } | null {
  const m = (s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? { m: +m[1], d: +m[2], y: +m[3] } : null;
}
function toMin(s: string) { const p = (s || "00:00:00").split(":"); return p.length === 3 ? +p[0] * 60 + +p[1] + +p[2] / 60 : 0; }

// Arizona "now" (America/Phoenix, MST year-round).
function azNow(): Date { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" })); }
function azDateOf(iso: string): { m: number; d: number; y: number } {
  const dt = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix" }));
  return { m: dt.getMonth() + 1, d: dt.getDate(), y: dt.getFullYear() };
}

export type BoardData = {
  rows: [string, string, number, number, number, number, number, number][];
  today: Record<string, [number, number, number]>;
  mtd: Record<string, number>;
  callsPending: boolean;
  kpi: {
    pipeline: number; pipeLocked: number; pipeUnlocked: number; lockedPct: number;
    funded: number; fundedUnits: number; goalElig: number;
    ctc: number; ctcUnits: number; fundedCtc: number;
  };
  updatedLabel: string;
  callsUpdatedLabel: string;
  error?: string;
};

function extractProd(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/);
  const hi = lines.findIndex((l) => l.includes("Lender Account Executive Name"));
  if (hi < 0) return [];
  const rest = lines.slice(hi + 1).filter((l, i) => !(i === 0 && /^[\s",|-]*-{3,}/.test(l)) && l.trim() !== "");
  const table = [lines[hi], ...rest].join("\n");
  const parsed = Papa.parse<Record<string, string>>(table, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  return parsed.data;
}

export function computeBoard(prodCsv: string, callsCsv: string | null, callsIsToday: boolean, updatedLabel: string, callsUpdatedLabel: string): BoardData {
  const rd = extractProd(prodCsv);
  const az = azNow();
  const todayM = az.getMonth() + 1, todayD = az.getDate(), todayY = az.getFullYear();

  // Determine latest funded month across the file.
  let latestKey = ""; // "YYYY-MM"
  for (const r of rd) {
    const st = (r["Loan Status"] || "").trim().toLowerCase();
    const fd = mdy(r["Funded Date"]);
    if (FUND.has(st) && fd) { const k = `${fd.y}-${String(fd.m).padStart(2, "0")}`; if (k > latestKey) latestKey = k; }
  }
  const [ly, lm] = latestKey ? latestKey.split("-").map(Number) : [todayY, todayM];

  type Agg = { pipe: number; ctc: number; fund: number; units: number; goalElig: number; total: number };
  const ae: Record<string, Agg> = {};
  const mtd: Record<string, number> = {};
  const today: Record<string, [number, number, number]> = {};
  const A = (n: string) => (ae[n] ||= { pipe: 0, ctc: 0, fund: 0, units: 0, goalElig: 0, total: 0 });

  let pipeAll = 0, pipeLocked = 0, ctcAll = 0, ctcUnits = 0, fundAll = 0, fundUnits = 0, eligAll = 0;

  for (const r of rd) {
    const name = (r["Lender Account Executive Name"] || "").trim();
    if (!name || !(r["Loan Number"] || "").trim()) continue;
    if (!counts(name)) {
      // still track submissions for non-board? no — only board AEs matter for subs columns
    }
    const wh = counts(name);
    const st = (r["Loan Status"] || "").trim().toLowerCase();
    const ch = (r["Loan Channel"] || "").trim().toLowerCase();
    const amt = money(r["Total Loan Amount"]);
    const fd = mdy(r["Funded Date"]);
    const locked = (r["Rate Locked Date"] || "").trim() !== "";
    const dc = mdy(r["Document Check Date"]);

    if (wh) {
      const a = A(name);
      if (PIPE.has(st)) { a.pipe += amt; pipeAll += amt; if (locked) pipeLocked += amt; }
      else if (CTC.has(st)) { a.ctc += amt; ctcAll += amt; ctcUnits += 1; }
      else if (FUND.has(st) && fd && fd.m === lm && fd.y === ly) {
        a.fund += amt; a.units += 1; fundAll += amt; fundUnits += 1;
        if (ch !== "correspondent") { a.goalElig += amt; eligAll += amt; }
      }
      // MTD subs = Document Check date in the reporting month
      if (dc && dc.m === lm && dc.y === ly) {
        mtd[name] = (mtd[name] || 0) + 1;
        if (dc.m === todayM && dc.d === todayD && dc.y === todayY) {
          today[name] = today[name] || [0, 0, 0];
          today[name][2] += 1;
        }
      }
    }
  }

  // Call activity → outbound calls + talk minutes per board AE.
  if (callsCsv) {
    const parsed = Papa.parse<Record<string, string>>(callsCsv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const byNorm: Record<string, [number, number]> = {};
    for (const r of parsed.data) {
      const n = norm(r["User"] || "");
      byNorm[n] = [parseInt(r["Outbound Calls"] || "0", 10) || 0, toMin(r["Outbound Call Duration"])];
    }
    for (const name of Object.keys(ae)) {
      const c = byNorm[norm(name)];
      if (c) { today[name] = today[name] || [0, 0, 0]; today[name][0] = c[0]; today[name][1] = Math.round(c[1]); }
    }
  }

  // Board rows: wholesale-team or former AEs with funded production in the month.
  const rows: BoardData["rows"] = [];
  for (const [name, a] of Object.entries(ae)) {
    if (a.units === 0) continue;
    const teamName = isFormer(name) ? `${FORMER_TEAM[norm(name)]} · former` : teamFor(name);
    const avg = a.units ? a.fund / a.units : 0;
    const total = a.fund + a.ctc;
    rows.push([name, teamName, a.pipe, a.units, a.fund, Math.round(avg), a.ctc, total]);
  }
  rows.sort((x, y) => y[7] - x[7]);

  const pipeUnlocked = pipeAll - pipeLocked;
  return {
    rows,
    today,
    mtd,
    callsPending: !callsIsToday,
    kpi: {
      pipeline: pipeAll, pipeLocked, pipeUnlocked, lockedPct: pipeAll ? pipeLocked / pipeAll * 100 : 0,
      funded: fundAll, fundedUnits: fundUnits, goalElig: eligAll,
      ctc: ctcAll, ctcUnits, fundedCtc: fundAll + ctcAll,
    },
    updatedLabel,
    callsUpdatedLabel,
  };
}
