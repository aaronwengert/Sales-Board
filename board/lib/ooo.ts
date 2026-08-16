// Out-of-office store.
//
// One small JSON document holding every absence anyone has entered. It lives in
// Vercel Blob, which needs no schema and no server: create a Blob store in the
// Vercel dashboard, link it to this project, and Vercel injects
// BLOB_READ_WRITE_TOKEN automatically. Nothing else to configure.
//
// Every read and write is wrapped so a storage problem can never take the board
// down — a failure resolves to "nobody is out", which is the safe default.

export type OOOEntry = {
  name: string;          // AE display name, spelled as the roster spells it
  start: string;         // YYYY-MM-DD, Arizona day
  end: string;           // YYYY-MM-DD, inclusive; equals start for a single day
  note?: string;
  by?: string;           // who entered it, for the audit line
  at?: string;           // ISO timestamp of when it was entered
};

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const PATHNAME = "board/ooo.json";
const API = "https://blob.vercel-storage.com";

export function storeConfigured() { return Boolean(TOKEN); }

/** Resolved public URL of the blob, cached per lambda to save a round trip. */
let cachedUrl = "";

async function resolveUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;
  const res = await fetch(`${API}/?prefix=${encodeURIComponent(PATHNAME)}&limit=1`, {
    headers: { authorization: `Bearer ${TOKEN}`, "x-api-version": "7" },
    cache: "no-store",
  });
  if (!res.ok) return "";
  const j: any = await res.json();
  cachedUrl = j?.blobs?.[0]?.url || "";
  return cachedUrl;
}

/** Every stored entry, newest first. Returns [] if the store is empty or down. */
export async function readEntries(): Promise<OOOEntry[]> {
  if (!TOKEN) return [];
  try {
    const url = await resolveUrl();
    if (!url) return [];
    // Cache-buster: the blob CDN would otherwise serve a stale copy for a while,
    // and an absence entered this morning needs to land on the next refresh.
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const j: any = await res.json();
    return Array.isArray(j) ? j.filter(valid) : [];
  } catch {
    return [];
  }
}

/** Replace the whole document. Returns false if the write did not land. */
export async function writeEntries(entries: OOOEntry[]): Promise<boolean> {
  if (!TOKEN) return false;
  try {
    const res = await fetch(`${API}/${PATHNAME}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "x-api-version": "7",
        "x-content-type": "application/json",
        "x-add-random-suffix": "0",
        "x-cache-control-max-age": "0",
      },
      body: JSON.stringify(entries.filter(valid)),
    });
    if (!res.ok) return false;
    const j: any = await res.json();
    if (j?.url) cachedUrl = j.url;
    return true;
  } catch {
    return false;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function valid(e: any): e is OOOEntry {
  return Boolean(e && typeof e.name === "string" && e.name.trim()
    && typeof e.start === "string" && DATE_RE.test(e.start)
    && typeof e.end === "string" && DATE_RE.test(e.end)
    && e.end >= e.start);
}

/** Today in Arizona as YYYY-MM-DD — the business day the board runs on. */
export function azToday(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" }));
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Names covering a given day. Plain string compare works on YYYY-MM-DD. */
export function namesOn(entries: OOOEntry[], day: string): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (const e of entries) {
    if (day < e.start || day > e.end) continue;
    const k = e.name.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e.name.trim());
  }
  return out;
}

/** Drop absences that ended more than 60 days ago, so the file stays small. */
export function prune(entries: OOOEntry[], today: string): OOOEntry[] {
  const cut = new Date(today + "T00:00:00");
  cut.setDate(cut.getDate() - 60);
  const cutStr = cut.toISOString().slice(0, 10);
  return entries.filter((e) => e.end >= cutStr);
}
