import { NextResponse } from "next/server";
import { readEmailCfg, writeEmailCfg, storeConfigured, addrs } from "@/lib/emailcfg";

export const dynamic = "force-dynamic";

// Behind the same PIN gate as the rest of the board (see middleware.ts), so
// anyone who can open /email can post to it.

export async function GET() {
  const cfg = await readEmailCfg();
  return NextResponse.json({ ok: true, configured: storeConfigured(), ...cfg });
}

export async function POST(req: Request) {
  if (!storeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "No Blob store connected. Create one in Vercel and link it to this project." },
      { status: 503 },
    );
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }

  const daily = addrs(body?.daily?.to);
  const weekly = addrs(body?.weekly?.to);
  if ((body?.daily?.to?.length || 0) > 0 && daily.length === 0) {
    return NextResponse.json({ ok: false, error: "None of those look like email addresses" }, { status: 400 });
  }
  if (daily.length > 100 || weekly.length > 100) {
    return NextResponse.json({ ok: false, error: "Too many addresses" }, { status: 400 });
  }

  const hours = Array.isArray(body?.daily?.hours) ? body.daily.hours : [];
  if (!hours.every((h: any) => Number.isInteger(h) && h >= 0 && h <= 23)) {
    return NextResponse.json({ ok: false, error: "Bad hour" }, { status: 400 });
  }

  // `last` is the board's own record of what the mailer collected, not
  // something the screen gets to rewrite.
  const cur = await readEmailCfg();
  const next = {
    daily: { to: daily, hours },
    weekly: { to: weekly },
    last: cur.last,
    by: String(body?.by || "").slice(0, 60) || undefined,
    at: new Date().toISOString(),
  };
  if (!(await writeEmailCfg(next))) {
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...next });
}
