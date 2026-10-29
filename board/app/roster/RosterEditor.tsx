"use client";

import { useMemo, useState } from "react";
import { TITLES, TITLE_LABEL, type Title } from "@/lib/titles";

type Group = { team: string; aes: string[] };

/** Case- and punctuation-insensitive key, matching norm() in board.ts so a
 *  name saved here lines up with the row the board draws. */
function key(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

/** Keyed by the same normalised name, so a spelling drift in the store cannot
 *  produce two entries for one person. */
function keyed(m: Record<string, Title>) {
  const out = new Map<string, Title>();
  for (const [n, t] of Object.entries(m || {})) out.set(key(n), t);
  return out;
}

export function RosterEditor({
  initial, groups, configured, tokenVar, savedBy, savedAt,
}: {
  initial: Record<string, Title>;
  groups: Group[];
  configured: boolean;
  tokenVar?: string;
  savedBy?: string;
  savedAt?: string;
}) {
  // The committed map (what the store holds) and the working map (what is on
  // screen) are kept apart so the Save button can tell whether there is
  // anything to save, and so a failed save leaves the edits intact.
  const [saved, setSaved] = useState<Record<string, Title>>(initial);
  const [sel, setSel] = useState<Map<string, Title>>(() => keyed(initial));
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const savedKeys = useMemo(() => keyed(saved), [saved]);

  // What would change on save, named rather than counted — "3 changes" tells
  // you less than seeing which three.
  const changes = useMemo(() => {
    const list: string[] = [];
    for (const g of groups) for (const n of g.aes) {
      const k = key(n), was = savedKeys.get(k), now = sel.get(k);
      if (was === now) continue;
      list.push(`${n} ${was || "AE"} → ${now || "AE"}`);
    }
    return list;
  }, [sel, savedKeys, groups]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { SR: 0, AVP: 0 };
    for (const t of sel.values()) c[t] = (c[t] || 0) + 1;
    return c;
  }, [sel]);

  /** Setting the rank a person already holds clears it, so the row doubles as
   *  its own undo and there is no separate "none" button to hunt for. */
  function pick(n: string, t: Title) {
    setOk(""); setErr("");
    setSel((prev) => {
      const next = new Map(prev), k = key(n);
      if (next.get(k) === t) next.delete(k); else next.set(k, t);
      return next;
    });
  }

  async function save() {
    setBusy(true); setErr(""); setOk("");
    // Send roster spellings, not the normalised keys: the board matches
    // loosely, but the stored document should stay readable.
    const titles: Record<string, Title> = {};
    for (const g of groups) for (const n of g.aes) {
      const t = sel.get(key(n));
      if (t) titles[n] = t;
    }
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titles, by: by.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j?.error || "Could not save. Try again."); return; }
      setSaved(j.titles || {});
      setSel(keyed(j.titles || {}));
      const n = Object.keys(j.titles || {}).length;
      setOk(`Saved. ${n} ${n === 1 ? "AE holds a rank" : "AEs hold a rank"} — the board picks this up on its next refresh.`);
    } catch {
      setErr("Could not reach the server. Your changes are still on screen — try Save again.");
    } finally { setBusy(false); }
  }

  const stamp = savedAt
    ? new Date(savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="oo-wrap">
      <div className="oo-head">
        <div>
          <div className="oo-brand">
            <img src="/logo.png" alt="" />
            <span>Oaktree Funding Corporation</span>
          </div>
          <h1>Roster</h1>
          <p className="oo-sub">
            A rank shows as a badge beside the name on the board. Everyone holds one rank
            at most &mdash; tap it again to go back to plain AE. It is a label only: it changes
            no goal, no pipeline shading, and no total.
          </p>
          <p className="oo-sub">
            {TITLES.map((t, i) => (
              <span key={t}>
                {i ? " · " : ""}
                <span className={"rs-rank " + t.toLowerCase()}>{t}</span> {TITLE_LABEL[t]}
              </span>
            ))}
          </p>
          {configured && <p className="oo-conn" title={tokenVar}>&#10003; Connected</p>}
          {savedBy && <p className="oo-sub">Last saved by {savedBy}{stamp ? ` on ${stamp}` : ""}.</p>}
        </div>
        <a className="oo-back" href="/">← Board</a>
      </div>

      {!configured && (
        <div className="oo-warn">
          <strong>No Blob store visible to this deployment.</strong> Expected either a
          <code>BLOB_READ_WRITE_TOKEN</code> or a <code>BLOB_STORE_ID</code> and found neither.
          If the store is already connected in Vercel, the fix is a <strong>redeploy</strong> &mdash;
          environment variables are only handed to deployments built after the store was linked.
          The board keeps running normally in the meantime; it just can&rsquo;t save this list.
        </div>
      )}

      {err && <div className="rs-err">{err}</div>}
      {ok && <div className="rs-ok">{ok}</div>}

      {groups.map((g) => (
        <section className="oo-card" key={g.team}>
          <h2>{g.team}</h2>
          <ul className="rs-list">
            {g.aes.map((n) => {
              const k = key(n), now = sel.get(k), was = savedKeys.get(k);
              return (
                <li className={"rs-row" + (now ? " on" : "")} key={n}>
                  <span className="rs-nm">{n}</span>
                  {now !== was && <span className="rs-was">{was || "AE"} → {now || "AE"}</span>}
                  <span className="rs-seg" role="group" aria-label={`Rank for ${n}`}>
                    {TITLES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={"rs-pill " + t.toLowerCase() + (now === t ? " on" : "")}
                        aria-pressed={now === t}
                        title={TITLE_LABEL[t]}
                        disabled={busy}
                        onClick={() => pick(n, t)}
                      >
                        {t}
                      </button>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="rs-bar">
        <button className="rs-save" disabled={busy || !configured || changes.length === 0} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
        <input
          className="rs-by"
          placeholder="Your name"
          value={by}
          disabled={busy}
          onChange={(e) => setBy(e.target.value)}
        />
        {/* Name the changes while the list is short enough to read at a glance,
            and fall back to a count once it isn't — this bar is two lines tall
            on a phone and a long list of names just spills out of it. */}
        <span className="rs-note">
          {changes.length === 0
            ? <span className="rs-count">{counts.SR} SR · {counts.AVP} AVP</span>
            : changes.length > 2
              ? `${changes.length} changes`
              : changes.join(" · ")}
        </span>
      </div>
    </div>
  );
}
