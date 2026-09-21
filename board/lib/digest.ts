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

export const PAGE_W = 760;
const CALLS_GOAL = 75, TALK_GOAL = 90, SUB_GOAL = 1, TIX_GOAL = 3;

export const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const INK = "#17233d", MUT = "#6b7686", LINE = "#d9e0ea", GRN = "#127a3c", PAGE = "#ffffff";

type AE = {
  name: string; calls: number; talk: number; tix: number; subs: number; doc: number; uw: number;
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
type Team = { team: string; aes: AE[]; sidelined: { name: string; why: string }[]; hidden: { calls: number; talk: number; tix: number; subs: number; doc: number; uw: number }[]; manager: string | null; hit: number; n: number; pct: number;
  /** Every dollar on the team's desks, in dollars. Summed from the same
   *  board rows the tiles use, and over EVERY member — managers, dashed
   *  reps and anyone out of office included — because a team's book does
   *  not shrink because someone is not being scored today. */
  pipe: number };

/** Team rollups, using exactly the board's inclusion rules. */
export function digestTeams(b: BoardData): { teams: Team[]; hit: number; total: number; pct: number } {
  const dash = new Set(b.dashAEs), exempt = new Set(b.exemptAEs), ooo = new Set(b.oooAEs);
  const byTeam = new Map<string, Team>();
  const teamOf = (raw: string) => (raw || "").replace(/\s*·.*$/, "").trim() || "Unassigned";

  for (const r of b.rows) {
    const name = r[0], team = teamOf(r[1]);
    if (!byTeam.has(team)) byTeam.set(team, { team, aes: [], sidelined: [], hidden: [], manager: null, hit: 0, n: 0, pct: 0, pipe: 0 });
    const g = byTeam.get(team)!;
    // Pipeline is banked first, ahead of every early continue below: an OOO rep
    // or a sales manager still has a book, and dropping it here would quietly
    // understate the team.
    g.pipe += r[2] || 0;
    const raw = b.today[name] || [0, 0, 0];
    const st = b.stage?.[name] || [0, 0];
    const asHidden = () => g.hidden.push({
      calls: raw[0], talk: Math.round(raw[1]), tix: b.tix[name] || 0, subs: raw[2],
      doc: st[0], uw: st[1],
    });
    if (ooo.has(name)) { g.sidelined.push({ name, why: "Out of office" }); asHidden(); continue; }
    if (dash.has(name)) {
      const role = b.roles?.[name];
      // A sales manager is named once in the card header, by the roster map
      // below, and never as a dashed row among the people he manages. His
      // production still lands in the team total.
      if (role === "Sales Manager") { asHidden(); continue; }
      g.sidelined.push({ name, why: role || "Not scored" });
      asHidden();
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
      doc: (b.stage?.[name] || [0, 0])[0], uw: (b.stage?.[name] || [0, 0])[1],
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

export const GOLD = "#9a7a10", GOLD_BG = "#fdf6dd", GOLD_LINE = "#e8d38f";
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
    return `<div style="padding:0 4px 8px">`
      + tbl(`width="100%" bgcolor="${bg}" style="background:${bg};border:1px solid ${bd};border-top:3px solid ${dim ? "#dbe2ea" : ac}"`,
        `<tr><td align="center" height="${TILE_H}" valign="top" style="height:${TILE_H}px;padding:10px 6px 11px">`
        + face
        + `<div style="font-family:${F};font-size:8.5px;font-weight:700;line-height:1.2;color:${dim ? "#98a2b1" : ac};letter-spacing:.7px">${!dim && gold ? "\u2605 " : ""}${l.label}</div>`
        + `<div style="font-family:${F};font-size:23px;font-weight:800;line-height:1.15;color:${dim ? "#c3cbd6" : gold ? "#7a5f0c" : ac};letter-spacing:-.5px;padding:5px 0 3px">${l.value}</div>`
        + `<div style="font-family:${F};font-size:13.5px;font-weight:700;line-height:1.3;color:${INK}">${who}</div>${tie}</td></tr>`)
      + `</div>`;
  };
  return `<tr><td style="padding:0 0 6px">`
    + strip([cell(ls[0]), cell(ls[1]), cell(ls[2]), cell(ls[3])], 168)
    + `</td></tr>`;
}

/** 1345 -> 1,345. Four-figure call counts are unreadable without it. */
export const n = (v: number | string) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const tbl = (attrs: string, inner: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;
export const tone = (p: number) => (p >= 75 ? GRN : p >= 40 ? "#c08a1a" : "#a8443c");
/** Header-band money. $12.4M reads at a glance; $12,438,201 does not, and a
 *  full-precision number would force the band wider than a phone can give it. */
export const mny = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)}M`
  : v >= 1e3 ? `$${Math.round(v / 1e3)}K`
  : `$${Math.round(v)}`;

/** A bar drawn from two table cells — the only kind Outlook renders reliably. */
export function bar(pct: number, color: string, w: number | "100%", h: number) {
  const fill = Math.max(2, Math.min(100, Math.round(pct)));
  const attrs = w === "100%"
    ? `width="100%" style="width:100%;border-collapse:collapse"`
    : `width="${w}" style="width:${w}px;border-collapse:collapse"`;
  return tbl(attrs,
    `<tr><td height="${h}" bgcolor="${color}" style="height:${h}px;width:${fill}%;font-size:0;line-height:0">&nbsp;</td>`
    + `<td height="${h}" bgcolor="#dce3ec" style="height:${h}px;font-size:0;line-height:0">&nbsp;</td></tr>`);
}

// Percentages, not pixels. In a 346px two-column card the old pixel widths
// totalled 402px, leaving the name column -56px — and under table-layout:fixed
// that collapses to one character per line instead of merely cramping. These
// hold at any card width and renormalise when mobile drops three columns.
const W = { name: 36, calls: 10, talk: 10, tix: 7, subs: 9, doc: 7, uw: 7, stat: 14 };
const CARD_PAD = 12;
const headCell = (txt: string, w: number, padRight = 0, cls = "") =>
  `<td width="${w}%" class="mhead ${cls}" align="right" style="font-family:${F};font-size:8.5px;font-weight:800;`
  + `line-height:1.2;color:#5f6b7a;letter-spacing:0;white-space:nowrap;`
  + `padding:0 ${padRight}px 6px 3px">${txt}</td>`;
const headerRow = () =>
  `<tr><td width="${W.name}%" style="padding:0 0 6px ${CARD_PAD}px">&nbsp;</td>`
  + headCell("CALLS", W.calls) + headCell("TALK", W.talk) + headCell("TIX", W.tix) + headCell("SUBS", W.subs)
  + headCell("DOC", W.doc) + headCell("UW", W.uw)
  + headCell("STATUS", W.stat, CARD_PAD) + `</tr>`;

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
  const num = (val: string, on: boolean, w: number, cls = "") =>
    `<td width="${w}%" class="${cls}" align="right" style="padding:4px 0 4px 5px;border-bottom:1px solid #f4f6fa">`
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
        : chip("&ndash;", "#f1f4f7", "#dde3ea", "#9aa4b2");
  return `<tr><td width="${W.name}%" style="font-family:${F};font-size:12.5px;font-weight:${a.met ? 700 : 400};line-height:1.3;color:${a.met ? INK : "#7b8698"};padding:4px 0 4px ${CARD_PAD}px;border-bottom:1px solid #f4f6fa">${esc(a.name)}</td>`
    + num(a.callsTxt, a.cH, W.calls) + num(a.talkTxt, a.tH, W.talk) + num(a.tixTxt, a.xH, W.tix) + num(String(a.subs), a.sH, W.subs)
    + num(String(a.doc), false, W.doc) + num(String(a.uw), false, W.uw)
    + `<td width="${W.stat}%" align="right" style="padding:4px ${CARD_PAD}px 4px 0;border-bottom:1px solid #f4f6fa">${stat}</td></tr>`;
}
/** What the team actually did today, across every row printed above it. Talk is
 *  minutes, so it sums; the others are counts. Sidelined rows contribute
 *  nothing because they have nothing to contribute. */
function totalRow(aes: AE[], hidden: { calls: number; talk: number; tix: number; subs: number; doc: number; uw: number }[],
                  band: { bg: string; line: string; ink: string }) {
  const sum = (f: (a: { calls: number; talk: number; tix: number; subs: number; doc: number; uw: number }) => number) =>
    aes.reduce((t, a) => t + f(a), 0) + hidden.reduce((t, h) => t + f(h), 0);
  const cell = (v: number | string, w: number, cls = "") =>
    `<td width="${w}%" class="${cls}" align="right" style="padding:6px 0 6px 5px;background:${band.bg};border-top:1px solid ${band.line}">`
    + `<span style="font-family:${F};font-size:13px;font-weight:800;line-height:1.3;color:${INK}">${v}</span></td>`;
  return `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${band.ink};letter-spacing:.7px;`
    + `padding:6px 0 6px ${CARD_PAD}px;background:${band.bg};border-top:1px solid ${band.line}" width="${W.name}%">TEAM</td>`
    + cell(n(sum((a) => a.calls)), W.calls) + cell(n(sum((a) => a.talk)), W.talk)
    + cell(n(sum((a) => a.tix)), W.tix) + cell(n(sum((a) => a.subs)), W.subs)
    + cell(n(sum((a) => a.doc)), W.doc) + cell(n(sum((a) => a.uw)), W.uw)
    + `<td width="${W.stat}%" style="background:${band.bg};border-top:1px solid ${band.line}">&nbsp;</td></tr>`;
}

const sideRow = (s: { name: string; why: string }) =>
  `<tr><td width="${W.name}%" style="font-family:${F};font-size:12.5px;font-weight:400;line-height:1.3;color:#b6bfcb;padding:4px 0 4px ${CARD_PAD}px;border-bottom:1px solid #f4f6fa">${esc(s.name)}</td>`
  + `<td colspan="7" align="right" style="font-family:${F};font-size:10px;font-weight:600;line-height:1.3;color:#b6bfcb;letter-spacing:.7px;padding:4px ${CARD_PAD}px 4px 0;border-bottom:1px solid #f4f6fa">${esc(s.why).toUpperCase()}</td></tr>`;

/** Daily stage targets for the dial row, team-wide. Calibrated against a full
 *  day's export (Tue 9/15: 18 subs, 13 into doc check, 12 into underwriting). */
export const DIAL_GOALS = { subs: 30, docCheck: 30, uw: 20, tix: 60 };

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
  /** Where a full day's work sits for TODAY's headcount, as a percent of the
   *  standing goal. The goal itself never moves — this is the tick on the
   *  track that says "reaching here is a full effort with this many people
   *  out". Undefined when absences are below the floor and no context is due. */
  adjPct?: number;
  /** The same thing in whole units, for the caption under the row. */
  adjGoal?: number;
};

/** How many people have to be out before the dials start showing an
 *  attendance-adjusted mark. Two or three on PTO is an ordinary day and a mark
 *  every single send would be noise; a sales meeting or a holiday week is not,
 *  and that is the case worth annotating. */
export const ATTENDANCE_FLOOR = 4;

/** Absence context for a board: who is out, against the rostered headcount the
 *  goals were set for. `show` is the floor test — everything downstream keys
 *  off it, so the rule lives in exactly one place. */
export function attendance(b: BoardData): { out: number; roster: number; available: number; frac: number; show: boolean } {
  const roster = b.rows.length;
  const out = (b.oooAEs || []).length;
  const available = Math.max(0, roster - out);
  // Downward only. A full room does not raise the bar above the standing goal,
  // and neither does hiring — that would move the target without anyone
  // deciding to move it.
  const frac = roster > 0 ? Math.min(1, available / roster) : 1;
  return { out, roster, available, frac, show: out >= ATTENDANCE_FLOOR && roster > 0 };
}

/** Arc over track, keyed off how far along the day is. Each track is the same
 *  hue as its arc, lightened — the reference look: one colour, two weights. */
/** How much of the selling day has gone: 0 at 8am Arizona, 1 at 6pm. Anything
 *  outside the window clamps, so a 7am run reads as the start of the day rather
 *  than as a negative. */
export function paceFraction(hour: number, minute = 0): number {
  const START = 8, END = 18;
  const t = hour + minute / 60;
  return Math.max(0, Math.min(1, (t - START) / (END - START)));
}

/** The four pace bands, in one place so the dials and the legend under them
 *  can never describe different things. */
export const PACE_BANDS = [
  { min: 1.00, label: "On pace or ahead", color: "#1a7f3c", track: "#dcefe2" },
  { min: 0.75, label: "Slightly behind",  color: "#2f9558", track: "#e0efe6" },
  { min: 0.50, label: "Behind",           color: "#b5651d", track: "#f6e6d6" },
  { min: 0,    label: "Well behind",      color: "#a8202a", track: "#f3dcdd" },
];

/** Colour is pace, not progress. Eight submissions at ten in the morning is a
 *  good morning; the same eight at five in the afternoon is a bad day. Judging
 *  both against a flat 30 would paint every morning email red and teach people
 *  to ignore the colour. The arc length still shows progress to goal, so the
 *  two readings stay independent: how far round, and what colour. */
function dialTone(value: number, goal: number, pending: boolean, pace: number, adjFrac = 1): { color: string; track: string } {
  const only = (p: { color: string; track: string }) => ({ color: p.color, track: p.track });
  if (pending) return { color: "#b6bfcb", track: "#eef1f5" };
  // Goal met is green whatever the clock says.
  if (goal && value >= goal) return only(PACE_BANDS[0]);
  // Colour answers "are we working hard enough", so it is judged against what
  // today's room can actually do. The goal and the arc length still read
  // against the standing 30/30/20/60 — only the verdict moves. Without this
  // the adjusted mark would be decoration: a short-handed team would read red
  // all day for turning in a full day's work.
  const expected = goal * adjFrac * pace;
  // Before the day starts there is nothing to be behind on.
  const ratio = expected <= 0 ? 1 : value / expected;
  return only(PACE_BANDS.find((b) => ratio >= b.min) || PACE_BANDS[PACE_BANDS.length - 1]);
}

/** The shape of every dial, in one place, so the renderer that draws the image
 *  and the HTML that places it can never drift apart. */
export function dialSpecs(b: BoardData, pace = 1): DialSpec[] {
  const raw: { key: DialSpec["key"]; label: string; value: number; goal: number; pending: boolean }[] = [
    { key: "subs", label: "SUBS", value: b.kpi.subsToday ?? 0, goal: DIAL_GOALS.subs, pending: false },
    { key: "doc", label: "DOC CHECK", value: b.kpi.docCheckToday ?? 0, goal: DIAL_GOALS.docCheck, pending: false },
    { key: "uw", label: "UW", value: b.kpi.uwToday ?? 0, goal: DIAL_GOALS.uw, pending: false },
    { key: "tix", label: "TIX", value: b.tixTotal ?? 0, goal: DIAL_GOALS.tix, pending: !!b.tixPending },
  ];
  const att = attendance(b);
  const frac = att.show ? att.frac : 1;
  return raw.map((r) => {
    const pct = r.pending || !r.goal ? 0 : Math.min(100, Math.round(r.value / r.goal * 100));
    const adjGoal = Math.round(r.goal * frac);
    return {
      ...r, pct, unit: r.pending ? "awaiting" : "of " + r.goal,
      ...dialTone(r.value, r.goal, r.pending, pace, frac),
      // Only carried when the floor is crossed; an undefined tick draws nothing,
      // so an ordinary day looks exactly as it does now.
      ...(att.show && !r.pending ? { adjPct: Math.round(frac * 100), adjGoal } : {}),
    };
  });
}

/** One row of equal tiles that wraps when the screen is too narrow for them all.
 *  A table cell can never wrap, which is why these are inline-block divs: the
 *  reflow costs no media query and so survives clients that strip <style>.
 *  Word's engine ignores inline-block, so ghost cells keep it side by side. */
export function strip(cells: string[], maxW: number, floorW = 132): string {
  const pct = Math.floor(100 / cells.length);
  return `<div style="font-size:0;line-height:0;text-align:center">`
    + `<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->`
    + cells.map((c) =>
        `<!--[if mso]><td width="${pct}%" valign="top"><![endif]-->`
        + `<div style="display:inline-block;vertical-align:top;width:100%;max-width:${maxW}px;min-width:${floorW}px">${c}</div>`
        + `<!--[if mso]></td><![endif]-->`).join("")
    + `<!--[if mso]></tr></table><![endif]-->`
    + `</div>`;
}

export const DIAL_PX = 112;

export type LegendStyle = "dots" | "bar" | "sentence" | "chips" | "off";

/** How the colour rule is explained under the dials. The rule itself lives in
 *  PACE_BANDS; these are only ways of saying it. */
function paceLegend(style: LegendStyle, pace: number, band: { bg: string; line: string; ink: string }): string {
  if (style === "off") return "";
  const note = `${Math.round(pace * 100)}% of day complete`;
  const muted = `font-family:${F};font-size:10px;font-weight:400;line-height:1.6;color:#8d97a4`;

  if (style === "sentence") {
    // One line of prose. The colour words carry their own colour, so the key
    // and the sentence are the same object.
    const word = (p: typeof PACE_BANDS[number]) =>
      `<span style="font-family:${F};font-size:10.5px;font-weight:700;color:${p.color}">${p.label.toLowerCase()}</span>`;
    return tbl(`width="100%"`,
      `<tr><td style="${muted};font-size:10.5px">Dial color shows pace against the clock &mdash; `
      + PACE_BANDS.map(word).join(`<span style="color:#b9c2cd">&nbsp;&middot;&nbsp;</span>`)
      + ` &mdash; with ${note}.</td></tr>`);
  }

  if (style === "chips") {
    // The bands as labelled ranges: what number keeps you in which colour.
    const ranges = ["100%+", "75\u201399%", "50\u201374%", "under 50%"];
    return tbl(`width="100%"`,
      `<tr><td>` + strip(PACE_BANDS.map((p, i) =>
        `<div style="padding:0 8px 6px 0;text-align:left">`
        + tbl(`width="100%"`,
          `<tr><td height="4" bgcolor="${p.color}" style="height:4px;background:${p.color};font-size:0;line-height:0">&nbsp;</td></tr>`
          + `<tr><td style="font-family:${F};font-size:10.5px;font-weight:700;line-height:1.5;color:${p.color};padding-top:4px">${ranges[i]}</td></tr>`
          + `<tr><td style="font-family:${F};font-size:9.5px;font-weight:600;line-height:1.3;color:#7b8698">${p.label}</td></tr>`)
        + `</div>`), 164)
      + `</td></tr>`);
  }

  if (style === "bar") {
    // A single bar reading left to right, worst to best, with the thresholds
    // printed under the joins rather than inside the blocks.
    const seg = [...PACE_BANDS].reverse();
    return tbl(`width="100%"`,
      `<tr><td>`
      + tbl(`width="300" style="width:300px"`,
        `<tr>` + seg.map((p) =>
          `<td width="25%" height="9" bgcolor="${p.color}" style="height:9px;background:${p.color};font-size:0;line-height:0">&nbsp;</td>`).join("") + `</tr>`
        + `<tr>` + ["0", "50%", "75%", "100%"].map((t, i) =>
          `<td width="25%" style="font-family:${F};font-size:9px;font-weight:600;line-height:1.6;color:#8d97a4;${i ? "text-align:left" : ""}">${t}</td>`).join("") + `</tr>`)
      + `</td>`
      + `<td valign="middle" align="right" style="${muted}">`
      + `Behind &rarr; ahead of pace &nbsp;&middot;&nbsp; ${note}</td></tr>`);
  }

  // "dots" — the original.
  return tbl(`width="100%"`,
    `<tr><td>`
    + PACE_BANDS.map((p) =>
      `<span style="display:inline-block;width:10px;height:10px;background:${p.color};border-radius:5px;font-size:0;line-height:0">&nbsp;</span>`
      + `<span style="font-family:${F};font-size:10px;font-weight:600;line-height:1.6;color:#7b8698">&nbsp;${p.label}&nbsp;&nbsp;&nbsp;</span>`).join("")
    + `</td><td align="right" style="${muted};white-space:nowrap">${note}</td></tr>`);
}


function dialsBlock(b: BoardData, band: { bg: string; line: string; ink: string }, pace: number, showPct: boolean, legend: LegendStyle, src?: Partial<Record<DialSpec["key"], string>>): string {
  const cells = dialSpecs(b, pace).map((d) => {
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
    return `<div style="padding:0 4px 6px">`
      + art
      + `<div style="height:${showPct ? 6 : 10}px;line-height:${showPct ? 6 : 10}px;font-size:0">&nbsp;</div>`
      + (showPct && !d.pending
        ? `<div style="font-family:${F};font-size:12px;font-weight:800;line-height:1.3;color:${d.color}">${d.pct}%</div>` : "")
      + `<div style="font-family:${F};font-size:10px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:.9px">${d.label}</div>`
      + `</div>`;
  });
  return `<tr><td bgcolor="${band.bg}" style="background:${band.bg};border:1px solid ${band.line};border-top:0;padding:18px 12px 18px">`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px;padding:0 8px 14px">TODAY&rsquo;S PRODUCTIVITY</td></tr>`)
    + strip(cells, 168)
    + attendanceNote(b)
    + `<div style="height:14px;line-height:14px;font-size:0">&nbsp;</div>`
    + paceLegend(legend, pace, band)
    + `</td></tr>`;
}

/** The sentence that makes the notch mean something. Without it the mark is a
 *  scratch on the ring; with it the reader knows the goal did not move and why
 *  the colour is kinder than the arc length suggests. */
function attendanceNote(b: BoardData): string {
  const a = attendance(b);
  if (!a.show) return "";
  const g = DIAL_GOALS;
  const at = (v: number) => Math.round(v * a.frac);
  return `<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>`
    + `<div style="font-family:${F};font-size:11px;font-weight:400;line-height:1.55;color:#5f6b7a;text-align:center;padding:0 8px">`
    + `<span style="font-weight:700;color:${INK}">${a.out} of ${a.roster} out today.</span>`
    + `&nbsp; Goals hold at ${g.subs}/${g.docCheck}/${g.uw}/${g.tix} &mdash; the mark on each ring shows a full day&rsquo;s `
    + `work for the ${a.available} people here (${at(g.subs)}/${at(g.docCheck)}/${at(g.uw)}/${at(g.tix)}), and color is judged against it.`
    + `</div>`;
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
    /** 0 at the start of the selling day, 1 at the end. Drives the dial colours
     *  and the legend under them. Defaults to end-of-day. */
    pace?: number;
    /** Print each dial's percent of goal beneath the number. */
    dialPct?: boolean;
    /** How the pace colour rule is explained under the dials. */
    legend?: LegendStyle;
    /** 1 (the default) stacks the team cards full width; 2 runs them two across.
     *  Two across cannot carry all seven metric columns legibly. */
    columns?: 1 | 2;
    /** Edge length of the team mark in the card header, in px. Defaults to 62;
     *  the mobile rule steps it down so the band keeps its two stats. */
    teamLogoPx?: number;
  },
): Digest {
  const { teams, hit, total, pct } = digestTeams(b);
  const leaderStyle = opts.leaderStyle || "row";
  const leaders = digestLeaders(b, teams);
  const leader = teams[0];
  const url = opts.boardUrl || "#";
  const band = BANDS[opts.band || "stone"];
  const pace = opts.pace === undefined ? 1 : opts.pace;
  const everyone = [...teams.flatMap((g) => g.aes), ...teams.flatMap((g) => g.hidden)];
  const tot = (f: (a: { calls: number; talk: number; tix: number; subs: number }) => number) =>
    everyone.reduce((t, a) => t + f(a), 0);
  const allAEs = [
    { label: "CALLS", value: tot((a) => a.calls) },
    { label: "TALK MIN", value: tot((a) => a.talk) },
    { label: "TICKETS", value: tot((a) => a.tix) },
    { label: "SUBS", value: tot((a) => a.subs) },
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
      + `<td width="140" class="mdrop" style="padding:8px 12px 8px 0">${bar(g.pct, c, 140, 7)}</td>`
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
    const rows = headerRow() + g.aes.map(aeRow).join("") + g.sidelined.map(sideRow).join("") + totalRow(g.aes, g.hidden, band);
    const tp = teamPhotos[g.team];
    const pstyle = opts.teamPhotoStyle || "thumb";
    const clean = g.n > 0 && g.hit === g.n;
    const lg = (opts.photos?.logos || {})[g.team];
    // The team mark. Sized in a fixed-width cell so a blocked or missing image
    // leaves the band's geometry intact rather than collapsing the name into
    // the pipeline figure. Square, because the artwork is already round.
    const LPX = opts.teamLogoPx || 62;
    const logoCell = lg
      ? `<td width="${LPX + 10}" valign="middle" class="mlogo" style="width:${LPX + 10}px">`
        + `<img src="${esc(lg)}" width="${LPX}" height="${LPX}" alt="" style="display:block;width:${LPX}px;height:${LPX}px;border:0" /></td>`
      : "";
    const shot = tp && pstyle === "thumb"
      ? `<td width="62" valign="middle" style="width:62px"><img src="${esc(tp)}" width="54" height="32" alt="" style="display:block;width:54px;height:32px" /></td>`
      : "";
    const bnr = tp && pstyle === "banner"
      ? `<tr><td style="font-size:0;line-height:0"><img src="${esc(tp)}" width="342" height="86" alt="" style="display:block;width:100%;max-width:342px;height:auto" /></td></tr>`
      : "";
    // Two right-hand stats, each a caps label over a number. Both are nowrap:
    // the band may run out of room on a narrow phone, and a wrapped "$12.4M"
    // is worse than a team name that takes a second line.
    const statCell = (label: string, value: string, ink: string, padLeft: number) =>
      `<td align="right" valign="middle" style="padding-left:${padLeft}px">`
      + `<div style="font-family:${F};font-size:8.5px;font-weight:800;line-height:1.2;color:#68737f;letter-spacing:.7px;white-space:nowrap">${label}</div>`
      + `<div style="font-family:${F};font-size:16px;font-weight:800;line-height:1.25;color:${ink};white-space:nowrap;padding-top:1px">${value}</div></td>`;
    return tbl(`width="100%" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE}"`,
      bnr
      + `<tr><td bgcolor="${band.bg}" style="background:${band.bg};padding:9px 12px;border-bottom:2px solid ${c}">`
      + tbl(`width="100%"`,
        `<tr>${shot}${logoCell}<td valign="middle" width="100%" style="width:100%;padding-left:${shot || logoCell ? 2 : 0}px">`
        + `<div style="font-family:${F};font-size:15px;font-weight:800;line-height:1.2;color:${INK};letter-spacing:-.2px">${esc(g.team)}`
        + (clean ? ` <span style="font-family:${F};font-size:9.5px;font-weight:700;line-height:1;color:#0b5c2c;background:#d6f0e0;padding:2px 6px;letter-spacing:.4px">&#10003; ALL IN</span>` : "")
        + `</div>`
        + (g.manager ? `<div style="font-family:${F};font-size:10.5px;font-weight:600;line-height:1.4;color:#6f7d8c;padding-top:1px">${esc(g.manager)}</div>` : "")
        + `</td>`
        + statCell("PIPELINE", mny(g.pipe), INK, 10)
        + statCell("ON GOAL", `${g.hit}/${g.n}`, clean ? GRN : c, 14)
        + `</tr>`)
      + `</td></tr><tr><td style="padding:8px 0 0">${tbl(`width="100%" style="table-layout:fixed;width:100%"`, rows)}</td></tr>`);
  };

  // Two continuous columns rather than paired rows. Rows-of-two left a hole
  // under every short card — Bone Crushers' four people sitting beside Lien
  // Kings' eleven. Stacking each column independently means the only ragged
  // edge is the very bottom, and the cards are distributed by member count so
  // even that stays small. Reading runs down the left column then the right,
  // which the BY TEAM standings above have already ranked.
  const cost = (g: Team) => g.aes.length + g.sidelined.length + 2;
  let cards: string;
  if ((opts.columns || 1) === 1) {
    cards = teams.map((g) => `<tr><td style="padding:0 0 10px">${teamCard(g)}</td></tr>`).join("");
  } else {
    const colA: Team[] = [], colB: Team[] = [];
    let hA = 0, hB = 0;
    for (const g of teams) {
      if (hA <= hB) { colA.push(g); hA += cost(g); } else { colB.push(g); hB += cost(g); }
    }
    const stack = (col: Team[]) =>
      col.map((g) => `<tr><td style="padding:0 0 10px">${teamCard(g)}</td></tr>`).join("");
    cards = `<tr>`
      + `<td width="50%" valign="top" style="padding:0 5px 0 0">${tbl(`width="100%"`, stack(colA))}</td>`
      + `<td width="50%" valign="top" style="padding:0 0 0 5px">${tbl(`width="100%"`, stack(colB))}</td>`
      + `</tr>`;
  }

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
      `<tr><td class="mstack" style="font-family:${F};font-size:15px;font-weight:700;line-height:1.2;color:#ffffff">Oaktree Funding&nbsp;&nbsp;<span style="font-weight:400;color:#bcd6c6">${esc((b.title || "Sales Production").replace(/ Sales Production$/, ""))}</span></td>`
      + `<td align="right" class="mstack mleft">`
      + `<div style="font-family:${F};font-size:12px;font-weight:600;line-height:1.3;color:#bcd6c6">${esc(opts.dateLabel)} &middot; ${esc(opts.sendLabel)}</div>`
      + `<div style="font-family:${F};font-size:11px;font-weight:400;line-height:1.4;color:#8fb49d">${Math.round(pace * 100)}% of day complete</div>`
      + `<div style="height:4px;line-height:4px;font-size:0">&nbsp;</div>`
      + tbl(`width="130" style="width:130px;border-collapse:collapse;margin:0 0 0 auto"`,
        `<tr><td height="4" bgcolor="#7fae92" style="height:4px;width:${Math.max(2, Math.round(pace * 100))}%;background:#7fae92;font-size:0;line-height:0">&nbsp;</td>`
        + `<td height="4" bgcolor="#2c6543" style="height:4px;background:#2c6543;font-size:0;line-height:0">&nbsp;</td></tr>`)
      + `</td></tr>`)
    + `</td></tr>`
    + banner
    + dialsBlock(b, band, pace, !!opts.dialPct, opts.legend || "chips", opts.dialSrc)
    + `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:22px 20px 18px">`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:46px;font-weight:800;line-height:1;color:${INK};letter-spacing:-1.5px;white-space:nowrap">${hit}<span style="font-size:26px;font-weight:600;color:${MUT}"> of ${total}</span></td>`
      + `<td align="right" style="font-family:${F};font-size:30px;font-weight:800;line-height:1;color:${GRN}">${pct}%</td></tr>`)
    + `<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>`
    + bar(pct, GRN, "100%", 8)
    + `<div style="height:18px;line-height:18px;font-size:0">&nbsp;</div>`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px;padding-bottom:2px">BY TEAM</td>`
      + `<td align="right" style="font-family:${F};font-size:10px;font-weight:600;line-height:1.2;color:#98a2b1;letter-spacing:.7px;padding-bottom:2px">HIT RATE</td></tr>`)
    + tbl(`width="100%"`, lb)
    + `</td></tr>`
    + `<tr><td bgcolor="#ffffff" style="background:#ffffff;border-left:1px solid ${LINE};border-right:1px solid ${LINE};padding:14px 0 0">`
    + tbl(`width="100%" bgcolor="${band.bg}" style="background:${band.bg};border-top:1px solid ${band.line};border-bottom:1px solid ${band.line}"`,
      `<tr><td class="mstack mcenter" style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${band.ink};letter-spacing:.8px;padding:10px 0 4px 14px;white-space:nowrap;width:120px">ALL TEAMS</td>`
      + `<td class="mstack" style="padding:4px 12px 10px 0">`
      + strip(allAEs.map((x) =>
          `<div style="padding:0 4px">`
          + `<div style="font-family:${F};font-size:9px;font-weight:700;line-height:1.2;color:${band.ink};letter-spacing:.7px">${x.label}</div>`
          + `<div style="font-family:${F};font-size:17px;font-weight:800;line-height:1.25;color:${INK};letter-spacing:-.3px">${n(x.value)}</div></div>`), 150, 74)
      + `</td></tr>`)
    + `</td></tr>`
    + `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;height:10px;line-height:10px;font-size:0">&nbsp;</td></tr>`
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
  const dials = dialSpecs(b, pace);
  const indicators = dials.map((d) => (d.pending ? "\u2013" : d.value)).join("/");
  const preheader = `${dials.map((d) => d.label.replace("DOC CHECK", "Doc Check")
    .replace("SUBS", "Subs").replace("UW", "UW").replace("TIX", "Tix")).join(" \u00b7 ")}`
;
  const html = `<!doctype html><html><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">`
    + `<style>@media only screen and (max-width:620px){`
    + `.mdrop{display:none !important;width:0 !important;max-width:0 !important;padding:0 !important;`
    + `font-size:0 !important;line-height:0 !important;overflow:hidden !important}`
    + `.mstack{display:block !important;width:100% !important;text-align:left !important}`
    + `.mcenter{text-align:center !important;padding-left:0 !important}`
    + `.mleft table{margin:6px 0 0 !important}`
    // A phone gives the header band ~350px. Stepping the mark down buys back
    // the width that keeps the pipeline figure beside the team name rather
    // than pushed under it, and keeps the band from eating the fold.
    + `.mlogo{width:58px !important}`
    + `.mlogo img{width:50px !important;height:50px !important}`
    + `}</style>`
    + `<title>${esc(opts.sendLabel)} daily goal</title></head>`
    + `<body style="margin:0;padding:0;background:${PAGE}">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>`
    + tbl(`width="100%" bgcolor="${PAGE}" style="background:${PAGE}"`,
      `<tr><td align="center" style="padding:18px 12px 26px">`
      + tbl(`width="100%" style="width:100%;max-width:${PAGE_W}px"`, inner) + `</td></tr>`)
    + `</body></html>`;

  return { subject: `Leading Indicators ${opts.sendLabel} \u2014 ${indicators} \u2014 ${hit} of ${total}, ${pct}%`, preheader, html };
}
