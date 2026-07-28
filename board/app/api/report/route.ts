import { NextRequest, NextResponse } from "next/server";
import { fetchReport, reportCsv } from "@/lib/report";
import { pinToken, AUTH_COOKIE } from "@/lib/pin";
import type { Channel } from "@/lib/board";

export const dynamic = "force-dynamic";

// GET /api/report?range=wtd|mtd|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
//                &channel=wholesale&by=ae|team|both&format=csv|json
//                [&key=REPORT_KEY]   ← for scheduled/automated pulls
//
// Auth: the board's PIN cookie (normal browser use after /unlock), or
// ?key= matching the REPORT_KEY env var (for cron/email automation).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const pin = process.env.BOARD_PIN;
  if (pin) {
    const cookie = req.cookies.get(AUTH_COOKIE)?.value;
    const okCookie = cookie && cookie === (await pinToken(pin));
    const okKey = process.env.REPORT_KEY && q.get("key") === process.env.REPORT_KEY;
    if (!okCookie && !okKey) return new NextResponse("unauthorized", { status: 401 });
  }

  const range = q.get("range") || "wtd";
  const channel = (q.get("channel") || "wholesale") as Channel;
  const by = (q.get("by") || "both") as "ae" | "team" | "both";
  const format = q.get("format") || "csv";

  try {
    const rep = await fetchReport(range, channel, q.get("from") || undefined, q.get("to") || undefined);
    if (format === "json") return NextResponse.json(rep);
    const name = `activity_${channel}_${rep.from}_${rep.to}.csv`;
    return new NextResponse(reportCsv(rep, by), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (e: any) {
    return new NextResponse("report error: " + (e?.message || String(e)), { status: 500 });
  }
}
