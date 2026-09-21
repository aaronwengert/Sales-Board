import { NextRequest, NextResponse } from "next/server";
import { rollRange, businessDays, defaultWeek, rangeLabel } from "@/lib/rollup";
import { renderWeekly, weekDials } from "@/lib/weekly";
import { dialSvg, dialDataUri } from "@/lib/dial";
import { teamLogoSrcs, TEAM_LOGOS, teamLogoCid } from "@/lib/teamLogos";
import { BANDS } from "@/lib/digest";
import { pinToken, AUTH_COOKIE } from "@/lib/pin";
import type { Channel } from "@/lib/board";

export const dynamic = "force-dynamic";
// Replaying five days means five production files off Drive. They are fetched
// in parallel, but this is still an order of magnitude slower than painting the
// live board, and it is a once-a-week job rather than a per-request one.
export const maxDuration = 60;

// GET /api/weekly?channel=wholesale[&format=json][&from=YYYY-MM-DD&to=YYYY-MM-DD]
//
// Defaults to the most recently COMPLETED Monday–Friday. Run on a Friday
// evening that is the week just worked; run over a weekend it is still that
// week, which is what makes a Saturday or Monday send say the same thing as a
// Friday one.

function azParts() {
  const now = new Date();
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", ...o }).format(now);
  return { day: f({ year: "numeric", month: "2-digit", day: "2-digit" }) };
}


export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const pin = process.env.BOARD_PIN;
  if (pin) {
    const cookie = req.cookies.get(AUTH_COOKIE)?.value;
    const okCookie = cookie && cookie === (await pinToken(pin));
    const okKey = process.env.REPORT_KEY && q.get("key") === process.env.REPORT_KEY;
    if (!okCookie && !okKey) return new NextResponse("unauthorized", { status: 401 });
  }

  const channel = (q.get("channel") || "wholesale") as Channel;
  const asJson = q.get("format") === "json";
  const def = defaultWeek(azParts().day);
  const from = q.get("from") || def.from;
  const to = q.get("to") || def.to;

  try {
    const { days, teams } = await rollRange(from, to, channel);
    if (!days.length) {
      return NextResponse.json(
        { ok: false, error: "no-days", detail: `No production snapshots found for ${from}..${to}`, asked: businessDays(from, to) },
        { status: 503 });
    }

    const dials = weekDials(days);
    const dialSrc: Record<string, string> = {};
    for (const d of dials) dialSrc[d.key] = asJson ? `cid:dial-${d.key}` : dialDataUri(d);

    const weekly = renderWeekly(days, teams, {
      rangeLabel: rangeLabel(from, to),
      boardUrl: channel === "wholesale" ? req.nextUrl.origin : `${req.nextUrl.origin}/${channel}`,
      dialSrc,
      photos: { logos: teamLogoSrcs(asJson ? "cid" : "data") },
    });

    if (asJson) {
      return NextResponse.json({
        ok: true,
        subject: weekly.subject, preheader: weekly.preheader, html: weekly.html,
        from, to,
        dials: dials.map((d) => ({
          cid: `dial-${d.key}`, key: d.key, label: d.label, value: d.value, goal: d.goal,
          pct: d.pct, pending: false, unit: d.unit, color: d.color, track: d.track,
          bg: BANDS.stone.bg, svg: dialSvg(d),
        })),
        logos: TEAM_LOGOS.map((l) => ({ cid: teamLogoCid(l.slug), team: l.team, slug: l.slug, png: l.b64 })),
        // The days actually replayed, so a caller can see at a glance that a
        // feed was missing rather than that the team had a quiet Tuesday.
        days: days.map((d) => ({ date: d.date, dow: d.dow, partial: !!d.partial, out: d.out, onGoal: d.onGoal, scored: d.scored })),
      });
    }
    return new NextResponse(weekly.html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (e: any) {
    return new NextResponse("weekly error: " + (e?.message || String(e)), { status: 500 });
  }
}
