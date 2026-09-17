import { NextRequest, NextResponse } from "next/server";
import { getBoard } from "@/lib/fetch";
import { renderDigest, dialSpecs, paceFraction } from "@/lib/digest";
import { dialSvg, dialDataUri, DIAL_BG } from "@/lib/dial";
import { pinToken, AUTH_COOKIE } from "@/lib/pin";
import type { Channel } from "@/lib/board";

export const dynamic = "force-dynamic";

// GET /api/digest?channel=wholesale[&format=json][&at=3:00 PM][&key=REPORT_KEY]
//
// Renders the daily-goal email from the same board data the screens use. Open
// it in a browser to preview exactly what would be sent; fetch it with
// ?format=json to get {subject, preheader, html} for a mailer to send.
//
// Auth: the board's PIN cookie (a browser that has already unlocked), or
// ?key= matching REPORT_KEY — the same pair /api/report accepts.

function azParts() {
  const now = new Date();
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", ...o }).format(now);
  return {
    send: f({ hour: "numeric", minute: "2-digit", hour12: true }),
    date: f({ weekday: "long", month: "short", day: "numeric" }),
    hour: Number(f({ hour: "numeric", hour12: false })),
    minute: Number(f({ minute: "numeric" })),
    dow: new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", weekday: "short" }).format(now),
  };
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
  const az = azParts();

  try {
    const board = await getBoard(channel);
    if ((board as any).error) {
      return NextResponse.json({ ok: false, error: (board as any).error }, { status: 503 });
    }
    const origin = req.nextUrl.origin;
    const asJson = q.get("format") === "json";

    // The dials are images. A browser preview can take the SVG straight as a
    // data: URI; a real send needs raster parts, so JSON hands the mailer the
    // SVG per dial and points the HTML at the cid: it will attach them under.
    // Colour is judged against how much of the selling day has gone, so the
    // 10am send is not uniformly red for the crime of being the 10am send.
    const pace = paceFraction(az.hour, az.minute);
    const dials = dialSpecs(board, pace);
    const dialSrc: Record<string, string> = {};
    for (const d of dials) dialSrc[d.key] = asJson ? `cid:dial-${d.key}` : dialDataUri(d);

    const digest = renderDigest(board, {
      sendLabel: q.get("at") || az.send,
      dateLabel: az.date,
      boardUrl: channel === "wholesale" ? origin : `${origin}/${channel}`,
      dialSrc, pace,
    });

    if (asJson) {
      // `skip` lets a caller decline to send without having to know the
      // calendar: weekends have no activity and nobody is watching.
      const weekend = az.dow === "Sat" || az.dow === "Sun";
      return NextResponse.json({
        ok: true, skip: weekend, reason: weekend ? "weekend" : null,
        subject: digest.subject, preheader: digest.preheader, html: digest.html,
        // Attach each of these inline with Content-ID <dial-KEY>; the HTML
        // already references cid:dial-KEY. Rasterise to PNG at 224x224 if the
        // mailer can, but SVG parts are fine for clients that take them.
        dials: dials.map((d) => ({
          cid: `dial-${d.key}`, key: d.key, label: d.label,
          value: d.value, goal: d.goal, pct: d.pct, pending: d.pending,
          unit: d.unit, color: d.color, track: d.track, bg: DIAL_BG, svg: dialSvg(d),
        })),
        callsPending: board.callsPending, tixPending: board.tixPending,
        updatedLabel: board.updatedLabel, callsUpdatedLabel: board.callsUpdatedLabel,
      });
    }
    return new NextResponse(digest.html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (e: any) {
    return new NextResponse("digest error: " + (e?.message || String(e)), { status: 500 });
  }
}
