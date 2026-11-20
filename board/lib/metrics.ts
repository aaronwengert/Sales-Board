import type { BoardData } from "./board";

/*
 * Today's four daily-goal numbers per AE, for Mission Control's "My metrics"
 * band (projections app). Served by /api/metrics; see that route for the
 * contract and the key.
 *
 * Built from the same BoardData the TV board renders, so the two can never
 * disagree: calls and talk minutes from the "Users Summary" call report,
 * scenarios from the tickets export, submissions from loans opened today on
 * the production file. Goals are the board's own (lib/client.ts).
 */

export const GOALS = { calls: 75, talk: 90, scenarios: 3, subs: 1 } as const;

export type MetricsPerson = {
  calls: number;
  /** Minutes, inbound + outbound, as the board counts it. */
  talk: number;
  scenarios: number;
  subs: number;
  /** Marked out of office today. */
  ooo: boolean;
};

export type MetricsFeed = {
  /** Arizona business day the numbers are for, YYYY-MM-DD. */
  date: string;
  channel: string;
  goals: typeof GOALS;
  /** "3:30 PM MST" — when the call report the calls and talk time came from landed. */
  callsAsOf: string;
  /** "3:41 PM MST" — when the production file landed (submissions). */
  updatedAsOf: string;
  /** True until today's first call report is in: calls/talk are then 0, not yesterday's. */
  callsPending: boolean;
  /** True until today's tickets file with rows is in. */
  scenariosPending: boolean;
  /** Keyed by the board's display name. Every AE with a row on the board. */
  people: Record<string, MetricsPerson>;
};

export function metricsFeed(b: BoardData, date: string): MetricsFeed {
  const ooo = new Set(b.oooAEs.map((n) => n.toLowerCase()));
  const people: Record<string, MetricsPerson> = {};
  for (const row of b.rows) {
    const name = row[0];
    if (name in people) continue;
    // Former AEs only appear for the month they funded; no daily goal.
    if (/ · former$/.test(row[1] || "")) continue;
    const t = b.today[name] || [0, 0, 0];
    people[name] = {
      // A call report from yesterday is not today's calls: the board shows a
      // dash then, and so do these (as zero, with callsPending set).
      calls: b.callsPending ? 0 : t[0] || 0,
      talk: b.callsPending ? 0 : t[1] || 0,
      scenarios: b.tixPending ? 0 : b.tix[name] || 0,
      subs: t[2] || 0,
      ooo: ooo.has(name.toLowerCase()),
    };
  }
  return {
    date,
    channel: b.channel,
    goals: GOALS,
    callsAsOf: b.callsUpdatedLabel,
    updatedAsOf: b.updatedLabel,
    callsPending: b.callsPending,
    scenariosPending: b.tixPending,
    people,
  };
}
