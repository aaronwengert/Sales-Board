import { NextRequest, NextResponse } from "next/server";
import { getBoard } from "@/lib/fetch";
import { azToday } from "@/lib/ooo";
import { metricsFeed } from "@/lib/metrics";
import type { Channel } from "@/lib/board";

export const dynamic = "force-dynamic";

/*
 * GET /api/metrics[?channel=wholesale]      header: x-api-key: <METRICS_KEY>
 *   → { date, channel, goals, callsAsOf, updatedAsOf, callsPending,
 *       scenariosPending, people: { "Andrew Nwaoko": { calls, talk,
 *       scenarios, subs, ooo }, … } }
 *
 * Feeds Mission Control's "My metrics" band in the projections app — the
 * reverse of /api/ooo there, which this board reads. Same numbers as the TV
 * board, because it is the same getBoard(): see lib/metrics.ts.
 *
 * Auth: METRICS_KEY, sent as x-api-key, set to the same value on both Vercel
 * projects. It is outside the PIN gate (middleware.ts) because a server has no
 * PIN cookie; the key check below is what protects it. With METRICS_KEY unset
 * the route answers 503 rather than serving the floor's numbers to anyone.
 */

const CHANNELS = new Set<Channel>(["wholesale", "retail", "correspondent"]);

/** Constant-time compare, so the key can't be guessed one character at a time. */
function keyMatches(sent: string, expected: string): boolean {
  if (sent.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sent.length; i++) diff |= sent.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  const expected = process.env.METRICS_KEY || "";
  if (!expected) {
    return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
  }
  if (!keyMatches(req.headers.get("x-api-key") || "", expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const asked = (req.nextUrl.searchParams.get("channel") || "wholesale") as Channel;
  const channel: Channel = CHANNELS.has(asked) ? asked : "wholesale";

  const board = await getBoard(channel);
  if (board.error) {
    // "no-credentials", "no-production" or a Drive error. Mission Control
    // shows "not available right now" rather than a row of zeros.
    return NextResponse.json({ ok: false, error: board.error }, { status: 502 });
  }
  return NextResponse.json(
    { ok: true, ...metricsFeed(board, azToday()) },
    { headers: { "cache-control": "no-store" } },
  );
}
