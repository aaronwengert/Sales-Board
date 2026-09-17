// Daily-goal email.
//
// Rendered from the SAME BoardData the screens are built from, so the email and
// the board can never disagree: if the board says 16 of 32, this says 16 of 32.
// Nothing here re-reads Drive or recomputes a metric.
//
// This is email HTML, not web HTML. Outlook on Windows renders with Word's
// engine, so: tables for all layout, inline styles only, no flexbox, no grid,
// no border-radius worth relying on, and bar charts built from two table cells
// rather than a styled div.

import type { BoardData } from "./board";

const PAGE_W = 700;
const CALLS_GOAL = 75, TALK_GOAL = 90, SUB_GOAL = 1, TIX_GOAL = 3;

const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = "#17233d", MUT = "#6b7686", LINE = "#d9e0ea", GRN = "#127a3c", PAGE = "#ffffff";

type AE = {
  name: string; calls: number; talk: number; tix: number; subs: number;
  /** What to print. A pending feed shows a dash, exactly as the board does —
   *  printing a real 10 next to a column that cannot score reads as a bad day. */
  callsTxt: string; talkTxt: string; tixTxt: string;
  cH: boolean; tH: boolean; xH: boolean; sH: boolean; met: boolean; all4: boolean;
  gap: string | null;
  /** Live numbers, outside the goal fraction — the board's GOAL_EXEMPT rule.
   *  The row prints normally and carries no status, because a check would claim
   *  a hit the denominator never counted. */
  exempt: boolean;
};
type Team = { team: string; aes: AE[]; sidelined: { name: string; why: string }[]; manager: string | null; hit: number; n: number; pct: number };

/** Team rollups, using exactly the board's inclusion rules. */
export function digestTeams(b: BoardData): { teams: Team[]; hit: number; total: number; pct: number } {
  const dash = new Set(b.dashAEs), exempt = new Set(b.exemptAEs), ooo = new Set(b.oooAEs);
  const byTeam = new Map<string, Team>();
  const teamOf = (raw: string) => (raw || "").replace(/\s*·.*$/, "").trim() || "Unassigned";

  for (const r of b.rows) {
    const name = r[0], team = teamOf(r[1]);
    if (!byTeam.has(team)) byTeam.set(team, { team, aes: [], sidelined: [], manager: null, hit: 0, n: 0, pct: 0 });
    const g = byTeam.get(team)!;
    if (ooo.has(name)) { g.sidelined.push({ name, why: "Out of office" }); continue; }
    if (dash.has(name)) {
      const role = b.roles?.[name];
      // A sales manager is named once in the card header, by the roster map
      // below, and never as a dashed row among the people he manages.
      if (role === "Sales Manager") continue;
      g.sidelined.push({ name, why: role || "Not scored" });
      continue;
    }
    const isExempt = exempt.has(name);

    const td = b.today[name] || [0, 0, 0];
    const calls = td[0], talk = Math.round(td[1]), subs = td[2], tix = b.tix[name] || 0;
    // Pending feeds cannot score, exactly as on the board.
    const cH = !b.callsPending && calls >= CALLS_GOAL;
    const tH = !b.callsPending && talk >= TALK_GOAL;
    const xH = !b.tixPending && tix >= TIX_GOAL;
    const sH = subs >= SUB_GOAL;
    const met = cH || tH || xH || sH, all4 = cH && tH && xH && sH;

    // Which line is this AE closest to? Submissions are deliberately excluded:
    // everyone short is "1 sub away", which is true of all of them and tells
    // nobody anything. A metric whose feed has not landed cannot be suggested.
    let gap: string | null = null;
    if (!met) {
      const opts: { p: number; txt: string }[] = [];
      if (!b.callsPending) {
        opts.push({ p: calls / CALLS_GOAL, txt: `${CALLS_GOAL - calls} calls` });
        opts.push({ p: talk / TALK_GOAL, txt: `${TALK_GOAL - talk} min` });
      }
      if (!b.tixPending) {
        const need = TIX_GOAL - tix;
        opts.push({ p: tix / TIX_GOAL, txt: `${need} tix` });
      }
      opts.sort((x, y) => y.p - x.p);
      gap = opts.length ? opts[0].txt : null;
    }
    const DASH_TXT = "&ndash;";
    g.aes.push({
      name, calls, talk, tix, subs,
      callsTxt: b.callsPending ? DASH_TXT : String(calls),
      talkTxt: b.callsPending ? DASH_TXT : String(talk),
      tixTxt: b.tixPending ? DASH_TXT : String(tix),
      cH, tH, xH, sH, met, all4, gap, exempt: isExempt,
    });
  }

  const teams = [...byTeam.values()];
  for (const g of teams) g.manager = b.teamManagers?.[g.team] || null;
  for (const g of teams) {
    // Hitters first inside a team, so a card reads as "who is in" then "who is working".
    g.aes.sort((a, c) => Number(c.met) - Number(a.met) || a.name.localeCompare(c.name));
    g.sidelined.sort((a, c) => a.name.localeCompare(c.name));
    const scored = g.aes.filter((a) => !a.exempt);
    g.n = scored.length;
    g.hit = scored.filter((a) => a.met).length;
    g.pct = g.n ? Math.round(g.hit / g.n * 100) : 0;
  }
  teams.sort((a, c) => c.pct - a.pct || c.n - a.n || a.team.localeCompare(c.team));

  const hit = teams.reduce((a, g) => a + g.hit, 0);
  const total = teams.reduce((a, g) => a + g.n, 0);
  return { teams, hit, total, pct: total ? Math.round(hit / total * 100) : 0 };
}

/** Best of the day in each of the four categories.
 *
 *  Only AEs who are actually being scored can lead — a sales manager or someone
 *  out of office is excluded here for the same reason they are excluded from
 *  the denominator. A category whose feed has not landed reports that rather
 *  than crowning whoever happens to sit at zero, and a category nobody has put
 *  a number on says so plainly, which at 6pm is itself the message.
 *
 *  Ties are kept whole. Three people on three tickets are three leaders, and
 *  quietly picking one alphabetically would be a small lie told daily.
 */
export type Leader = {
  key: "calls" | "talk" | "tix" | "subs";
  label: string; value: string; names: string[]; teams: string[]; pending: boolean; empty: boolean;
};

/** A stable colour per team, so an initials badge is always the same colour for
 *  the same person. Derived from the name rather than configured, so a new team
 *  needs no code change. */
const TEAM_INK = ["#2f6f43", "#2a5bbf", "#6b4fbb", "#a8443c", "#1f6f8b", "#0f7d8c", "#8a3d6b"];
export function teamColor(team: string): string {
  let h = 0;
  for (let i = 0; i < team.length; i++) h = (h * 31 + team.charCodeAt(i)) >>> 0;
  return TEAM_INK[h % TEAM_INK.length];
}
function initials(name: string): string {
  const w = name.split(/\s+/).filter((x) => /^[A-Za-z]/.test(x));
  return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase();
}

export function digestLeaders(b: BoardData, teams: Team[]): Leader[] {
  const pool = teams.flatMap((g) => g.aes);
  const teamOfAE = new Map<string, string>();
  for (const g of teams) for (const a of g.aes) teamOfAE.set(a.name, g.team);
  const spec = [
    { key: "calls" as const, label: "MOST CALLS", get: (a: AE) => a.calls, fmt: (v: number) => String(v), pending: b.callsPending },
    { key: "talk" as const, label: "MOST TALK TIME", get: (a: AE) => a.talk, fmt: (v: number) => v + " min", pending: b.callsPending },
    { key: "tix" as const, label: "MOST TICKETS", get: (a: AE) => a.tix, fmt: (v: number) => String(v), pending: b.tixPending },
    { key: "subs" as const, label: "MOST SUBMISSIONS", get: (a: AE) => a.subs, fmt: (v: number) => String(v), pending: false },
  ];
  return spec.map(({ key, label, get, fmt, pending }) => {
    if (pending) return { key, label, value: "\u2014", names: [], teams: [], pending: true, empty: false };
    const top = pool.reduce((m, a) => Math.max(m, get(a)), 0);
    if (top <= 0) return { key, label, value: "\u2014", names: [], teams: [], pending: false, empty: true };
    const names = pool.filter((a) => get(a) === top).map((a) => a.name).sort((x, y) => x.localeCompare(y));
    const tms = [...new Set(names.map((n) => teamOfAE.get(n) || ""))].filter(Boolean);
    return { key, label, value: fmt(top), names, teams: tms, pending: false, empty: false };
  });
}

const GOLD = "#9a7a10", GOLD_BG = "#fdf6dd", GOLD_LINE = "#e8d38f";
export const BANDS: Record<string, { bg: string; line: string; ink: string }> = {
  mint:  { bg: "#e3f0e7", line: "#c6e0d0", ink: "#5b6674" },
  sage:  { bg: "#dbe8de", line: "#b9d2c1", ink: "#44584c" },
  slate: { bg: "#e7edf4", line: "#ccd8e6", ink: "#54606f" },
  sand:  { bg: "#f2ede1", line: "#ded2ba", ink: "#645b48" },
  stone: { bg: "#eceff2", line: "#d3dae1", ink: "#5b6674" },
  deep:  { bg: "#cfe2d6", line: "#a8c7b4", ink: "#2f4a3a" },
};

/** The leaders band. Gold is deliberate: on the board gold already means
 *  "did something exceptional", so it carries the same meaning here. */
export function leadersBlock(ls: Leader[], style: "row" | "grid" | "metric"): string {
  const METRIC_COLOR: Record<string, string> = { calls: "#6b4fbb", talk: "#2a5bbf", tix: "#c08a1a", subs: "#1a9e4e" };
  const nameLine = (l: Leader, size: number) => {
    if (l.pending) return `<span style="font-family:${F};font-size:${size}px;font-weight:400;line-height:1.35;color:#b6bfcb">awaiting report</span>`;
    if (l.empty) return `<span style="font-family:${F};font-size:${size}px;font-weight:400;line-height:1.35;color:#b6bfcb">none yet</span>`;
    const shown = l.names.length <= 2 ? l.names.join(", ") : `${l.names[0]} +${l.names.length - 1} more`;
    const tie = l.names.length > 1 ? `<br><span style="font-family:${F};font-size:${size - 1.5}px;font-weight:600;line-height:1.4;color:#a99456">${l.names.length}-way tie</span>` : "";
    return `<span style="font-family:${F};font-size:${size}px;font-weight:600;line-height:1.35;color:${INK}">${esc(shown)}</span>${tie}`;
  };

  if (style === "grid") {
    const cell = (l: Leader) => {
      const dim = l.pending || l.empty;
      return `<td width="50%" valign="top" style="padding:0 5px 10px">`
        + tbl(`width="100%" bgcolor="${dim ? "#ffffff" : GOLD_BG}" style="background:${dim ? "#ffffff" : GOLD_BG};border:1px solid ${dim ? LINE : GOLD_LINE}"`,
          `<tr><td style="padding:11px 13px 12px">`
          + `<div style="font-family:${F};font-size:9.5px;font-weight:700;line-height:1.2;color:${dim ? "#98a2b1" : GOLD};letter-spacing:.9px">${dim ? "" : "\u2605 "}${l.label}</div>`
          + `<div style="font-family:${F};font-size:26px;font-weight:800;line-height:1.15;color:${dim ? "#c3cbd6" : "#7a5f0c"};letter-spacing:-.5px;padding:5px 0 3px">${l.value}</div>`
          + `<div>${nameLine(l, 13)}</div></td></tr>`)
        + `</td>`;
    };
    return `<tr><td style="padding:0 0 6px">`
      + tbl(`width="100%" style="margin:0 -5px"`,
        `<tr>${cell(ls[0])}${cell(ls[1])}</tr><tr>${cell(ls[2])}${cell(ls[3])}</tr>`)
      + `</td></tr>`;
  }

  /** Every Today's Best tile is this tall, whatever is inside it. */
const TILE_H = 86;

  const gold = style === "row";
  const cell = (l: Leader) => {
    const dim = l.pending || l.empty;
    const ac = gold ? GOLD : METRIC_COLOR[l.key];
    const bg = dim ? "#ffffff" : gold ? GOLD_BG : "#ffffff";
    const bd = dim ? LINE : gold ? GOLD_LINE : "#e3e8f0";
    // A face only when one person owns the number. On a tie there is no single
    // winner to show, and picking one of them to photograph is the same small
    // lie as picking one of them to name.
    // Every card reserves the same slot so the four stay level, and the slot
    // The initials badge went: it spent a third of each card's height saying
    // what the name directly beneath it already said.
    const face = "";
    const who = l.pending ? '<span style="color:#b6bfcb;font-weight:400">awaiting</span>'
      : l.empty ? '<span style="color:#b6bfcb;font-weight:400">none yet</span>'
      : esc(l.names.length === 1 ? l.names[0] : l.names[0] + " +" + (l.names.length - 1));
    const caption = !dim && l.names.length > 1
      ? `TIED &middot; ${l.names.length} WAY`
      : !dim && l.teams[0] ? esc(l.teams[0]).toUpperCase() : "&nbsp;";
    const tie = `<div style="font-family:${F};font-size:8.5px;font-weight:600;line-height:1.3;color:#a99456;padding-top:3px;letter-spacing:.4px">${caption}</div>`;
    return `<td width="25%" valign="top" style="padding:0 4px">`
      + tbl(`width="100%" bgcolor="${bg}" style="background:${bg};border:1px solid ${bd};border-top:3px solid ${dim ? "#dbe2ea" : ac}"`,
        `<tr><td align="center" height="${TILE_H}" valign="top" style="height:${TILE_H}px;padding:10px 6px 11px">`
        + face
        + `<div style="font-family:${F};font-size:8.5px;font-weight:700;line-height:1.2;color:${dim ? "#98a2b1" : ac};letter-spacing:.7px">${!dim && gold ? "\u2605 " : ""}${l.label}</div>`
        + `<div style="font-family:${F};font-size:23px;font-weight:800;line-height:1.15;color:${dim ? "#c3cbd6" : gold ? "#7a5f0c" : ac};letter-spacing:-.5px;padding:5px 0 3px">${l.value}</div>`
        + `<div style="font-family:${F};font-size:11px;font-weight:600;line-height:1.3;color:${INK}">${who}</div>${tie}</td></tr>`)
      + `</td>`;
  };
  return `<tr><td style="padding:0 0 6px">`
    + tbl(`width="100%" style="margin:0 -4px"`, `<tr>${cell(ls[0])}${cell(ls[1])}${cell(ls[2])}${cell(ls[3])}</tr>`)
    + `</td></tr>`;
}

/** 1345 -> 1,345. Four-figure call counts are unreadable without it. */
const n = (v: number | string) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tbl = (attrs: string, inner: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;
const tone = (p: number) => (p >= 75 ? GRN : p >= 40 ? "#c08a1a" : "#a8443c");

/** A bar drawn from two table cells — the only kind Outlook renders reliably. */
function bar(pct: number, color: string, w: number, h: number) {
  const fill = Math.max(2, Math.min(100, Math.round(pct)));
  return tbl(`width="${w}" style="width:${w}px;border-collapse:collapse"`,
    `<tr><td height="${h}" bgcolor="${color}" style="height:${h}px;width:${fill}%;font-size:0;line-height:0">&nbsp;</td>`
    + `<td height="${h}" bgcolor="#dce3ec" style="height:${h}px;font-size:0;line-height:0">&nbsp;</td></tr>`);
}

const W = { calls: 33, talk: 33, tix: 26, subs: 28, stat: 60 };
const headCell = (txt: string, w: number) =>
  `<td width="${w}" align="right" style="font-family:${F};font-size:9.5px;font-weight:700;line-height:1.2;color:#98a2b1;letter-spacing:.6px;padding:0 0 6px 5px">${txt}</td>`;
const headerRow = () =>
  `<tr><td style="padding:0 0 6px">&nbsp;</td>`
  + headCell("CALLS", W.calls) + headCell("TALK", W.talk) + headCell("TIX", W.tix) + headCell("SUBS", W.subs)
  + headCell("STATUS", W.stat) + `</tr>`;

/** The board's own language for a hit, carried across verbatim: the metric that
 *  scored wears the green pill, and the status column is the round check in its
 *  halo rather than the word HIT. Word's engine drops border-radius and draws
 *  both square, which still reads correctly. */
const HIT_INK = "#127a3c", HIT_BG = "#e4f5ea", HIT_RING = "#9bdcb4", HIT_DEEP = "#0b5c2c";

function chip(mark: string, bg: string, ring: string, ink: string) {
  return tbl(`width="22" style="width:22px;margin:0 0 0 auto"`,
    `<tr><td width="22" height="22" align="center" valign="middle" bgcolor="${bg}"`
    + ` style="width:22px;height:22px;background:${bg};border:1px solid ${ring};border-radius:11px;`
    + `font-family:${F};font-size:12px;font-weight:700;line-height:1;color:${ink}">${mark}</td></tr>`);
}

function aeRow(a: AE) {
  const num = (val: string, on: boolean, w: number) =>
    `<td width="${w}" align="right" style="padding:7px 0 7px 5px;border-bottom:1px solid #f4f6fa">`
    + (on
      ? `<span style="font-family:${F};font-size:13px;font-weight:800;line-height:1.3;color:${HIT_INK}">${val}</span>`
      : `<span style="font-family:${F};font-size:12.5px;font-weight:400;line-height:1.3;color:#9aa4b2">${val}</span>`)
    + `</td>`;
  const stat = a.all4
    ? chip("&#9733;", "#f2c33d", "#d0a021", "#5c4405")
    : a.met
      ? chip("&#10003;", HIT_BG, HIT_RING, HIT_DEEP)
      : a.gap
        ? `<span style="font-family:${F};font-size:9.5px;font-weight:700;line-height:1;color:#8a4b12;background:#fbeed6;border-radius:9px;padding:3px 8px;white-space:nowrap">${a.gap}</span>`
        : `<span style="font-family:${F};font-size:11px;font-weight:600;line-height:1;color:#98a2b1">awaiting data</span>`;
  return `<tr><td style="font-family:${F};font-size:12.5px;font-weight:${a.met ? 700 : 400};line-height:1.3;color:${a.met ? INK : "#7b8698"};padding:7px 0;border-bottom:1px solid #f4f6fa">${esc(a.name)}</td>`
    + num(a.callsTxt, a.cH, W.calls) + num(a.talkTxt, a.tH, W.talk) + num(a.tixTxt, a.xH, W.tix) + num(String(a.subs), a.sH, W.subs)
    + `<td width="${W.stat}" align="right" style="padding:7px 0;border-bottom:1px solid #f4f6fa">${stat}</td></tr>`;
}
/** What the team actually did today, across every row printed above it. Talk is
 *  minutes, so it sums; the others are counts. Sidelined rows contribute
 *  nothing because they have nothing to contribute. */
function totalRow(aes: AE[], band: { bg: string; line: string; ink: string }) {
  const sum = (f: (a: AE) => number) => aes.reduce((t, a) => t + f(a), 0);
  const cell = (v: number | string, w: number) =>
    `<td width="${w}" align="right" style="padding:8px 0 8px 5px;background:${band.bg};border-top:1px solid ${band.line}">`
    + `<span style="font-family:${F};font-size:13px;font-weight:800;line-height:1.3;color:${INK}">${v}</span></td>`;
  return `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${band.ink};letter-spacing:.7px;`
    + `padding:8px 0 8px 6px;background:${band.bg};border-top:1px solid ${band.line}">TEAM</td>`
    + cell(n(sum((a) => a.calls)), W.calls) + cell(n(sum((a) => a.talk)), W.talk)
    + cell(n(sum((a) => a.tix)), W.tix) + cell(n(sum((a) => a.subs)), W.subs)
    + `<td width="${W.stat}" style="background:${band.bg};border-top:1px solid ${band.line}">&nbsp;</td></tr>`;
}

const sideRow = (s: { name: string; why: string }) =>
  `<tr><td style="font-family:${F};font-size:12.5px;font-weight:400;line-height:1.3;color:#b6bfcb;padding:7px 0;border-bottom:1px solid #f4f6fa">${esc(s.name)}</td>`
  + `<td colspan="5" align="right" style="font-family:${F};font-size:10px;font-weight:600;line-height:1.3;color:#b6bfcb;letter-spacing:.7px;padding:7px 0;border-bottom:1px solid #f4f6fa">${esc(s.why).toUpperCase()}</td></tr>`;

/** Daily stage targets for the dial row, team-wide. Calibrated against a full
 *  day's export (Tue 9/15: 18 subs, 13 into doc check, 12 into underwriting). */
export const DIAL_GOALS = { subs: 30, docCheck: 30, uw: 30, tix: 60 };

/** The four dials.
 *
 *  A true donut arc cannot be drawn in email HTML: Gmail strips <svg>, Outlook
 *  renders with Word's engine (no conic-gradient, no reliable border-radius),
 *  and VML is not worth the fragility. So each dial is drawn once as a raster
 *  image and referenced here. The sender rasterises dialSpecs() and passes the
 *  sources in — "cid:" for real sends, since inline attachments display even
 *  when a client blocks remote images, "data:" for a browser preview.
 *
 *  With no sources supplied — or with images switched off in the client — the
 *  cell falls back to a bordered ring whose colour carries the same reading,
 *  so nothing here is load-bearing on the image arriving.
 */
export type DialSpec = {
  key: "subs" | "doc" | "uw" | "tix";
  label: string; value: number; goal: number; pct: number; pending: boolean;
  /** What the raster should print inside the ring, under the number. */
  unit: string;
  /** Arc colour and the lighter tint of the same hue it runs over. */
  color: string; track: string;
};

/** Arc over track, keyed off how far along the day is. Each track is the same
 *  hue as its arc, lightened — the reference look: one colour, two weights. */
function dialTone(pct: number, pending: boolean): { color: string; track: string } {
  if (pending) return { color: "#b6bfcb", track: "#eef1f5" };
  if (pct >= 100) return { color: "#1a7f3c", track: "#dcefe2" };
  if (pct >= 60) return { color: "#2f9558", track: "#e0efe6" };
  if (pct >= 30) return { color: "#b5651d", track: "#f6e6d6" };
  return { color: "#a8202a", track: "#f3dcdd" };
}

/** The shape of every dial, in one place, so the renderer that draws the image
 *  and the HTML that places it can never drift apart. */
export function dialSpecs(b: BoardData): DialSpec[] {
  const raw: { key: DialSpec["key"]; label: string; value: number; goal: number; pending: boolean }[] = [
    { key: "subs", label: "SUBS", value: b.kpi.subsToday ?? 0, goal: DIAL_GOALS.subs, pending: false },
    { key: "doc", label: "DOC CHECK", value: b.kpi.docCheckToday ?? 0, goal: DIAL_GOALS.docCheck, pending: false },
    { key: "uw", label: "UW", value: b.kpi.uwToday ?? 0, goal: DIAL_GOALS.uw, pending: false },
    { key: "tix", label: "TIX", value: b.tixTotal ?? 0, goal: DIAL_GOALS.tix, pending: !!b.tixPending },
  ];
  return raw.map((r) => {
    const pct = r.pending || !r.goal ? 0 : Math.min(100, Math.round(r.value / r.goal * 100));
    return { ...r, pct, unit: r.pending ? "awaiting" : "of " + r.goal, ...dialTone(pct, r.pending) };
  });
}

const DIAL_PX = 112;

function dialsBlock(b: BoardData, src?: Partial<Record<DialSpec["key"], string>>): string {
  const cells = dialSpecs(b).map((d) => {
    const url = src?.[d.key];
    const art = url
      ? `<img src="${url}" width="${DIAL_PX}" height="${DIAL_PX}" alt="${esc(d.label)} ${d.pending ? "awaiting" : d.value + " of " + d.goal}"`
        + ` style="display:block;width:${DIAL_PX}px;height:${DIAL_PX}px;border:0;outline:none;text-decoration:none;margin:0 auto" border="0">`
      // Fallback when no source is supplied, or the client blocks the image:
      // a plain ring at the same footprint. Word's engine drops the radius and
      // draws a square, which still carries the number and the colour.
      : `<div style="width:${DIAL_PX - 14}px;height:${DIAL_PX - 14}px;margin:0 auto;background:${d.track};`
        + `border:7px solid ${d.color};border-radius:${DIAL_PX}px;text-align:center">`
        + `<div style="font-family:${F};font-size:31px;font-weight:800;line-height:1;color:${d.pending ? "#b6bfcb" : d.color};letter-spacing:-1px;padding-top:${(DIAL_PX - 14 - 45) / 2}px">`
        + (d.pending ? "&ndash;" : d.value) + `</div>`
        + `<div style="font-family:${F};font-size:10px;font-weight:600;line-height:1.4;color:#8a94a4">${d.unit}</div></div>`;
    return `<td width="25%" align="center" valign="top" style="padding:0 4px">`
      + art
      + `<div style="height:10px;line-height:10px;font-size:0">&nbsp;</div>`
      + `<div style="font-family:${F};font-size:10px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:.9px">${d.label}</div>`
      + `</td>`;
  }).join("");
  return `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:18px 12px 18px">`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px;padding:0 8px 14px">TODAY&rsquo;S PRODUCTIVITY</td></tr>`)
    + tbl(`width="100%"`, `<tr>${cells}</tr>`)
    + `</td></tr>`;
}

/** Anyone who took all four categories in one day. Same gold-and-star language
 *  the boards use for a clean sweep, run full width as the first thing under
 *  TODAY'S BEST — a sweep outranks leading any single column. */
const SWEEP_SEP = '<span style="color:#d9c66a">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>';
function sweepBanner(teams: Team[]): string {
  const swept = teams.flatMap((g) => g.aes.filter((a) => a.all4).map((a) => ({ n: a.name, t: g.team })));
  if (!swept.length) return "";
  const names = swept.map((x) =>
    `<span style="font-family:${F};font-size:15px;font-weight:700;line-height:1.5;color:#5c4405">&#9733; ${esc(x.n)}</span>`
    + `<span style="font-family:${F};font-size:11px;font-weight:600;line-height:1.5;color:#8a7420">&nbsp;${esc(x.t)}</span>`).join(SWEEP_SEP);
  return `<tr><td style="padding:0 0 10px">`
    + tbl(`width="100%" bgcolor="${GOLD_BG}" style="background:${GOLD_BG};border:1px solid ${GOLD_LINE};border-left:5px solid #e0ab24"`,
      `<tr><td style="padding:12px 16px">`
      + `<div style="font-family:${F};font-size:9.5px;font-weight:700;line-height:1.2;color:${GOLD};letter-spacing:1.1px;padding-bottom:5px">ALL FOUR CATEGORIES</div>`
      + `<div>${names}</div></td></tr>`)
    + `</td></tr>`;
}

export type Digest = { subject: string; preheader: string; html: string };

export function renderDigest(
  b: BoardData,
  opts: {
    sendLabel: string; dateLabel: string; boardUrl?: string;
    leaderStyle?: "row" | "grid" | "metric" | "off";
    /** Absolute https URLs. Email clients will not load a relative path, and
     *  many block remote images entirely — so every photo here is decoration
     *  the layout does not depend on. With images off the email still reads. */
    photos?: { teams?: Record<string, string>; logos?: Record<string, string> };
    /** Where the team logo sits in the BY TEAM standings. "as-rank" trades the
     *  rank number for the mark; "after-rank" keeps both. */
    logoStyle?: "after-rank" | "as-rank" | "badge" | "off";
    /** "thumb" tucks the team photo beside the name; "banner" runs it across the
     *  top of the card. A group shot needs width to be legible, which is the
     *  whole argument between the two. */
    teamPhotoStyle?: "thumb" | "banner";
    /** One source per dial. "cid:..." for a real send (inline attachments show
     *  even when remote images are blocked), "data:..." for a preview, or an
     *  absolute https URL. Omitted keys fall back to the drawn ring. */
    dialSrc?: Partial<Record<DialSpec["key"], string>>;
    /** Which shade the team header and totals band wear. See BANDS. */
    band?: keyof typeof BANDS;
  },
): Digest {
  const { teams, hit, total, pct } = digestTeams(b);
  const leaderStyle = opts.leaderStyle || "row";
  const leaders = digestLeaders(b, teams);
  const leader = teams[0];
  const url = opts.boardUrl || "#";
  const band = BANDS[opts.band || "stone"];
  const everyone = teams.flatMap((g) => g.aes);
  const allAEs = [
    { label: "CALLS", value: everyone.reduce((t, a) => t + a.calls, 0) },
    { label: "TALK MIN", value: everyone.reduce((t, a) => t + a.talk, 0) },
    { label: "TICKETS", value: everyone.reduce((t, a) => t + a.tix, 0) },
    { label: "SUBS", value: everyone.reduce((t, a) => t + a.subs, 0) },
  ];

  const logos = opts.photos?.logos || {};
  const logoStyle = opts.logoStyle || (Object.keys(logos).length ? "after-rank" : "off");
  let lb = "";
  teams.forEach((g, i) => {
    const c = tone(g.pct);
    const src = logos[g.team];
    // The mark sits in a fixed-width cell in every variant, so a logo that fails
    // to load leaves a gap rather than dragging the team name out of alignment.
    const mark = (size: number) => src
      ? `<img src="${esc(src)}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px" />`
      : "&nbsp;";
    const lead = i === 0 && logoStyle === "badge";
    let cells = "";
    if (logoStyle === "as-rank") {
      cells = `<td width="38" style="padding:7px 0">${mark(28)}</td>`;
    } else if (logoStyle === "badge") {
      cells = `<td width="22" style="font-family:${F};font-size:12px;font-weight:400;line-height:1.3;color:#b6bfcb;padding:8px 0">${i + 1}</td>`
        + `<td width="46" style="padding:6px 0">`
        + tbl(`width="36" style="width:36px"`,
          `<tr><td height="36" align="center" valign="middle" bgcolor="${lead ? GOLD_BG : "#f5f7fa"}"`
          + ` style="height:36px;width:36px;background:${lead ? GOLD_BG : "#f5f7fa"};border:1px solid ${lead ? GOLD_LINE : "#e8edf3"};border-radius:18px">`
          + (src ? `<img src="${esc(src)}" width="24" height="24" alt="" style="display:block;margin:0 auto;width:24px;height:24px" />` : "&nbsp;")
          + `</td></tr>`)
        + `</td>`;
    } else if (logoStyle === "after-rank") {
      cells = `<td width="22" style="font-family:${F};font-size:12px;font-weight:400;line-height:1.3;color:#b6bfcb;padding:8px 0">${i + 1}</td>`
        + `<td width="36" style="padding:7px 0">${mark(26)}</td>`;
    } else {
      cells = `<td width="22" style="font-family:${F};font-size:12px;font-weight:400;line-height:1.3;color:#b6bfcb;padding:8px 0">${i + 1}</td>`;
    }
    const span = logoStyle === "off" ? 4 : 5;
    lb += `<tr>` + cells
      + `<td style="padding:8px 0 8px 8px">`
      + `<span style="font-family:${F};font-size:13.5px;font-weight:700;line-height:1.3;color:${INK}">${esc(g.team)}</span>`
      + (g.manager ? `<span style="font-family:${F};font-size:11px;font-weight:400;line-height:1.3;color:#8792a1">&nbsp;&nbsp;${esc(g.manager)}</span>` : "")
      + `</td>`
      + `<td width="140" style="padding:8px 12px 8px 0">${bar(g.pct, c, 140, 7)}</td>`
      + `<td width="54" align="right" style="font-family:${F};font-size:13.5px;font-weight:700;line-height:1.3;color:${c};padding:8px 0">${g.pct}%</td>`
      + `<td width="48" align="right" style="font-family:${F};font-size:12.5px;font-weight:400;line-height:1.3;color:${MUT};padding:8px 0">${g.hit}/${g.n}</td></tr>`;
    if (i < teams.length - 1) lb += `<tr><td colspan="${span + 1}" style="border-bottom:1px solid #f0f3f8;font-size:0;line-height:0">&nbsp;</td></tr>`;
  });

  // Team cards run two across. At 700px each card gets ~344px, which is why the
  // metric columns below are so much narrower than the single-column version
  // was — every width in W was measured against a clipped-name check, not
  // guessed. An odd team count leaves the last row half empty rather than
  // stretching one card to full width, which would read as a ranking.
  const teamPhotos = opts.photos?.teams || {};
  const teamCard = (g: Team) => {
    const c = tone(g.pct);
    const rows = headerRow() + g.aes.map(aeRow).join("") + g.sidelined.map(sideRow).join("") + totalRow(g.aes, band);
    const tp = teamPhotos[g.team];
    const pstyle = opts.teamPhotoStyle || "thumb";
    const clean = g.n > 0 && g.hit === g.n;
    const lg = (opts.photos?.logos || {})[g.team];
    const logoCell = lg
      ? `<td width="34" valign="middle" style="width:34px"><img src="${esc(lg)}" width="26" height="26" alt="" style="display:block;width:26px;height:26px" /></td>`
      : "";
    const shot = tp && pstyle === "thumb"
      ? `<td width="62" valign="middle" style="width:62px"><img src="${esc(tp)}" width="54" height="32" alt="" style="display:block;width:54px;height:32px" /></td>`
      : "";
    const bnr = tp && pstyle === "banner"
      ? `<tr><td style="font-size:0;line-height:0"><img src="${esc(tp)}" width="342" height="86" alt="" style="display:block;width:100%;max-width:342px;height:auto" /></td></tr>`
      : "";
    return tbl(`width="100%" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE}"`,
      bnr
      + `<tr><td bgcolor="${band.bg}" style="background:${band.bg};padding:10px 12px 9px;border-bottom:2px solid ${c}">`
      + tbl(`width="100%"`,
        `<tr>${shot}${logoCell}<td valign="middle" style="padding-left:${shot || logoCell ? 4 : 0}px">`
        + `<div style="font-family:${F};font-size:14px;font-weight:800;line-height:1.2;color:${INK};letter-spacing:-.2px">${esc(g.team)}`
        + (clean ? ` <span style="font-family:${F};font-size:9.5px;font-weight:700;line-height:1;color:#0b5c2c;background:#d6f0e0;padding:2px 6px;letter-spacing:.4px">&#10003; ALL IN</span>` : "")
        + `</div>`
        + (g.manager ? `<div style="font-family:${F};font-size:10.5px;font-weight:600;line-height:1.4;color:#6f7d8c;padding-top:1px">${esc(g.manager)}</div>` : "")
        + `</td>`
        + `<td align="right" valign="middle" width="46" style="font-family:${F};font-size:15px;font-weight:800;line-height:1.2;color:${clean ? GRN : c};white-space:nowrap">${g.hit}/${g.n}</td></tr>`)
      + `</td></tr><tr><td style="padding:8px 12px 10px">${tbl(`width="100%"`, rows)}</td></tr>`);
  };

  // Two continuous columns rather than paired rows. Rows-of-two left a hole
  // under every short card — Bone Crushers' four people sitting beside Lien
  // Kings' eleven. Stacking each column independently means the only ragged
  // edge is the very bottom, and the cards are distributed by member count so
  // even that stays small. Reading runs down the left column then the right,
  // which the BY TEAM standings above have already ranked.
  const cost = (g: Team) => g.aes.length + g.sidelined.length + 2;
  const colA: Team[] = [], colB: Team[] = [];
  let hA = 0, hB = 0;
  for (const g of teams) {
    if (hA <= hB) { colA.push(g); hA += cost(g); } else { colB.push(g); hB += cost(g); }
  }
  const stack = (col: Team[]) =>
    col.map((g) => `<tr><td style="padding:0 0 10px">${teamCard(g)}</td></tr>`).join("");
  const cards = `<tr>`
    + `<td width="50%" valign="top" style="padding:0 5px 0 0">${tbl(`width="100%"`, stack(colA))}</td>`
    + `<td width="50%" valign="top" style="padding:0 0 0 5px">${tbl(`width="100%"`, stack(colB))}</td>`
    + `</tr>`;

  // A pending feed is stated, not hidden — a quiet zero looks like a bad day.
  const pending: string[] = [];
  if (b.callsPending) pending.push("call report");
  if (b.tixPending) pending.push("ticket report");
  const banner = pending.length
    ? `<tr><td bgcolor="#fbeed6" style="background:#fbeed6;border-left:1px solid #ecd8ae;border-right:1px solid #ecd8ae;padding:11px 20px;font-family:${F};font-size:12px;font-weight:600;line-height:1.5;color:#7a5410">`
      + `Today&rsquo;s ${pending.join(" and ")} ${pending.length > 1 ? "have" : "has"} not landed yet &mdash; those columns cannot score until ${pending.length > 1 ? "they arrive" : "it arrives"}.`
      + `</td></tr>`
    : "";

  const inner =
    `<tr><td bgcolor="#1f5133" style="background:#1f5133;padding:15px 20px">`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:15px;font-weight:700;line-height:1.2;color:#ffffff">Oaktree Funding&nbsp;&nbsp;<span style="font-weight:400;color:#bcd6c6">${esc((b.title || "Sales Production").replace(/ Sales Production$/, ""))}</span></td>`
      + `<td align="right" style="font-family:${F};font-size:12px;font-weight:600;line-height:1.2;color:#bcd6c6">${esc(opts.dateLabel)} &middot; ${esc(opts.sendLabel)}</td></tr>`)
    + `</td></tr>`
    + banner
    + dialsBlock(b, opts.dialSrc)
    + `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:22px 20px 18px">`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:46px;font-weight:800;line-height:1;color:${INK};letter-spacing:-1.5px;white-space:nowrap">${hit}<span style="font-size:26px;font-weight:600;color:${MUT}"> of ${total}</span></td>`
      + `<td align="right" style="font-family:${F};font-size:30px;font-weight:800;line-height:1;color:${GRN}">${pct}%</td></tr>`)
    + `<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>`
    + bar(pct, GRN, PAGE_W - 42, 8)
    + `<div style="height:18px;line-height:18px;font-size:0">&nbsp;</div>`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px;padding-bottom:2px">BY TEAM</td>`
      + `<td align="right" style="font-family:${F};font-size:10px;font-weight:600;line-height:1.2;color:#98a2b1;letter-spacing:.7px;padding-bottom:2px">HIT RATE</td></tr>`)
    + tbl(`width="100%"`, lb)
    + `<div style="height:14px;line-height:14px;font-size:0">&nbsp;</div>`
    + tbl(`width="100%" bgcolor="${band.bg}" style="background:${band.bg};border:1px solid ${band.line}"`,
      `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${band.ink};letter-spacing:.8px;padding:10px 0 10px 12px">ALL TEAMS</td>`
      + allAEs.map((x) => `<td width="108" align="right" style="padding:10px 0">`
        + `<div style="font-family:${F};font-size:9px;font-weight:700;line-height:1.2;color:${band.ink};letter-spacing:.7px;opacity:.75">${x.label}</div>`
        + `<div style="font-family:${F};font-size:17px;font-weight:800;line-height:1.25;color:${INK};letter-spacing:-.3px">${n(x.value)}</div></td>`).join("")
      + `<td width="14">&nbsp;</td></tr>`)
    + `</td></tr>`
    + (leaderStyle === "off" ? "" :
        `<tr><td style="padding:16px 0 8px;font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px">TODAY&rsquo;S BEST</td></tr>`
        + sweepBanner(teams)
        + leadersBlock(leaders, leaderStyle))
    + `<tr><td style="padding:${leaderStyle === "off" ? 14 : 10}px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>`
    + `<tr><td>${tbl(`width="100%"`, cards)}</td></tr>`
    + `<tr><td style="padding:6px 20px 0;font-family:${F};font-size:11.5px;font-weight:400;line-height:1.6;color:${MUT}">`
    + `A day counts as hit on any one of: ${SUB_GOAL}+ submission, ${TIX_GOAL}+ tickets, ${CALLS_GOAL}+ calls, or ${TALK_GOAL}+ minutes talk time. `
    + `&ldquo;To go&rdquo; shows the line that AE is closest to. Sales managers and anyone out of office are excluded from the count.<br>`
    + `Figures from the ${esc(b.callsUpdatedLabel || "—")} call file and the ${esc(b.updatedLabel || "—")} production file. `
    + `<a href="${url}" style="color:${GRN};font-weight:600;text-decoration:none">Open the board &rsaquo;</a></td></tr>`;

  // The four dials, in the order they appear on the page. A subject line has no
  // room to label them, so the preheader — the grey text the inbox prints right
  // after the subject — carries the key instead. Read together they say
  // "1-4-0-34" then "Subs · Doc Check · UW · Tix", which teaches the order once
  // and then stays out of the way.
  const dials = dialSpecs(b);
  const indicators = dials.map((d) => (d.pending ? "\u2013" : d.value)).join("/");
  const preheader = `${dials.map((d) => d.label.replace("DOC CHECK", "Doc Check")
    .replace("SUBS", "Subs").replace("UW", "UW").replace("TIX", "Tix")).join(" \u00b7 ")}`
;
  const html = `<!doctype html><html><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">`
    + `<title>${esc(opts.sendLabel)} daily goal</title></head>`
    + `<body style="margin:0;padding:0;background:${PAGE}">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>`
    + tbl(`width="100%" bgcolor="${PAGE}" style="background:${PAGE}"`,
      `<tr><td align="center" style="padding:18px 12px 26px">`
      + tbl(`width="${PAGE_W}" style="width:${PAGE_W}px;max-width:${PAGE_W}px"`, inner) + `</td></tr>`)
    + `</body></html>`;

  return { subject: `Leading Indicators ${opts.sendLabel} \u2014 ${indicators} \u2014 ${hit} of ${total}, ${pct}%`, preheader, html };
}
