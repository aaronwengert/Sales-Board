import { NextResponse } from "next/server";
import { readEntries, writeEntries, prune, azToday, storeConfigured, type OOOEntry } from "@/lib/ooo";
import { rosterByTeam } from "@/lib/board";

export const dynamic = "force-dynamic";

// This route sits behind the same PIN gate as the rest of the board (see
// middleware.ts), so anyone who can open /ooo can post to it.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Stable identity for an absence, so the UI can remove exactly one row. */
function entryId(e: OOOEntry) { return `${e.name}|${e.start}|${e.end}`; }

/** Every name that may legitimately be marked out, across all three channels. */
function allowedNames(): Map<string, string> {
  const m = new Map<string, string>();
  for (const ch of ["wholesale", "retail", "correspondent"] as const) {
    for (const g of rosterByTeam(ch)) for (const n of g.aes) m.set(n.toLowerCase(), n);
  }
  return m;
}

export async function GET() {
  const entries = await readEntries();
  return NextResponse.json({ ok: true, configured: storeConfigured(), today: azToday(), entries });
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

  const today = azToday();
  const allowed = allowedNames();
  const current = await readEntries();

  if (body?.action === "remove") {
    const id = String(body.id || "");
    const next = current.filter((e) => entryId(e) !== id);
    if (!(await writeEntries(prune(next, today)))) return NextResponse.json({ ok: false, error: "Could not save" }, { status: 502 });
    return NextResponse.json({ ok: true, entries: prune(next, today) });
  }

  // add
  const name = allowed.get(String(body?.name || "").trim().toLowerCase());
  const start = String(body?.start || "");
  const end = String(body?.end || "") || start;
  if (!name) return NextResponse.json({ ok: false, error: "Pick a name from the list" }, { status: 400 });
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) return NextResponse.json({ ok: false, error: "Pick a date" }, { status: 400 });
  if (end < start) return NextResponse.json({ ok: false, error: "The end date is before the start date" }, { status: 400 });

  const entry: OOOEntry = {
    name, start, end,
    note: String(body?.note || "").slice(0, 80) || undefined,
    by: String(body?.by || "").slice(0, 60) || undefined,
    at: new Date().toISOString(),
  };
  // Replace any existing entry for the same person over the same span rather
  // than stacking duplicates when someone taps twice.
  const next = current.filter((e) => !(e.name.toLowerCase() === name.toLowerCase() && e.start === start && e.end === end));
  next.push(entry);
  next.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));

  if (!(await writeEntries(prune(next, today)))) return NextResponse.json({ ok: false, error: "Could not save" }, { status: 502 });
  return NextResponse.json({ ok: true, entries: prune(next, today) });
}
