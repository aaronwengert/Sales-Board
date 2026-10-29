import { NextResponse } from "next/server";
import { readSenior, writeSenior, storeConfigured } from "@/lib/senior";
import { rosterByTeam } from "@/lib/board";

export const dynamic = "force-dynamic";

// This route sits behind the same PIN gate as the rest of the board (see
// middleware.ts), so anyone who can open /roster can post to it.

/** Every name that may legitimately be marked senior, across all three
 *  channels, mapped from a loose key to the roster's own spelling. Anything
 *  else is dropped: a name that is not on the roster can never draw a badge,
 *  so storing one would only leave a confusing entry behind. */
function allowedNames(): Map<string, string> {
  const m = new Map<string, string>();
  for (const ch of ["wholesale", "retail", "correspondent"] as const) {
    for (const g of rosterByTeam(ch)) for (const n of g.aes) m.set(key(n), n);
  }
  return m;
}

/** Same normalisation as norm() in board.ts. */
function key(n: string) {
  return (n || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const doc = await readSenior();
  return NextResponse.json({ ok: true, configured: storeConfigured(), ...doc });
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
  if (!Array.isArray(body?.names)) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (body.names.length > 400) {
    return NextResponse.json({ ok: false, error: "Too many names" }, { status: 400 });
  }

  // Canonicalise to roster spelling and drop anything unrecognised, so the
  // stored document can only ever name people the board actually draws.
  const allowed = allowedNames();
  const names: string[] = [], seen = new Set<string>();
  for (const raw of body.names) {
    const hit = allowed.get(key(String(raw || "")));
    if (!hit || seen.has(hit)) continue;
    seen.add(hit);
    names.push(hit);
  }
  names.sort((a, b) => a.localeCompare(b));

  const doc = {
    names,
    by: String(body?.by || "").slice(0, 60) || undefined,
    at: new Date().toISOString(),
  };
  if (!(await writeSenior(doc))) {
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...doc });
}
