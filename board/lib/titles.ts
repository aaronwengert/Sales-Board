// Account Executive titles.
//
// One small JSON document naming the AEs who hold a rank above plain AE, kept
// in the same PRIVATE Vercel Blob store the out-of-office list uses. The
// connection and the auth discovery live in lib/ooo.ts; this file only owns
// its own document, so there is nothing extra to configure.
//
// AE → Sr. AE → AVP is a ladder, so each person holds at most one rank. That
// is enforced by the shape: a name maps to a single title, not to a set of
// flags, which means two rank badges on one row is not a thing that can
// happen, here or on the board.
//
// Why a store and not a constant in board.ts: a promotion should not need a
// commit and a deploy. Everything else about the roster — who is on it, which
// team they are on — still lives in board.ts, which stays the roster of
// record. This document holds one attribute of the people already declared
// there, and a name here that is not on that roster is ignored.
//
// Every read is wrapped so a storage problem can never take the board down: a
// failure resolves to "nobody holds a rank", which costs a badge and nothing
// else.

import { put, get } from "@vercel/blob";
import { blobAuth, storeConfigured } from "./ooo";

export { storeConfigured };

/** The ranks above plain AE, in ladder order. */
export const TITLES = ["SR", "AVP"] as const;
export type Title = (typeof TITLES)[number];

/** What each badge is short for — used on /roster so the screen explains
 *  itself rather than assuming everyone reads the abbreviations the same way. */
export const TITLE_LABEL: Record<Title, string> = {
  SR: "Senior Account Executive",
  AVP: "Assistant Vice President",
};

export type TitleDoc = {
  /** AE display name → rank. Spelled as the roster spells it. */
  titles: Record<string, Title>;
  /** Who last saved the list, and when — the audit line on /roster. */
  by?: string;
  at?: string;
};

const PATHNAME = "board/titles.json";
// Where the first version of this feature kept its list, back when Senior AE
// was the only rank. Read once, if and only if the current document does not
// exist yet, so that a deployment which already had names marked does not come
// back from this upgrade empty. The next save writes the current document and
// this is never consulted again.
const LEGACY_PATHNAME = "board/senior.json";

const EMPTY: TitleDoc = { titles: {} };

function isTitle(v: any): v is Title {
  return v === "SR" || v === "AVP";
}

/** The stored document. Returns an empty map if the store is unset, empty, or
 *  unreachable — never throws. */
export async function readTitles(): Promise<TitleDoc> {
  const auth = blobAuth();
  if (!auth) return EMPTY;
  const current = await readDoc(PATHNAME, auth);
  if (current) return current;
  // No current document: this may be a deployment upgrading from the version
  // that only knew about Senior AE. Everything in that document was an SR.
  return (await readDoc(LEGACY_PATHNAME, auth)) || EMPTY;
}

/** One document, or null if it is missing or unreadable. */
async function readDoc(path: string, auth: ReturnType<typeof blobAuth>): Promise<TitleDoc | null> {
  try {
    // useCache:false for the same reason the OOO store uses it: a change saved
    // on /roster has to show on the board's next refresh, not after a CDN TTL.
    const res = await get(path, { access: "private", useCache: false, ...(auth as object) });
    if (!res?.stream) return null;
    const text = await new Response(res.stream as any).text();
    return parse(JSON.parse(text));
  } catch {
    return null;              // includes "not found" on a fresh store
  }
}

/** Just the map — what the board itself needs. */
export async function readTitleMap(): Promise<Record<string, Title>> {
  return (await readTitles()).titles;
}

/** Replace the whole document. Returns false if the write did not land. */
export async function writeTitles(doc: TitleDoc): Promise<boolean> {
  const auth = blobAuth();
  if (!auth) return false;
  try {
    const body: TitleDoc = { titles: clean(doc.titles), by: doc.by, at: doc.at };
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

/** Read whatever shape the document is in.
 *
 *  An earlier version of this store held a flat `names` array, every entry of
 *  which meant Senior AE. That shape is accepted and read as SR so an upgrade
 *  never silently empties the list; the next save rewrites it in the current
 *  shape. A bare array is accepted for the same reason. */
function parse(j: any): TitleDoc {
  if (Array.isArray(j)) return { titles: fromNames(j) };
  if (!j || typeof j !== "object") return EMPTY;
  if (j.titles && typeof j.titles === "object" && !Array.isArray(j.titles)) {
    return {
      titles: clean(j.titles),
      by: typeof j.by === "string" ? j.by : undefined,
      at: typeof j.at === "string" ? j.at : undefined,
    };
  }
  if (Array.isArray(j.names)) {
    return {
      titles: fromNames(j.names),
      by: typeof j.by === "string" ? j.by : undefined,
      at: typeof j.at === "string" ? j.at : undefined,
    };
  }
  return EMPTY;
}

function fromNames(names: any[]): Record<string, Title> {
  const out: Record<string, Title> = {};
  for (const raw of names) {
    if (typeof raw !== "string") continue;
    const n = raw.trim();
    if (n) out[n] = "SR";
  }
  return out;
}

/** Drop blanks and anything that is not one of the known ranks. */
function clean(map: Record<string, any>): Record<string, Title> {
  const out: Record<string, Title> = {};
  for (const [k, v] of Object.entries(map || {})) {
    const n = (k || "").trim();
    if (n && isTitle(v)) out[n] = v;
  }
  return out;
}
