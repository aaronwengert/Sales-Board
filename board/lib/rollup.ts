// Replaying a past day.
//
// The board is a live thing: it reads the newest file in each Drive folder and
// tells you about right now. Week-to-date needs the opposite — what did the
// board say at the close of business on Tuesday — and the archive makes that
// answerable, because every one of those folders keeps its history rather than
// overwriting a single file.
//
//   production   hourly, 06:00–17:00 Arizona. The 17:00 file is the day's last
//                word, so that is the one a replay uses.
//   calls        every 30 minutes, ACCUMULATING through the day and resetting
//                overnight — so the last file of a day holds that whole day.
//   tickets      same shape as calls.
//
// Accuracy, stated plainly: subs replay exactly, because Opened Date is a
// permanent field. Calls, talk and tickets replay exactly, because the last
// snapshot of a day is that day's total. Doc check and underwriting replay as
// well as the 5pm board did and no better — the production export carries a
// loan's CURRENT status and the date it reached it, not a history, so a file
// that touched doc check at 9am and moved to underwriting by 4pm is only ever
// counted once, in underwriting. That is the same number the daily email
// printed that evening, which is the thing week-to-date has to agree with.

import { computeBoard, type BoardData, type Channel } from "./board";
import { digestTeams } from "./digest";
import type { DayRoll, WeekTeam, WeekAE } from "./weekly";
import { readEntries, namesOn } from "./ooo";
import { listAllCsvs, driveDownload, FOLDERS } from "./fetch";

type DFile = { id: string; name: string; modifiedTime: string };

/** The Arizona calendar day an ISO timestamp falls on. */
export function azDay(iso: string): string {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", ...o }).format(d);
  return f({ year: "numeric", month: "2-digit", day: "2-digit" });
}

/** Midday Arizona on a YYYY-MM-DD, as the Date computeBoard's replay clock
 *  wants. Midday rather than midnight so no rounding can tip it into a
 *  neighbouring day. */
export function azNoon(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Business days from `from` to `to` inclusive, Arizona, weekends dropped. */
export function businessDays(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = azNoon(from), end = azNoon(to);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** The last file of each requested day, keyed by day.
 *
 *  Pure, because this is where a replay silently goes wrong: pick the 06:00
 *  file instead of the 17:00 one and the day reads near-empty, with nothing
 *  anywhere to say so. Given a list sorted newest-first, the FIRST file seen
 *  for a day is that day's last. */
export function lastPerDay(files: DFile[], days: string[]): Record<string, DFile> {
  const want = new Set(days);
  const out: Record<string, DFile> = {};
  for (const f of files) {
    if (!f.modifiedTime) continue;
    const d = azDay(f.modifiedTime);
    if (!want.has(d) || out[d]) continue;
    out[d] = f;
  }
  return out;
}

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One replayed day, from files already in hand. Split out from the Drive I/O
 *  so it can be exercised against fixtures. */
export function rollFromCsvs(
  day: string, prodCsv: string, callsCsv: string | null, tixCsv: string | null,
  oooNames: string[], channel: Channel,
): { roll: DayRoll; teams: WeekTeam[]; board: BoardData } {
  const asOf = azNoon(day);
  const b = computeBoard(
    prodCsv, callsCsv, true, "replay", "replay", channel, tixCsv, true, oooNames, { asOf },
  );
  const { teams, hit, total } = digestTeams(b);
  const everyone = [...teams.flatMap((g) => g.aes), ...teams.flatMap((g) => g.hidden)];
  const roll: DayRoll = {
    date: day,
    dow: DOW[asOf.getDay()],
    subs: b.kpi.subsToday ?? 0,
    doc: b.kpi.docCheckToday ?? 0,
    uw: b.kpi.uwToday ?? 0,
    tix: b.tixTotal ?? 0,
    calls: everyone.reduce((t, a) => t + a.calls, 0),
    talk: everyone.reduce((t, a) => t + a.talk, 0),
    onGoal: hit,
    scored: total,
    out: oooNames.length,
    roster: b.rows.length,
    // A day whose calls or tickets file never landed is marked rather than
    // printed as a real zero — a quiet 0 in the grid would read as a team that
    // did nothing, which is a worse lie than a dash.
    partial: !callsCsv || !tixCsv,
  };
  // Per-person numbers come straight off the board rows rather than out of
  // digestTeams, which folds managers and anyone out of office into an
  // anonymous bucket. A week card has to name them: their production still
  // counts toward the team even on a day they were not being scored.
  const scoredToday = new Map<string, boolean>();
  const exemptToday = new Set<string>();
  for (const g of teams) for (const a of g.aes) {
    if (a.exempt) exemptToday.add(a.name); else scoredToday.set(a.name, a.met);
  }
  const teamOf = (raw: string) => (raw || "").replace(/\s*·.*$/, "").trim() || "Unassigned";
  const perAE = new Map<string, WeekAE>();
  for (const r of b.rows) {
    const name = r[0];
    const td = b.today[name] || [0, 0, 0];
    const st = b.stage?.[name] || [0, 0];
    const scored = scoredToday.has(name);
    perAE.set(name, {
      name, team: teamOf(r[1]),
      calls: td[0], talk: Math.round(td[1]), tix: b.tix[name] || 0, subs: td[2],
      doc: st[0], uw: st[1],
      daysHit: scored && scoredToday.get(name) ? 1 : 0,
      daysScored: scored ? 1 : 0,
      exempt: exemptToday.has(name),
    });
  }

  const wt: WeekTeam[] = teams.map((g) => {
    const all = [...g.aes, ...g.hidden];
    const sum = (f: (a: { calls: number; talk: number; tix: number; subs: number; doc: number; uw: number }) => number) =>
      all.reduce((t, a) => t + f(a), 0);
    return {
      team: g.team, manager: g.manager,
      calls: sum((a) => a.calls), talk: sum((a) => a.talk), tix: sum((a) => a.tix),
      subs: sum((a) => a.subs), doc: sum((a) => a.doc), uw: sum((a) => a.uw),
      onGoal: g.hit, slots: g.n, pipe: g.pipe,
      aes: [...perAE.values()].filter((a) => a.team === g.team),
    };
  });
  return { roll, teams: wt, board: b };
}

/** Add a day's team numbers into a running week. */
export function mergeTeams(week: WeekTeam[], day: WeekTeam[]): WeekTeam[] {
  const by = new Map(week.map((t) => [t.team, { ...t }]));
  for (const d of day) {
    const cur = by.get(d.team);
    if (!cur) { by.set(d.team, { ...d }); continue; }
    cur.calls += d.calls; cur.talk += d.talk; cur.tix += d.tix;
    cur.subs += d.subs; cur.doc += d.doc; cur.uw += d.uw;
    cur.onGoal += d.onGoal; cur.slots += d.slots;
    // Per-person totals accumulate the same way the team's do; a name seen for
    // the first time on Wednesday simply joins from Wednesday.
    const byName = new Map(cur.aes.map((a) => [a.name, { ...a }]));
    for (const a of d.aes) {
      const prev = byName.get(a.name);
      if (!prev) { byName.set(a.name, { ...a }); continue; }
      prev.calls += a.calls; prev.talk += a.talk; prev.tix += a.tix;
      prev.subs += a.subs; prev.doc += a.doc; prev.uw += a.uw;
      prev.daysHit += a.daysHit; prev.daysScored += a.daysScored;
      prev.exempt = prev.exempt || a.exempt;
    }
    cur.aes = [...byName.values()];
    // Pipeline is a level, not a flow: the week carries the latest reading
    // rather than five days of it added together.
    cur.pipe = d.pipe;
    cur.manager = d.manager || cur.manager;
  }
  return [...by.values()];
}

/** Replay a range of business days straight from Drive.
 *
 *  Downloads run in parallel per day-kind because the serverless budget is
 *  wall-clock, not CPU: five production files fetched one after another is the
 *  difference between comfortably inside the limit and timing out. */
export async function rollRange(from: string, to: string, channel: Channel = "wholesale"): Promise<{ days: DayRoll[]; teams: WeekTeam[] }> {
  const days = businessDays(from, to);
  if (!days.length) return { days: [], teams: [] };

  const [prodFiles, callFiles, tixFiles, oooEntries] = await Promise.all([
    listAllCsvs(FOLDERS.prod),
    listAllCsvs(FOLDERS.calls),
    listAllCsvs(FOLDERS.tickets),
    readEntries().catch(() => []),
  ]);

  // The production folder holds two report shapes; only the Sales Board export
  // carries the header the parser needs, so the other is skipped before the
  // per-day pick rather than after, where it would shadow a good file.
  const prodByDay = lastPerDay(prodFiles.filter((f) => /Sales Board/i.test(f.name)), days);
  const callsByDay = lastPerDay(callFiles, days);
  const tixByDay = lastPerDay(tixFiles, days);

  const fetched = await Promise.all(days.map(async (day) => {
    const [prod, calls, tix] = await Promise.all([
      prodByDay[day] ? driveDownload(prodByDay[day].id) : Promise.resolve(""),
      callsByDay[day] ? driveDownload(callsByDay[day].id).catch(() => null) : Promise.resolve(null),
      tixByDay[day] ? driveDownload(tixByDay[day].id).catch(() => null) : Promise.resolve(null),
    ]);
    return { day, prod, calls, tix };
  }));

  const out: DayRoll[] = [];
  let teams: WeekTeam[] = [];
  for (const f of fetched) {
    // No production file means the day cannot be replayed at all. It is left
    // out entirely rather than pushed in as zeros, so the week's goal shrinks
    // with it and the percentages stay honest.
    if (!f.prod) continue;
    const ooo = namesOn(oooEntries, f.day);
    const { roll, teams: dayTeams } = rollFromCsvs(f.day, f.prod, f.calls, f.tix, ooo, channel);
    out.push(roll);
    teams = mergeTeams(teams, dayTeams);
  }
  return { days: out, teams };
}

/** The Monday–Friday a weekly report covers.
 *
 *  Monday through Friday it is the week in progress, so a mid-week run reports
 *  what has happened so far. Saturday and Sunday it is the week that just
 *  ended, because a weekend send is about the week behind, not the one that has
 *  not started yet. Lives here rather than beside the route because Next.js
 *  only lets a route file export handlers, and this wants a test.
 */
export function defaultWeek(today: string): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  const t = new Date(y, m - 1, d, 12);
  const dow = t.getDay();
  const back = dow === 0 ? 6 : dow === 6 ? 5 : dow - 1;
  const mon = new Date(t); mon.setDate(mon.getDate() - back);
  const fri = new Date(mon); fri.setDate(fri.getDate() + 4);
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { from: fmt(mon), to: fmt(fri) };
}

/** Shift a Monday–Friday range back one week.
 *
 *  This exists for the Monday-morning send. `defaultWeek` treats Monday as the
 *  first day of the week in progress, which is right for a mid-week look at
 *  the board and exactly wrong for a recap: a 7am Monday run would report the
 *  week that started ninety minutes ago and find nothing in it. A Friday-night
 *  send wants the default; a Monday-morning send wants this.
 */
export function previousWeek(w: { from: string; to: string }): { from: string; to: string } {
  const back = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const x = new Date(y, m - 1, d, 12);
    x.setDate(x.getDate() - 7);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  return { from: back(w.from), to: back(w.to) };
}

/** "Sep 14 – 18", or "Sep 28 – Oct 2" across a month boundary. */
export function rangeLabel(from: string, to: string): string {
  const mk = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const a = mk(from), b = mk(to);
  const mon = (x: Date) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(x);
  return mon(a) === mon(b)
    ? `${mon(a)} ${a.getDate()} \u2013 ${b.getDate()}`
    : `${mon(a)} ${a.getDate()} \u2013 ${mon(b)} ${b.getDate()}`;
}
