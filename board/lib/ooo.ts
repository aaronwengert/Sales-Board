// Out-of-office store.
//
// One small JSON document holding every absence anyone has entered, kept in a
// PRIVATE Vercel Blob store. Setup is a Blob store created in the Vercel
// dashboard and connected to this project; Vercel then injects
// BLOB_READ_WRITE_TOKEN on its own. There is nothing else to configure and no
// schema to maintain.
//
// Every read and write is wrapped so a storage problem can never take the board
// down — a failure resolves to "nobody is out", which is the safe default.

import { put, get } from "@vercel/blob";

export type OOOEntry = {
  name: string;          // AE display name, spelled as the roster spells it
  start: string;         // YYYY-MM-DD, Arizona day
  end: string;           // YYYY-MM-DD, inclusive; equals start for a single day
  note?: string;
  by?: string;           // who entered it, for the audit line
  at?: string;           // ISO timestamp of when it was entered
};

const PATHNAME = "board/ooo.json";

/**
 * Work out how to authenticate to the Blob store.
 *
 * Vercel connects Blob stores two different ways, and which one you get depends
 * on when and how the store was created:
 *
 *   1. Static token — sets BLOB_READ_WRITE_TOKEN (or a prefixed variant such as
 *      SALES_BOARD_OOO_BLOB_READ_WRITE_TOKEN when the account has several stores).
 *   2. OIDC — sets BLOB_STORE_ID, and the runtime injects a short-lived
 *      VERCEL_OIDC_TOKEN on every invocation. That token deliberately does NOT
 *      appear in the Environment Variables list, because it rotates.
 *
 * The SDK reads VERCEL_OIDC_TOKEN by itself, so for the OIDC path all we have to
 * do is pass the store id and stay out of the way.
 */
type BlobAuth = { token: string } | { storeId: string };

function staticToken(): string {
  const direct = process.env.BLOB_READ_WRITE_TOKEN;
  if (direct) return direct;
  for (const [k, v] of Object.entries(process.env)) {
    if (v && k.endsWith("BLOB_READ_WRITE_TOKEN")) return v;
  }
  return "";
}

function blobAuth(): BlobAuth | null {
  const token = staticToken();
  if (token) return { token };
  const storeId = process.env.BLOB_STORE_ID;
  if (storeId) return { storeId };
  return null;
}

export function storeConfigured() { return blobAuth() !== null; }

/** Which mechanism is in play — shown on /ooo so setup problems are self-evident. */
export function authMode(): string {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  for (const [k, v] of Object.entries(process.env)) {
    if (v && k.endsWith("BLOB_READ_WRITE_TOKEN")) return k;
  }
  if (process.env.BLOB_STORE_ID) return "OIDC + BLOB_STORE_ID";
  return "";
}

/** Every stored entry. Returns [] if the store is empty, unset, or unreachable. */
export async function readEntries(): Promise<OOOEntry[]> {
  const auth = blobAuth();
  if (!auth) return [];
  try {
    // useCache:false — an absence entered this morning has to be visible on the
    // board's very next refresh, not after a CDN TTL.
    const res = await get(PATHNAME, { access: "private", useCache: false, ...auth });
    if (!res?.stream) return [];
    const text = await new Response(res.stream as any).text();
    const j = JSON.parse(text);
    return Array.isArray(j) ? j.filter(valid) : [];
  } catch {
    return [];                       // includes "not found" on a fresh store
  }
}

/** Replace the whole document. Returns false if the write did not land. */
export async function writeEntries(entries: OOOEntry[]): Promise<boolean> {
  const auth = blobAuth();
  if (!auth) return false;
  try {
    await put(PATHNAME, JSON.stringify(entries.filter(valid)), {
      access: "private",
      ...auth,
      contentType: "application/json",
      addRandomSuffix: false,        // stable path, so reads know where to look
      allowOverwrite: true,          // this document is meant to be replaced
      cacheControlMaxAge: 0,
    });
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
