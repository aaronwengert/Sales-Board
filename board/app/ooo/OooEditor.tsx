"use client";

import { useMemo, useState } from "react";
import type { OOOEntry } from "@/lib/ooo";

type Group = { team: string; aes: string[] };

function id(e: OOOEntry) { return `${e.name}|${e.start}|${e.end}`; }
function pretty(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function spanLabel(e: OOOEntry) {
  return e.start === e.end ? pretty(e.start) : `${pretty(e.start)} – ${pretty(e.end)}`;
}

export function OooEditor({
  initial, groups, today, configured,
}: { initial: OOOEntry[]; groups: Group[]; today: string; configured: boolean }) {
  const [entries, setEntries] = useState<OOOEntry[]>(initial);
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const outToday = useMemo(
    () => entries.filter((e) => today >= e.start && today <= e.end).sort((a, b) => a.name.localeCompare(b.name)),
    [entries, today],
  );
  const upcoming = useMemo(
    () => entries.filter((e) => e.start > today).sort((a, b) => a.start.localeCompare(b.start)),
    [entries, today],
  );

  async function send(payload: any) {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/ooo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j?.error || "Could not save. Try again."); return false; }
      setEntries(j.entries || []);
      return true;
    } catch {
      setErr("Could not reach the server. Try again.");
      return false;
    } finally { setBusy(false); }
  }

  async function add() {
    if (!name) { setErr("Pick a person."); return; }
    const ok = await send({ action: "add", name, start, end: end || start, note });
    if (ok) { setName(""); setEnd(""); setNote(""); }
  }

  return (
    <div className="oo-wrap">
      <div className="oo-head">
        <div>
          <h1>Out of Office</h1>
          <p className="oo-sub">Anyone marked out is excluded from that day&rsquo;s goal and shows as out on the board.</p>
        </div>
        <a className="oo-back" href="/">← Board</a>
      </div>

      {!configured && (
        <div className="oo-warn">
          No storage connected yet. In Vercel, create a Blob store and link it to this project —
          the board keeps running normally in the meantime, it just can&rsquo;t save absences.
        </div>
      )}

      <section className="oo-card">
        <h2>Out today</h2>
        {outToday.length === 0
          ? <p className="oo-empty">Everyone is in.</p>
          : (
            <ul className="oo-list">
              {outToday.map((e) => (
                <li key={id(e)}>
                  <span className="oo-name">{e.name}</span>
                  <span className="oo-span">{spanLabel(e)}{e.note ? ` · ${e.note}` : ""}</span>
                  <button className="oo-x" disabled={busy} onClick={() => send({ action: "remove", id: id(e) })}>Remove</button>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="oo-card">
        <h2>Mark someone out</h2>
        <div className="oo-form">
          <label>
            <span>Person</span>
            <select value={name} onChange={(e) => setName(e.target.value)}>
              <option value="">Select an AE…</option>
              {groups.map((g) => (
                <optgroup key={g.team} label={g.team}>
                  {g.aes.map((n) => <option key={n} value={n}>{n}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span>First day out</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            <span>Last day out <em>optional</em></span>
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="oo-wide">
            <span>Note <em>optional</em></span>
            <input type="text" value={note} maxLength={80} placeholder="vacation, appointment…" onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        {err && <p className="oo-err">{err}</p>}
        <button className="oo-go" disabled={busy || !configured} onClick={add}>
          {busy ? "Saving…" : "Mark out of office"}
        </button>
        <p className="oo-hint">Leave the last day blank for a single day. The board updates within five minutes.</p>
      </section>

      {upcoming.length > 0 && (
        <section className="oo-card">
          <h2>Scheduled</h2>
          <ul className="oo-list">
            {upcoming.map((e) => (
              <li key={id(e)}>
                <span className="oo-name">{e.name}</span>
                <span className="oo-span">{spanLabel(e)}{e.note ? ` · ${e.note}` : ""}</span>
                <button className="oo-x" disabled={busy} onClick={() => send({ action: "remove", id: id(e) })}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
