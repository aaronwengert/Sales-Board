// Email settings: who the scheduled emails go to, and when the daily one is
// allowed to send.
//
// Kept in the same private Vercel Blob store as the OOO and roster documents.
// Two reasons it lives here rather than in config.json:
//
//   1. config.json sits at the root of a public repository. Every address
//      added there is published, and stays in the history after it is taken
//      out again.
//   2. Changing it meant a commit, a push and a deploy.
//
// The schedule works by consent rather than by control. cron-job.org fires the
// job on its own clock and nothing here can change that; what the board can do
// is answer "not this hour" when the mailer asks, which it already does for
// weekends. So the hours below decide which of those firings turn into an
// email, and the frequency can be changed from a phone instead of from a
// third-party scheduler nobody remembers the login for.
//
// Every read is wrapped: a storage failure falls back to the built-in default
// rather than taking the board down or, worse, silently emailing nobody.

import { put, get } from "@vercel/blob";
import { blobAuth, storeConfigured } from "./ooo";

export { storeConfigured };

/** One scheduled email. */
export type MailSpec = {
  /** Who receives it. Empty means "whatever config.json says", which is how
   *  this behaved before the screen existed. */
  to: string[];
};

export type EmailCfg = {
  daily: MailSpec & {
    /** Arizona hours (0–23) at which a firing may become an email. A firing at
     *  any other hour is answered with skip. */
    hours: number[];
  };
  weekly: MailSpec;
  /** What the mailer last collected, for the screen to show. Not a send log —
   *  the board hands over a payload and never hears what became of it. */
  last?: { at: string; kind: string; count: number };
  by?: string;
  at?: string;
};

const PATHNAME = "board/email.json";

/** The schedule the workflow comment has always claimed, used until someone
 *  sets one. Four sends: mid-morning, midday, mid-afternoon, end of day. */
export const DEFAULT_HOURS = [10, 12, 15, 18];

const EMPTY: EmailCfg = { daily: { to: [], hours: DEFAULT_HOURS }, weekly: { to: [] } };

export async function readEmailCfg(): Promise<EmailCfg> {
  const auth = blobAuth();
  if (!auth) return EMPTY;
  try {
    const res = await get(PATHNAME, { access: "private", useCache: false, ...auth });
    if (!res?.stream) return EMPTY;
    const text = await new Response(res.stream as any).text();
    return parse(JSON.parse(text));
  } catch {
    return EMPTY;
  }
}

export async function writeEmailCfg(cfg: EmailCfg): Promise<boolean> {
  const auth = blobAuth();
  if (!auth) return false;
  try {
    await put(PATHNAME, JSON.stringify(clean(cfg)), {
      access: "private",
      ...auth,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    return true;
  } catch {
    return false;
  }
}

/** Record what the mailer just collected, without disturbing the settings.
 *  Read-modify-write: the window for losing a concurrent edit is a few
 *  milliseconds, four times a day, and the loss would be one timestamp. */
export async function noteCollected(kind: string, count: number): Promise<void> {
  try {
    const cur = await readEmailCfg();
    await writeEmailCfg({ ...cur, last: { at: new Date().toISOString(), kind, count } });
  } catch {
    /* a missing timestamp must never cost an email */
  }
}

/** Is the daily digest allowed to send at this Arizona hour? */
export function hourAllowed(cfg: EmailCfg, hour: number): boolean {
  const hs = cfg.daily.hours;
  // An empty list means nothing sends. That is a real choice — pausing the
  // emails without touching the scheduler — so it is honoured, not treated as
  // "unset" and quietly replaced by the default.
  return hs.includes(hour);
}

function parse(j: any): EmailCfg {
  if (!j || typeof j !== "object" || Array.isArray(j)) return EMPTY;
  return clean({
    daily: {
      to: addrs(j.daily?.to),
      hours: Array.isArray(j.daily?.hours) ? j.daily.hours : DEFAULT_HOURS,
    },
    weekly: { to: addrs(j.weekly?.to) },
    last: j.last && typeof j.last.at === "string"
      ? { at: j.last.at, kind: String(j.last.kind || ""), count: Number(j.last.count) || 0 }
      : undefined,
    by: typeof j.by === "string" ? j.by : undefined,
    at: typeof j.at === "string" ? j.at : undefined,
  });
}

function clean(c: EmailCfg): EmailCfg {
  const hours = [...new Set((c.daily.hours || []).map(Number).filter((h) => Number.isInteger(h) && h >= 0 && h <= 23))]
    .sort((a, b) => a - b);
  return {
    daily: { to: addrs(c.daily.to), hours },
    weekly: { to: addrs(c.weekly?.to) },
    last: c.last,
    by: c.by,
    at: c.at,
  };
}

/** Trim, drop anything that is not shaped like an address, de-duplicate
 *  case-insensitively. Validation is deliberately loose — the job here is to
 *  catch a typo like a stray comma, not to adjudicate RFC 5322. */
export function addrs(list: any): string[] {
  const out: string[] = [], seen = new Set<string>();
  if (!Array.isArray(list)) return out;
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const a = raw.trim();
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(a)) continue;
    const k = a.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

/** Split however the addresses were typed — the screen takes one box, and
 *  people paste comma, semicolon or newline separated lists into it. */
export function splitAddrs(raw: string): string[] {
  return addrs(String(raw || "").split(/[\s,;]+/).filter(Boolean));
}
