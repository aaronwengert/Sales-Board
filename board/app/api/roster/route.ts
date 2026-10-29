import { NextResponse } from "next/server";
import { readTitles, writeTitles, storeConfigured, type Title } from "@/lib/titles";
import { rosterByTeam } from "@/lib/board";

export const dynamic = "force-dynamic";

// This route sits behind the same PIN gate as the rest of the board (see
// middleware.ts), so anyone who can open /roster can post to it.

/** Every name that may legitimately hold a rank, across all three channels,
 *  mapped from a loose key to the roster's own spelling. Anything else is
 *  dropped: a name that is not on the roster can never draw a badge, so
 *  storing one would only leave a confusing entry behind. */
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

function asTitle(v: any): Title | null {
  return v === "SR" || v === "AVP" ? v : null;
}

export async function GET() {
  const doc = await readTitles();
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
  if (!body?.titles || typeof body.titles !== "object" || Array.isArray(body.titles)) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  const given = Object.entries(body.titles as Record<string, unknown>);
  if (given.length > 400) {
    return NextResponse.json({ ok: false, error: "Too many names" }, { status: 400 });
  }

  // Canonicalise to roster spelling and drop anything unrecognised, so the
  // stored document can only ever name people the board actually draws and
  // can only ever hold a rank the board knows how to render. A name sent
  // twice under different spellings keeps the first rank seen rather than
  // letting the later one win silently.
  const allowed = allowedNames();
  const titles: Record<string, Title> = {};
  for (const [rawName, rawTitle] of given) {
    const name = allowed.get(key(String(rawName || "")));
    const title = asTitle(rawTitle);
    if (!name || !title || titles[name]) continue;
    titles[name] = title;
  }

  const doc = {
    titles,
    by: String(body?.by || "").slice(0, 60) || undefined,
    at: new Date().toISOString(),
  };
  if (!(await writeTitles(doc))) {
    return NextResponse.json({ ok: false, error: "Could not save" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...doc });
}
