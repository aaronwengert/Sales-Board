// Senior Account Executive store.
//
// One small JSON document naming the AEs who carry the Sr. badge, kept in the
// same PRIVATE Vercel Blob store the out-of-office list uses. The connection
// and the auth discovery live in lib/ooo.ts; this file only owns its own
// document, so there is nothing extra to configure.
//
// Why a store and not a constant in board.ts: a promotion should not need a
// commit and a deploy. Everything else about the roster — who is on it, which
// team they are on — still lives in board.ts, which stays the roster of
// record. This document holds one attribute of the people already declared
// there, and a name here that is not on that roster is ignored.
//
// Every read is wrapped so a storage problem can never take the board down: a
// failure resolves to "nobody is senior", which costs a badge and nothing else.

import { put, get } from "@vercel/blob";
import { blobAuth, storeConfigured } from "./ooo";

export { storeConfigured };

export type SeniorDoc = {
  /** AE display names, spelled as the roster spells them. */
  names: string[];
  /** Who last saved the list, and when — the audit line on /roster. */
  by?: string;
  at?: string;
};

const PATHNAME = "board/senior.json";

const EMPTY: SeniorDoc = { names: [] };

/** The stored document. Returns an empty list if the store is unset, empty, or
 *  unreachable — never throws. */
export async function readSenior(): Promise<SeniorDoc> {
  const auth = blobAuth();
  if (!auth) return EMPTY;
  try {
    // useCache:false for the same reason the OOO store uses it: a change saved
    // on /roster has to show on the board's next refresh, not after a CDN TTL.
    const res = await get(PATHNAME, { access: "private", useCache: false, ...auth });
    if (!res?.stream) return EMPTY;
    const text = await new Response(res.stream as any).text();
    const j = JSON.parse(text);
    // Tolerate a bare array, which is what a hand-written first version of this
    // document would most likely be.
    if (Array.isArray(j)) return { names: clean(j) };
    if (j && Array.isArray(j.names)) {
      return {
        names: clean(j.names),
        by: typeof j.by === "string" ? j.by : undefined,
        at: typeof j.at === "string" ? j.at : undefined,
      };
    }
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Just the names — what the board itself needs. */
export async function readSeniorNames(): Promise<string[]> {
  return (await readSenior()).names;
}

/** Replace the whole document. Returns false if the write did not land. */
export async function writeSenior(doc: SeniorDoc): Promise<boolean> {
  const auth = blobAuth();
  if (!auth) return false;
  try {
    const body: SeniorDoc = { names: clean(doc.names), by: doc.by, at: doc.at };
    await put(PATHNAME, JSON.stringify(body), {
      access: "private",
      ...auth,
      contentType: "application/json",
      addRandomSuffix: false,   // stable path, so reads know where to look
      allowOverwrite: true,     // this document is meant to be replaced
      cacheControlMaxAge: 0,
    });
    return true;
  } catch {
    return false;
  }
}

/** Trim, drop blanks, and de-duplicate case-insensitively while keeping the
 *  first spelling seen. */
function clean(list: any[]): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const n = raw.trim();
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out.sort((a, b) => a.localeCompare(b));
}
