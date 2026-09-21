// Week-in-review email.
//
// A separate send from the daily digest, on purpose. The daily email answers
// "how are we doing right now" and has to stay short enough to read on a phone
// between calls. This one answers "how did the week go", which is a different
// question needing a different shape: not four numbers, but five days of four
// numbers, so you can see WHICH day fell over rather than only that the week
// came up short.
//
// Everything here is built from day-close rolls — one record per business day,
// written once after the day is over. Nothing recomputes from Drive at render
// time; a week is 240-odd snapshot files and that is not a thing to do inside
// a request.

import {
  F, INK, MUT, LINE, GRN, PAGE, PAGE_W, GOLD, GOLD_BG, GOLD_LINE,
  BANDS, DIAL_GOALS, ATTENDANCE_FLOOR, n, esc, tbl, tone, bar, strip, DIAL_PX,
  type DialSpec,
} from "./digest";

/** One business day, closed out. Written by the nightly roll-up. */
export type DayRoll = {
  /** Arizona calendar day, YYYY-MM-DD. */
  date: string;
  /** Three-letter day name, already localised by the writer. */
  dow: string;
  subs: number; doc: number; uw: number; tix: number;
  calls: number; talk: number;
  /** AEs who cleared at least one line, over AEs who were scored that day. */
  onGoal: number; scored: number;
  /** Absences and the rostered headcount the goals were set against. */
  out: number; roster: number;
  /** True when a feed never landed that day, so the number is not a real zero. */
  partial?: boolean;
};

export type WeekTeam = {
  team: string; manager: string | null;
  calls: number; talk: number; tix: number; subs: number; doc: number; uw: number;
  /** AE-days on goal over AE-days scored — the week's version of "6 of 10". */
  onGoal: number; slots: number;
  pipe: number;
};

export type Weekly = { subject: string; preheader: string; html: string };

const ROW_TINT = {
  hit:  { bg: "#e4f5ea", ink: "#0b5c2c" },
  near: { bg: "#fdf4e0", ink: "#7a5410" },
  miss: { bg: "#fbe9e9", ink: "#8d2b2b" },
  none: { bg: "#ffffff", ink: INK },
};

/** One shared rule for how a cell is shaded, so the grid and the dials above it
 *  cannot disagree about what counts as a good day. Judged against the day's
 *  attendance-adjusted bar for exactly the reason the daily dials are: a short
 *  day that turned in full effort should not read as a failure. */
function cellTint(value: number, goal: number, d: DayRoll) {
  if (!goal) return ROW_TINT.none;
  const frac = d.out >= ATTENDANCE_FLOOR && d.roster > 0
    ? Math.min(1, (d.roster - d.out) / d.roster) : 1;
  const bar = goal * frac;
  if (value >= bar) return ROW_TINT.hit;
  if (value >= bar * 0.75) return ROW_TINT.near;
  return ROW_TINT.miss;
}

/** Column widths as percentages: the label, then one per day, then the total.
 *  Percentages rather than pixels so the grid renormalises at any card width —
 *  a phone gives this table about 330px and it still has to hold seven
 *  columns without a single number wrapping. */
function gridWidths(days: number) {
  const label = 25, total = 15;
  const per = Math.floor((100 - label - total) / Math.max(1, days));
  return { label, per, total };
}

function gridCell(txt: string, w: number, tint: { bg: string; ink: string }, bold: boolean, last = false) {
  return `<td width="${w}%" align="right" bgcolor="${tint.bg}"`
    + ` style="background:${tint.bg};font-family:${F};font-size:12.5px;font-weight:${bold ? 800 : 600};`
    + `line-height:1.3;color:${tint.ink};white-space:nowrap;padding:7px 6px;border-bottom:1px solid #eef1f5`
    + (last ? `;border-left:1px solid ${LINE}` : "") + `">${txt}</td>`;
}

function gridRow(
  label: string, days: DayRoll[], pick: (d: DayRoll) => number, goal: number | null,
  total: string, W: ReturnType<typeof gridWidths>, sub?: string,
): string {
  const cells = days.map((d) => {
    const v = pick(d);
    const tint = goal ? cellTint(v, goal, d) : ROW_TINT.none;
    return gridCell(d.partial ? "&ndash;" : n(v), W.per, tint, false);
  }).join("");
  return `<tr>`
    + `<td width="${W.label}%" style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${INK};`
    + `letter-spacing:.5px;padding:7px 4px 7px 12px;border-bottom:1px solid #eef1f5;white-space:nowrap">${label}`
    + (sub ? `<span style="font-weight:400;color:${MUT};letter-spacing:0"> ${sub}</span>` : "")
    + `</td>`
    + cells
    + gridCell(total, W.total, ROW_TINT.none, true, true)
    + `</tr>`;
}

/** The grid. Metrics down the side, days across, week total in the last column.
 *  This is the centre of the email: four dials tell you the week was light,
 *  this tells you Tuesday was the problem and that eight people were out. */
function gridBlock(days: DayRoll[], band: { bg: string; line: string; ink: string }): string {
  const W = gridWidths(days.length);
  const sum = (f: (d: DayRoll) => number) => days.reduce((t, d) => t + (d.partial ? 0 : f(d)), 0);

  const head = `<tr><td width="${W.label}%" style="background:${band.bg};border-bottom:1px solid ${band.line};padding:8px 4px 8px 12px">&nbsp;</td>`
    + days.map((d) =>
        `<td width="${W.per}%" align="right" style="background:${band.bg};border-bottom:1px solid ${band.line};`
        + `font-family:${F};font-size:9.5px;font-weight:800;line-height:1.2;color:${band.ink};letter-spacing:.7px;`
        + `white-space:nowrap;padding:8px 6px">${esc(d.dow.toUpperCase())}</td>`).join("")
    + `<td width="${W.total}%" align="right" style="background:${band.bg};border-bottom:1px solid ${band.line};`
    + `border-left:1px solid ${band.line};font-family:${F};font-size:9.5px;font-weight:800;line-height:1.2;`
    + `color:${band.ink};letter-spacing:.7px;white-space:nowrap;padding:8px 6px">WEEK</td></tr>`;

  // On-goal is the headline row and prints as a fraction, so it is built by
  // hand rather than through the numeric helper.
  const onGoalCells = days.map((d) => {
    const pct = d.scored ? d.onGoal / d.scored * 100 : 0;
    const tint = d.scored === 0 ? ROW_TINT.none
      : pct >= 75 ? ROW_TINT.hit : pct >= 40 ? ROW_TINT.near : ROW_TINT.miss;
    return gridCell(d.partial ? "&ndash;" : `${d.onGoal}/${d.scored}`, W.per, tint, false);
  }).join("");
  const totHit = sum((d) => d.onGoal), totSlots = sum((d) => d.scored);
  const onGoalRow = `<tr>`
    + `<td width="${W.label}%" style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${INK};`
    + `letter-spacing:.5px;padding:7px 4px 7px 12px;border-bottom:1px solid #eef1f5;white-space:nowrap">ON GOAL</td>`
    + onGoalCells
    + gridCell(`${totSlots ? Math.round(totHit / totSlots * 100) : 0}%`, W.total, ROW_TINT.none, true, true)
    + `</tr>`;

  // Absences close the grid. A light Tuesday next to eight people out is a
  // different story from a light Tuesday with everyone at their desk, and that
  // is the whole argument for the row being here.
  const outCells = days.map((d) =>
    gridCell(String(d.out), W.per, d.out >= ATTENDANCE_FLOOR ? ROW_TINT.near : ROW_TINT.none, false)).join("");
  const outRow = `<tr>`
    + `<td width="${W.label}%" style="font-family:${F};font-size:11px;font-weight:700;line-height:1.3;color:${MUT};`
    + `letter-spacing:.5px;padding:7px 4px 7px 12px;white-space:nowrap">OUT</td>`
    + outCells
    + gridCell("&nbsp;", W.total, ROW_TINT.none, false, true)
    + `</tr>`;

  const body = onGoalRow
    + gridRow("SUBS", days, (d) => d.subs, DIAL_GOALS.subs, n(sum((d) => d.subs)), W)
    + gridRow("DOC CHECK", days, (d) => d.doc, DIAL_GOALS.docCheck, n(sum((d) => d.doc)), W)
    + gridRow("UW", days, (d) => d.uw, DIAL_GOALS.uw, n(sum((d) => d.uw)), W)
    + gridRow("TIX", days, (d) => d.tix, DIAL_GOALS.tix, n(sum((d) => d.tix)), W)
    + gridRow("CALLS", days, (d) => d.calls, null, n(sum((d) => d.calls)), W)
    + gridRow("TALK", days, (d) => d.talk, null, n(sum((d) => d.talk)), W, "min")
    + outRow;

  return `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:0">`
    + tbl(`width="100%" style="table-layout:fixed;width:100%"`, head + body)
    + `</td></tr>`;
}

/** Week dials: the daily four, summed, against the daily goal times the number
 *  of days actually in the week. The notch carries over too — a week with two
 *  short days earns the same annotation a short day does. */
export function weekDials(days: DayRoll[]): (DialSpec & { adjPct?: number })[] {
  const live = days.filter((d) => !d.partial);
  const dayCount = live.length || 1;
  const adjSum = live.reduce((t, d) =>
    t + (d.out >= ATTENDANCE_FLOOR && d.roster > 0 ? Math.min(1, (d.roster - d.out) / d.roster) : 1), 0);
  const frac = adjSum / dayCount;
  const anyShort = live.some((d) => d.out >= ATTENDANCE_FLOOR);
  const raw: { key: DialSpec["key"]; label: string; value: number; goal: number }[] = [
    { key: "subs", label: "SUBS", value: live.reduce((t, d) => t + d.subs, 0), goal: DIAL_GOALS.subs * dayCount },
    { key: "doc", label: "DOC CHECK", value: live.reduce((t, d) => t + d.doc, 0), goal: DIAL_GOALS.docCheck * dayCount },
    { key: "uw", label: "UW", value: live.reduce((t, d) => t + d.uw, 0), goal: DIAL_GOALS.uw * dayCount },
    { key: "tix", label: "TIX", value: live.reduce((t, d) => t + d.tix, 0), goal: DIAL_GOALS.tix * dayCount },
  ];
  return raw.map((r) => {
    const pct = r.goal ? Math.min(100, Math.round(r.value / r.goal * 100)) : 0;
    // A finished week is judged flat against its bar; there is no clock left to
    // be early in, so the pace machinery has nothing to say here.
    const ratio = r.goal ? r.value / (r.goal * frac) : 1;
    const t = ratio >= 1 ? { color: "#1a7f3c", track: "#dcefe2" }
      : ratio >= 0.85 ? { color: "#2f9558", track: "#e0efe6" }
      : ratio >= 0.6 ? { color: "#b5651d", track: "#f6e6d6" }
      : { color: "#a8202a", track: "#f3dcdd" };
    return {
      ...r, pct, pending: false, unit: "of " + r.goal, ...t,
      ...(anyShort ? { adjPct: Math.round(frac * 100), adjGoal: Math.round(r.goal * frac) } : {}),
    };
  });
}

function dialsBlock(dials: ReturnType<typeof weekDials>, band: { bg: string; line: string; ink: string },
                    src?: Partial<Record<DialSpec["key"], string>>): string {
  const cells = dials.map((d) => {
    const url = src?.[d.key];
    const art = url
      ? `<img src="${url}" width="${DIAL_PX}" height="${DIAL_PX}" alt="${esc(d.label)} ${d.value} of ${d.goal}"`
        + ` style="display:block;width:${DIAL_PX}px;height:${DIAL_PX}px;border:0;outline:none;text-decoration:none;margin:0 auto" border="0">`
      : `<div style="width:${DIAL_PX - 14}px;height:${DIAL_PX - 14}px;margin:0 auto;background:${d.track};`
        + `border:7px solid ${d.color};border-radius:${DIAL_PX}px;text-align:center">`
        + `<div style="font-family:${F};font-size:28px;font-weight:800;line-height:1;color:${d.color};letter-spacing:-1px;padding-top:${(DIAL_PX - 14 - 42) / 2}px">${d.value}</div>`
        + `<div style="font-family:${F};font-size:10px;font-weight:600;line-height:1.4;color:#8a94a4">${d.unit}</div></div>`;
    return `<div style="padding:0 4px 6px">`
      + art
      + `<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>`
      + `<div style="font-family:${F};font-size:12px;font-weight:800;line-height:1.3;color:${d.color}">${d.pct}%</div>`
      + `<div style="font-family:${F};font-size:10px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:.9px">${d.label}</div>`
      + `</div>`;
  });
  return `<tr><td bgcolor="${band.bg}" style="background:${band.bg};border:1px solid ${band.line};border-top:0;padding:18px 12px 16px">`
    + tbl(`width="100%"`,
      `<tr><td style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px;padding:0 8px 14px">THE WEEK IN FOUR NUMBERS</td></tr>`)
    + strip(cells, 168)
    + `</td></tr>`;
}

function teamBlock(teams: WeekTeam[], band: { bg: string; line: string; ink: string }, logos: Record<string, string>, logoPx: number): string {
  const ranked = [...teams].sort((a, b) => {
    const pa = a.slots ? a.onGoal / a.slots : 0, pb = b.slots ? b.onGoal / b.slots : 0;
    return pb - pa || b.slots - a.slots || a.team.localeCompare(b.team);
  });
  const rows = ranked.map((g, i) => {
    const pct = g.slots ? Math.round(g.onGoal / g.slots * 100) : 0;
    const c = tone(pct);
    const lg = logos[g.team];
    const mark = lg
      ? `<td width="${logoPx + 10}" valign="middle" class="mlogo" style="width:${logoPx + 10}px;padding:8px 0">`
        + `<img src="${esc(lg)}" width="${logoPx}" height="${logoPx}" alt="" style="display:block;width:${logoPx}px;height:${logoPx}px;border:0" /></td>`
      : "";
    return `<tr>${mark}`
      + `<td valign="middle" width="100%" style="width:100%;padding:8px 0 8px 4px;border-bottom:1px solid #f0f3f8">`
      + `<div style="font-family:${F};font-size:13.5px;font-weight:800;line-height:1.25;color:${INK}">${esc(g.team)}</div>`
      + (g.manager ? `<div style="font-family:${F};font-size:10.5px;font-weight:600;line-height:1.4;color:#8792a1">${esc(g.manager)}</div>` : "")
      + `</td>`
      + [["CALLS", n(g.calls), 1], ["TALK", n(g.talk), 1], ["TIX", n(g.tix), 1], ["SUBS", n(g.subs), 0]].map(([l, v, drop]) =>
          `<td align="right" valign="middle" class="${drop ? "mdrop" : ""}" style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f3f8">`
          + `<div style="font-family:${F};font-size:8.5px;font-weight:800;line-height:1.2;color:#68737f;letter-spacing:.6px;white-space:nowrap">${l}</div>`
          + `<div style="font-family:${F};font-size:13.5px;font-weight:800;line-height:1.25;color:${INK};white-space:nowrap">${v}</div></td>`).join("")
      + `<td align="right" valign="middle" style="padding:8px 0 8px 14px;border-bottom:1px solid #f0f3f8">`
      + `<div style="font-family:${F};font-size:8.5px;font-weight:800;line-height:1.2;color:#68737f;letter-spacing:.6px;white-space:nowrap">ON GOAL</div>`
      + `<div style="font-family:${F};font-size:15px;font-weight:800;line-height:1.25;color:${c};white-space:nowrap">${pct}%</div></td>`
      + `</tr>`;
  }).join("");
  return `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:14px 12px 10px">`
    + tbl(`width="100%"`,
      `<tr><td colspan="7" style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.1px;padding:0 0 8px">BY TEAM &mdash; AE-DAYS ON GOAL</td></tr>` + rows)
    + `</td></tr>`;
}

export function renderWeekly(
  days: DayRoll[], teams: WeekTeam[],
  opts: {
    rangeLabel: string; boardUrl?: string;
    dialSrc?: Partial<Record<DialSpec["key"], string>>;
    photos?: { logos?: Record<string, string> };
    teamLogoPx?: number;
    band?: keyof typeof BANDS;
  },
): Weekly {
  const band = BANDS[opts.band || "stone"];
  const live = days.filter((d) => !d.partial);
  const dials = weekDials(days);
  const hit = live.reduce((t, d) => t + d.onGoal, 0);
  const slots = live.reduce((t, d) => t + d.scored, 0);
  const pct = slots ? Math.round(hit / slots * 100) : 0;
  const shortDays = live.filter((d) => d.out >= ATTENDANCE_FLOOR).length;

  const header = `<tr><td bgcolor="${band.bg}" style="background:${band.bg};border:1px solid ${band.line};padding:18px 16px 16px">`
    + tbl(`width="100%"`,
      `<tr><td valign="top" width="100%" style="width:100%">`
      + `<div style="font-family:${F};font-size:11px;font-weight:700;line-height:1.2;color:${MUT};letter-spacing:1.3px">WEEK IN REVIEW</div>`
      + `<div style="font-family:${F};font-size:21px;font-weight:800;line-height:1.2;color:${INK};letter-spacing:-.3px;padding-top:4px">${esc(opts.rangeLabel)}</div>`
      + `<div style="font-family:${F};font-size:11.5px;font-weight:400;line-height:1.5;color:#6f7d8c;padding-top:3px">`
      + `${live.length} business ${live.length === 1 ? "day" : "days"}`
      + (shortDays ? ` &middot; ${shortDays} short-handed` : "")
      + `</div></td>`
      + `<td align="right" valign="top" style="padding-left:12px">`
      + `<div style="font-family:${F};font-size:8.5px;font-weight:800;line-height:1.2;color:#68737f;letter-spacing:.7px;white-space:nowrap">AE-DAYS ON GOAL</div>`
      + `<div style="font-family:${F};font-size:26px;font-weight:800;line-height:1.15;color:${tone(pct)};white-space:nowrap">${pct}%</div>`
      + `<div style="font-family:${F};font-size:11px;font-weight:600;line-height:1.3;color:${MUT};white-space:nowrap">${n(hit)} of ${n(slots)}</div>`
      + `</td></tr>`)
    + `<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>`
    + bar(pct, tone(pct), "100%", 8)
    + `</td></tr>`;

  const note = shortDays
    ? `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:10px 14px 12px;`
      + `font-family:${F};font-size:11px;font-weight:400;line-height:1.55;color:#5f6b7a">`
      + `Goals held at ${DIAL_GOALS.subs}/${DIAL_GOALS.docCheck}/${DIAL_GOALS.uw}/${DIAL_GOALS.tix} every day. `
      + `On the ${shortDays} ${shortDays === 1 ? "day" : "days"} with ${ATTENDANCE_FLOOR} or more people out, the mark on each ring &mdash; `
      + `and the shading in the grid &mdash; marks a full day&rsquo;s work for the people who were actually here.`
      + `</td></tr>`
    : "";

  const footer = `<tr><td style="padding:16px 4px 0;font-family:${F};font-size:11px;font-weight:400;line-height:1.6;color:#8a94a4">`
    + (opts.boardUrl ? `<a href="${esc(opts.boardUrl)}" style="color:${GRN};font-weight:700;text-decoration:none">Open the board</a> &nbsp;&middot;&nbsp; ` : "")
    + `Week-to-date is built from one day-close record per business day, so these numbers cannot drift from what the daily emails said.`
    + `</td></tr>`;

  const inner = header
    + dialsBlock(dials, band, opts.dialSrc)
    + gridBlock(days, band)
    + note
    + teamBlock(teams, band, opts.photos?.logos || {}, opts.teamLogoPx || 44)
    + footer;

  const subject = `Week in Review ${opts.rangeLabel} — ${dials.map((d) => d.value).join("/")} — ${pct}% of AE-days on goal`;
  const preheader = `${n(hit)} of ${n(slots)} AE-days on goal · SUBS ${dials[0].value} · DOC ${dials[1].value} · UW ${dials[2].value} · TIX ${dials[3].value}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<style>@media only screen and (max-width:620px){`
    + `.mdrop{display:none !important;width:0 !important;max-width:0 !important;padding:0 !important;`
    + `font-size:0 !important;line-height:0 !important;overflow:hidden !important}`
    + `.mlogo{width:44px !important}`
    + `.mlogo img{width:38px !important;height:38px !important}`
    + `}</style>`
    + `<title>${esc(opts.rangeLabel)} week in review</title></head>`
    + `<body style="margin:0;padding:0;background:${PAGE}">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>`
    + tbl(`width="100%" bgcolor="${PAGE}" style="background:${PAGE}"`,
      `<tr><td align="center" style="padding:18px 12px 26px">`
      + tbl(`width="100%" style="width:100%;max-width:${PAGE_W}px"`, inner) + `</td></tr>`)
    + `</body></html>`;

  return { subject, preheader, html };
}
