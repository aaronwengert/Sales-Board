import Papa from "papaparse";

// ─────────────────────────────────────────────────────────────
//  Roster — wholesale teams (count toward the $100M goal) plus the
//  retail/correspondent desks and former AEs.
// ─────────────────────────────────────────────────────────────
export type Channel = "wholesale" | "retail" | "correspondent";

// Per-channel board configuration. Same tiles/logic; only the label and the
// monthly funded goal (drives the pace tile) differ.
export const BOARDS: Record<Channel, { title: string; goal: number }> = {
  wholesale:     { title: "Wholesale Sales Production",     goal: 100e6 },
  retail:        { title: "Retail Sales Production",        goal:  20e6 },
  correspondent: { title: "Correspondent Sales Production", goal:  50e6 },
};

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
// An AE belongs on a given channel's board if their team is that channel.
// Former AEs are a wholesale-only concept (their wholesale funded loans still
// count toward the $100M goal).
function counts(ae: string, channel: Channel) {
  if (chanFor(ae) === channel) return true;
  if (channel === "wholesale" && isFormer(ae)) return true;
  return false;
}

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
  rows: [string, string, number, number, number, number, number, number, number][];
  today: Record<string, [number, number, number]>;
  mtd: Record<string, number>;
  tix: Record<string, number>;
  callsPending: boolean;
  tixPending: boolean;
  kpi: {
    pipeline: number; pipeLocked: number; pipeUnlocked: number; lockedPct: number;
    funded: number; fundedUnits: number; goalElig: number;
    ctc: number; ctcUnits: number; fundedCtc: number;
  };
  updatedLabel: string;
  callsUpdatedLabel: string;
  title: string;
  goal: number;
  channel: Channel;
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

export function computeBoard(prodCsv: string, callsCsv: string | null, callsIsToday: boolean, updatedLabel: string, callsUpdatedLabel: string, channel: Channel = "wholesale", ticketsCsv: string | null = null, tixIsToday: boolean = false): BoardData {
  const cfg = BOARDS[channel];
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

  type Agg = { pipe: number; ctc: number; ctcU: number; fund: number; units: number; goalElig: number; total: number };
  const ae: Record<string, Agg> = {};
  const mtd: Record<string, number> = {};
  const today: Record<string, [number, number, number]> = {};
  const A = (n: string) => (ae[n] ||= { pipe: 0, ctc: 0, ctcU: 0, fund: 0, units: 0, goalElig: 0, total: 0 });

  let pipeAll = 0, pipeLocked = 0, ctcAll = 0, ctcUnits = 0, fundAll = 0, fundUnits = 0, eligAll = 0;

  for (const r of rd) {
    const name = (r["Lender Account Executive Name"] || "").trim();
    if (!name || !(r["Loan Number"] || "").trim()) continue;
    const wh = counts(name, channel);
    const st = (r["Loan Status"] || "").trim().toLowerCase();
    const ch = (r["Loan Channel"] || "").trim().toLowerCase();
    const amt = money(r["Total Loan Amount"]);
    const fd = mdy(r["Funded Date"]);
    const locked = (r["Rate Locked Date"] || "").trim() !== "";
    const od = mdy(r["Opened Date"]);
    // Channel gate: correspondent-channel loans don't count on a non-correspondent
    // board. Retail-channel loans by a wholesale AE DO count (they keep that
    // production); only correspondent is carved out.
    const chOk = channel === "correspondent" || ch !== "correspondent";

    // Retail & correspondent desks live earlier in the funnel — count "Registered"
    // as pipeline there for visibility. Wholesale keeps its stricter pipeline set.
    const inPipe = PIPE.has(st) || (channel !== "wholesale" && st === "registered");

    if (wh) {
      const a = A(name);
      if (inPipe) { a.pipe += amt; pipeAll += amt; if (locked) pipeLocked += amt; }
      else if (CTC.has(st)) { a.ctc += amt; a.ctcU += 1; ctcAll += amt; ctcUnits += 1; }
      else if (FUND.has(st) && fd && fd.m === lm && fd.y === ly && chOk) {
        // Funded production for the reporting month (correspondent carved out above).
        a.fund += amt; a.units += 1; fundAll += amt; fundUnits += 1;
        a.goalElig += amt; eligAll += amt;
      }
      // Subs = loans OPENED in the reporting month (Opened Date). Correspondent
      // opens are excluded on non-correspondent boards, same as funded.
      if (od && od.m === lm && od.y === ly && chOk) {
        mtd[name] = (mtd[name] || 0) + 1;
        if (od.m === todayM && od.d === todayD && od.y === todayY) {
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

  // Tickets → count of tickets per board AE (one row per ticket). The tickets
  // file resets each day, so tallying every row in the newest file gives the
  // running same-day count (grows through the day, back to 0 the next day).
  const tix: Record<string, number> = {};
  if (ticketsCsv) {
    const parsed = Papa.parse<Record<string, string>>(ticketsCsv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const byNorm: Record<string, number> = {};
    for (const r of parsed.data) {
      const u = norm(r["User Name"] || "");
      if (u) byNorm[u] = (byNorm[u] || 0) + 1;
    }
    for (const name of Object.keys(ae)) {
      const c = byNorm[norm(name)];
      if (c) tix[name] = c;
    }
  }

  // Board rows. Wholesale lists AEs who funded in the month. Retail &
  // correspondent also list AEs who have pipeline or CTC production but haven't
  // funded yet (smaller desks — show the active book, not just funders).
  const showActive = channel !== "wholesale";
  const rows: BoardData["rows"] = [];
  for (const [name, a] of Object.entries(ae)) {
    if (a.units === 0 && !(showActive && (a.pipe > 0 || a.ctc > 0))) continue;
    const teamName = isFormer(name) ? `${FORMER_TEAM[norm(name)]} · former` : teamFor(name);
    const avg = a.units ? a.fund / a.units : 0;
    const total = a.fund + a.ctc;
    rows.push([name, teamName, a.pipe, a.units, a.fund, Math.round(avg), a.ctc, total, a.ctcU]);
  }
  rows.sort((x, y) => y[7] - x[7]);

  const pipeUnlocked = pipeAll - pipeLocked;
  return {
    rows,
    today,
    mtd,
    tix,
    callsPending: !callsIsToday,
    tixPending: !(ticketsCsv && tixIsToday),
    kpi: {
      pipeline: pipeAll, pipeLocked, pipeUnlocked, lockedPct: pipeAll ? pipeLocked / pipeAll * 100 : 0,
      funded: fundAll, fundedUnits: fundUnits, goalElig: eligAll,
      ctc: ctcAll, ctcUnits, fundedCtc: fundAll + ctcAll,
    },
    updatedLabel,
    callsUpdatedLabel,
    title: cfg.title,
    goal: cfg.goal,
    channel,
  };
}
