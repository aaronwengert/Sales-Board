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
  "Lien Kings": { channel: "wholesale", aes: ["Eric Ferguson","Alfredo Sanchez II","Christopher Nish","Cody Aadland","Dylan Bray","John Carnino","Myles Taylor","Waleed Smith"] },
  "Bone Crushers": { channel: "wholesale", aes: ["Da'Shann Austin","Johnny Salmons","Owen Wakeman","Sonny Haskins"] },
  "Retail": { channel: "retail", aes: ["Garrett Bowlby","Tom Wright","Kenneth Kohnhorst","Robert Bosolet","Kenneth Bowlby","Eric Bowlby","Carlos Hidalgo"] },
  "Correspondent": { channel: "correspondent", aes: ["Danielle King","Hugh Sinclair","Tracy Collins","Darin Judis","Dianne Minor","Todd Lautzenheiser"] },
};
// Former AEs still count: their wholesale-channel funded loans count toward the
// goal, and they show on the board (tagged "· former") any month they funded.
const FORMER_TEAM: Record<string, string> = { "aj laux": "The Rainmakers", "amari aiu": "The Rainmakers" };

// Scheduled removals: each AE drops off the board on/after this Arizona date —
// no longer seeded, counted, or shown. Set for reps leaving on a known date so
// the removal happens automatically without a redeploy.
const RETIRE: Record<string, string> = {
  "aj laux": "2026-08-01",
  "adam paniagua": "2026-08-01",
  "jeremy rohrer": "2026-08-01",
};

// House account: reps who are off the desk but whose loans are still in the
// system. They get no row on the board — no rank, no daily goal, no calls —
// but every dollar already on their files keeps counting in the team tiles, so
// removing a rep never silently deletes production from the month. There is no
// visible "House" row; the money simply stays in the totals up top.
const HOUSE = new Set(["reese rogers", "jeff laux"]);
function isHouse(ae: string) { return HOUSE.has(norm(ae)); }

// Daily-goal exemptions (wholesale):
// GOAL_DASH — kept on the board when they have production, but the TODAY
//   columns render as dashes and they are excluded from the goal % (numerator
//   and denominator). They are NOT seeded, so with no data they don't appear.
// GOAL_EXEMPT — TODAY data stays live on their row, but they are excluded
//   from the goal % math the same way.
const GOAL_DASH = new Set(["eric ferguson","adam martin","brian sherrill","matthew cefalo","john giordano","jeremy rohrer","adam paniagua"]);
const GOAL_EXEMPT = new Set(["dashann austin","joseph marino"]);

// Regular ("hard") pipeline, all channels. Loan On-hold was added to the
// Meridian Link export on 7/30/2026 and counts here like any other live file:
// it hits the team pipeline tile and the AE pipeline column, and it ages into
// the 30D+/60D+ idle bands the same way.
const PIPE = new Set(["approved","condition review","in underwriting","final underwriting","loan on-hold","loan on hold"]);
// Wholesale-only additions to the regular (hard) pipeline: doc-check stage
// plus Processing.
const HARD_EXTRA = new Set(["document check","document check failed","processing"]);
// "Soft" pipeline (wholesale): early-funnel loans count only while fresh —
// their Loan Status Date must be within the last 30 days (rolling, AZ).
const SOFT_PIPE = new Set(["loan open","registered"]);
// Statuses that still count toward the team pipeline tile but NOT toward an
// individual AE's pipeline column: early-funnel files (Loan Open, Registered)
// and pre-underwriting Processing.
const AE_PIPE_EXCLUDE = new Set(["loan open","registered","processing"]);
// Aging rules (wholesale hard pipeline): no movement for 30–59 days → counted
// but flagged STALE; no movement for 60+ days → removed from the pipeline
// (and from the stale number) entirely.
const CTC = new Set(["clear to close","docs out","docs back","docs ordered"]);
// "Loan Sold" counts as funded production by its Funded Date month, same as
// the other post-funding statuses.
const FUND = new Set(["funded","loan shipped","in purchase review","in final purchase review","ready for sale","loan sold"]);

function norm(s: string) { return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }
// Identity aliases: fold two spellings of the same person onto one canonical
// key so their production, calls, and tickets combine on a single row.
const ALIAS: Record<string, string> = { "alfredo sanchez": "alfredo sanchez ii" };
function nkey(s: string) { const n = norm(s); return ALIAS[n] || n; }
const NAME2TEAM: Record<string, string> = {};
const NAME2DISPLAY: Record<string, string> = {};
const TEAM2CH: Record<string, Channel> = {};
for (const [t, d] of Object.entries(TEAMS)) { TEAM2CH[t] = d.channel; for (const a of d.aes) { NAME2TEAM[norm(a)] = t; NAME2DISPLAY[norm(a)] = a; } }
function teamFor(ae: string) { return NAME2TEAM[norm(ae)] || ""; }
// Canonical display spelling: the production export sometimes drops punctuation
// (e.g. "DaShann Austin" vs the roster's "Da'Shann Austin") or uses a name
// variant (e.g. "Alfredo Sanchez" vs "Alfredo Sanchez II"). Resolving through
// nkey() to the roster spelling keeps such a rep from splitting into two rows.
function canon(ae: string) { return NAME2DISPLAY[nkey(ae)] || ae; }
function isFormer(ae: string) { return norm(ae) in FORMER_TEAM; }
function chanFor(ae: string): Channel | "" { const t = teamFor(ae); return t ? TEAM2CH[t] : ""; }
// An AE belongs on a given channel's board if their team is that channel.
// Former AEs are a wholesale-only concept (their wholesale funded loans still
// count toward the $100M goal).
// True once an AE's scheduled-removal date has arrived (America/Phoenix).
function retired(ae: string): boolean {
  const d = RETIRE[norm(ae)];
  if (!d) return false;
  const [y, m, day] = d.split("-").map(Number);
  const az = azNow();
  const ty = az.getFullYear(), tm = az.getMonth() + 1, td = az.getDate();
  if (ty !== y) return ty > y;
  if (tm !== m) return tm > m;
  return td >= day;
}
function counts(ae: string, channel: Channel) {
  if (retired(ae)) return false;
  if (chanFor(ae) === channel) return true;
  if (channel === "wholesale" && isFormer(ae)) return true;
  return false;
}

// Shared roster/name helpers for the reporting engine (lib/report.ts).
export const roster = { norm, nkey, canon, teamFor, chanFor, counts, retired, isFormer, isHouse, mdy, TEAMS };

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
  rows: [string, string, number, number, number, number, number, number, number, number, number, number][];
  today: Record<string, [number, number, number]>;
  mtd: Record<string, number>;
  tix: Record<string, number>;
  tixTotal: number;
  dashAEs: string[];
  exemptAEs: string[];
  callsPending: boolean;
  tixPending: boolean;
  kpi: {
    pipeline: number; pipeLocked: number; pipeUnlocked: number; lockedPct: number; pipeSoft: number; pipeStale: number; pipeStaleN: number;
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

  // Reporting month = the CURRENT calendar month in Arizona, always.
  //
  // This used to be derived from the latest Funded Date present in the file,
  // which held the prior month over until the first loan of the new month
  // funded. That broke on 8/1/2026: the header and the funding-day counter
  // (both computed client-side from today's date) had rolled to August while
  // the funded/subs figures were still July's, so the board read
  // "August 2026 — $119.15M funded" on a month with zero fundings. The board
  // now rolls to $0 at midnight on the 1st and fills in as loans fund, which
  // is the honest reading.
  const ly = todayY, lm = todayM;

  type Agg = { pipe: number; pipeUn: number; b30: number; b60: number; ctc: number; ctcU: number; fund: number; units: number; goalElig: number; total: number };
  const ae: Record<string, Agg> = {};
  const mtd: Record<string, number> = {};
  const today: Record<string, [number, number, number]> = {};
  const A = (n: string) => (ae[n] ||= { pipe: 0, pipeUn: 0, b30: 0, b60: 0, ctc: 0, ctcU: 0, fund: 0, units: 0, goalElig: 0, total: 0 });
  const HOUSE_AGG: Agg = { pipe: 0, pipeUn: 0, b30: 0, b60: 0, ctc: 0, ctcU: 0, fund: 0, units: 0, goalElig: 0, total: 0 };

  let pipeAll = 0, pipeLocked = 0, pipeSoft = 0, pipeStale = 0, pipeStaleN = 0, ctcAll = 0, ctcUnits = 0, fundAll = 0, fundUnits = 0, eligAll = 0;
  // Aging boundaries (rolling, Arizona). 30 days: soft-pipeline freshness
  // gate and the start of the idle bands; 60 days: the 30–59d / 60+d split.
  const softCut = new Date(az); softCut.setDate(softCut.getDate() - 30);
  const softCutKey = softCut.getFullYear() * 10000 + (softCut.getMonth() + 1) * 100 + softCut.getDate();
  const cut60 = new Date(az); cut60.setDate(cut60.getDate() - 60);
  const cut60Key = cut60.getFullYear() * 10000 + (cut60.getMonth() + 1) * 100 + cut60.getDate();

  for (const r of rd) {
    const name = canon((r["Lender Account Executive Name"] || "").trim());
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

    // Wholesale pipeline = hard statuses (core underwriting + doc-check +
    // Processing, any age), plus soft pipeline (Loan Open / Registered whose
    // status date is within the last 30 days). Hard loans idle 30+ days are
    // flagged stale but stay in the pipeline. Retail & correspondent keep
    // their simpler rule: core statuses + ungated Registered.
    const sd = mdy(r["Loan Status Date"]);
    const sdKey = sd ? sd.y * 10000 + sd.m * 100 + sd.d : 0;
    const hard = PIPE.has(st) || (channel === "wholesale" && HARD_EXTRA.has(st));
    const isStale = channel === "wholesale" && hard && sdKey > 0 && sdKey <= softCutKey; // 30+ days idle
    const soft = channel === "wholesale" && SOFT_PIPE.has(st) && sdKey >= softCutKey;
    const inPipe = hard
      || soft
      || (channel !== "wholesale" && st === "registered");
    // Per-AE pipeline is stricter than the team pipeline: the early-funnel and
    // pre-underwriting statuses (Loan Open, Registered, Processing) are held to
    // be too soft to credit against an individual AE, so their rows show only
    // files that have reached underwriting or doc check. The team tile keeps
    // counting them, so the AE column deliberately does NOT sum to the tile.
    const inPipeAE = inPipe && !AE_PIPE_EXCLUDE.has(st);

    if (wh) {
      // House reps accumulate into a throwaway bucket: the team-level counters
      // in these branches still fire, but nothing lands in `ae`, so no row.
      const a = isHouse(name) ? HOUSE_AGG : A(name);
      if (inPipe) {
        pipeAll += amt;
        if (locked) pipeLocked += amt;
        if (soft) pipeSoft += amt;
        if (isStale) { pipeStale += amt; pipeStaleN += 1; }
      }
      if (inPipeAE) {
        a.pipe += amt;
        if (!locked) a.pipeUn += amt;
        // Idle bands for hard-pipeline loans: 30–59 days / 60+ days since the
        // last status change.
        if (isStale) { if (sdKey <= cut60Key) a.b60 += amt; else a.b30 += amt; }
      }
      // A loan counted anywhere in the pipeline never also counts as CTC or
      // funded — gate on inPipe (the team rule), not the stricter AE rule, so
      // dropping a status from the AE column can't leak it into On Deck.
      if (!inPipe && CTC.has(st)) { a.ctc += amt; a.ctcU += 1; ctcAll += amt; ctcUnits += 1; }
      else if (!inPipe && FUND.has(st) && fd && fd.m === lm && fd.y === ly && chOk) {
        // Funded production for the reporting month (correspondent carved out above).
        a.fund += amt; a.units += 1; fundAll += amt; fundUnits += 1;
        a.goalElig += amt; eligAll += amt;
      }
      // Subs = loans OPENED in the reporting month (Opened Date). Correspondent
      // opens are excluded on non-correspondent boards, same as funded.
      if (od && od.m === lm && od.y === ly && chOk && !isHouse(name)) {
        mtd[name] = (mtd[name] || 0) + 1;
        if (od.m === todayM && od.d === todayD && od.y === todayY) {
          today[name] = today[name] || [0, 0, 0];
          today[name][2] += 1;
        }
      }
    }
  }

  // Seed every rostered AE on this channel so brand-new reps (e.g. a new team)
  // show on the board — with their calls, tickets, and subs — even before they
  // have any funded production. (Runs before the calls/tickets fill below.)
  for (const [, d] of Object.entries(TEAMS)) {
    if (d.channel === channel) for (const nm of d.aes) if (!retired(nm) && !isHouse(nm) && !GOAL_DASH.has(norm(nm))) A(nm);
  }

  // Call activity → outbound calls + talk minutes per board AE.
  if (callsCsv) {
    const parsed = Papa.parse<Record<string, string>>(callsCsv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const byNorm: Record<string, [number, number]> = {};
    for (const r of parsed.data) {
      const n = nkey(r["User"] || "");
      // Talk minutes = inbound + outbound (intra-PBX/internal excluded).
      byNorm[n] = [parseInt(r["Outbound Calls"] || "0", 10) || 0, toMin(r["Outbound Call Duration"]) + toMin(r["Inbound Call Duration"])];
    }
    for (const name of Object.keys(ae)) {
      const c = byNorm[nkey(name)];
      if (c) { today[name] = today[name] || [0, 0, 0]; today[name][0] = c[0]; today[name][1] = Math.round(c[1]); }
    }
  }

  // Tickets → count of tickets per board AE (one row per ticket). The tickets
  // file resets each day, so tallying every row in the newest file gives the
  // running same-day count (grows through the day, back to 0 the next day).
  const tix: Record<string, number> = {};
  let tixTotal = 0;
  if (ticketsCsv) {
    const parsed = Papa.parse<Record<string, string>>(ticketsCsv.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const byNorm: Record<string, number> = {};
    for (const r of parsed.data) {
      const u = nkey(r["User Name"] || "");
      if (u) byNorm[u] = (byNorm[u] || 0) + 1;
    }
    for (const name of Object.keys(ae)) {
      const c = byNorm[nkey(name)];
      if (c) tix[name] = c;
    }
    // Team-wide total: every ticket logged today by a rep on this channel
    // (excludes non-roster/system names like "Win Team").
    for (const nm in byNorm) {
      if (retired(nm) || isHouse(nm)) continue;
      const t = NAME2TEAM[nm];
      if ((t && TEAM2CH[t] === channel) || (channel === "wholesale" && nm in FORMER_TEAM)) tixTotal += byNorm[nm];
    }
  }

  // Board rows: every active rostered AE on this channel (seeded above) shows,
  // even with zero production. Former AEs appear only the month they funded.
  const rows: BoardData["rows"] = [];
  for (const [name, a] of Object.entries(ae)) {
    if (isFormer(name) && a.units === 0) continue;
    const teamName = isFormer(name) ? `${FORMER_TEAM[norm(name)]} · former` : teamFor(name);
    const avg = a.units ? a.fund / a.units : 0;
    const total = a.fund + a.ctc;
    rows.push([name, teamName, a.pipe, a.units, a.fund, Math.round(avg), a.ctc, total, a.ctcU, a.pipeUn, a.b30, a.b60]);
  }
  rows.sort((x, y) => y[7] - x[7]);

  const pipeUnlocked = pipeAll - pipeLocked;
  return {
    rows,
    today,
    mtd,
    tix,
    tixTotal,
    dashAEs: [...GOAL_DASH].map((k) => NAME2DISPLAY[k] || k),
    exemptAEs: [...GOAL_EXEMPT].map((k) => NAME2DISPLAY[k] || k),
    callsPending: !callsIsToday,
    tixPending: !(ticketsCsv && tixIsToday),
    kpi: {
      pipeline: pipeAll, pipeLocked, pipeUnlocked, lockedPct: pipeAll ? pipeLocked / pipeAll * 100 : 0, pipeSoft, pipeStale, pipeStaleN,
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
