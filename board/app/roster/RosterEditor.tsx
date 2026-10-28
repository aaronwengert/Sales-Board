"use client";

import { useMemo, useState } from "react";

type Group = { team: string; aes: string[] };

/** Case- and punctuation-insensitive key, matching norm() in board.ts so a
 *  name saved here lines up with the row the board draws. */
function key(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function RosterEditor({
  initial, groups, configured, tokenVar, savedBy, savedAt,
}: {
  initial: string[];
  groups: Group[];
  configured: boolean;
  tokenVar?: string;
  savedBy?: string;
  savedAt?: string;
}) {
  // The committed list (what the store holds) and the working list (what is on
  // screen) are kept apart so the Save button can tell whether there is
  // anything to save, and so a failed save leaves the edits intact.
  const [saved, setSaved] = useState<string[]>(initial);
  const [sel, setSel] = useState<Set<string>>(() => new Set(initial.map(key)));
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const savedKeys = useMemo(() => new Set(saved.map(key)), [saved]);

  // What would change on save, named rather than counted — "3 changes" tells
  // you less than seeing which three.
  const changes = useMemo(() => {
    const added: string[] = [], removed: string[] = [];
    for (const g of groups) for (const n of g.aes) {
      const k = key(n);
      if (sel.has(k) && !savedKeys.has(k)) added.push(n);
      if (!sel.has(k) && savedKeys.has(k)) removed.push(n);
    }
    return { added, removed, n: added.length + removed.length };
  }, [sel, savedKeys, groups]);

  function toggle(n: string) {
    setOk(""); setErr("");
    setSel((prev) => {
      const next = new Set(prev), k = key(n);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  async function save() {
    setBusy(true); setErr(""); setOk("");
    // Send roster spellings, not the normalised keys: the board matches
    // loosely, but the stored document should stay readable.
    const names = groups.flatMap((g) => g.aes).filter((n) => sel.has(key(n)));
    try {
      const res = await fetch("/api/senior", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names, by: by.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j?.error || "Could not save. Try again."); return; }
      setSaved(j.names || []);
      setSel(new Set((j.names || []).map(key)));
      setOk(`Saved. ${(j.names || []).length} senior ${(j.names || []).length === 1 ? "AE" : "AEs"} — the board picks this up on its next refresh.`);
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
            Senior Account Executives carry an <span className="rs-sr">SR</span> badge beside their
            name on the board. It is a label only &mdash; it changes no goal, no pipeline shading,
            and no total.
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
              const on = sel.has(key(n));
              const was = savedKeys.has(key(n));
              return (
                <li key={n}>
                  <button
                    type="button"
                    className={"rs-row" + (on ? " on" : "")}
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => toggle(n)}
                  >
                    <span className="rs-box">{on ? "✓" : ""}</span>
                    <span className="rs-nm">{n}</span>
                    {on && <span className="rs-sr">SR</span>}
                    {on !== was && <span className="rs-was">{on ? "ADDED" : "REMOVED"}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="rs-bar">
        <button className="rs-save" disabled={busy || !configured || changes.n === 0} onClick={save}>
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
          {changes.n === 0
            ? <span className="rs-count">No changes</span>
            : changes.n > 2
              ? `${changes.n} changes · ${changes.added.length} added, ${changes.removed.length} removed`
              : [
                  changes.added.length ? `Adding ${changes.added.join(", ")}` : "",
                  changes.removed.length ? `Removing ${changes.removed.join(", ")}` : "",
                ].filter(Boolean).join(" · ")}
        </span>
      </div>
    </div>
  );
}
