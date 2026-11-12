"use client";

import { useMemo, useState } from "react";

type Mail = {
  key: string;
  name: string;
  what: string;
  when: string;
  /** Only the daily digest has an hour picker; the weekly one is fired by its
   *  own workflow and has nothing here to set yet. */
  hours: boolean;
};

const MAILS: Mail[] = [
  {
    key: "daily",
    name: "Leading indicators",
    what: "Dials for calls, talk time, tickets and submissions, then a card per team showing who has hit their number today.",
    when: "Weekdays only — the board refuses to send at the weekend.",
    hours: true,
  },
  {
    key: "weekly",
    name: "Week in review",
    what: "The same numbers rolled up across the week, with a day-by-day grid and a card per AE.",
    when: "Fires from its own workflow, not from this schedule.",
    hours: false,
  },
];

function hourLabel(h: number) {
  const ampm = h < 12 ? "am" : "pm";
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${ampm}`;
}

/** The hours worth offering. Nobody needs a 3am send, and a full 24 would make
 *  the picker a wall. */
const PICKABLE = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export function EmailEditor({
  initial, configured, tokenVar, fallbackTo,
}: {
  initial: { daily: { to: string[]; hours: number[] }; weekly: { to: string[] }; last?: { at: string; kind: string; count: number }; by?: string; at?: string };
  configured: boolean;
  tokenVar?: string;
  /** What config.json would send to if the board has no list of its own. */
  fallbackTo: string[];
}) {
  const [saved, setSaved] = useState(initial);
  const [dailyTo, setDailyTo] = useState(initial.daily.to.join("\n"));
  const [weeklyTo, setWeeklyTo] = useState(initial.weekly.to.join("\n"));
  const [hours, setHours] = useState<number[]>(initial.daily.hours);
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const parse = (raw: string) =>
    raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

  const dailyList = useMemo(() => parse(dailyTo), [dailyTo]);
  const weeklyList = useMemo(() => parse(weeklyTo), [weeklyTo]);
  const bad = useMemo(
    () => [...dailyList, ...weeklyList].filter((a) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(a)),
    [dailyList, weeklyList],
  );

  const dirty =
    dailyList.join(",") !== saved.daily.to.join(",") ||
    weeklyList.join(",") !== saved.weekly.to.join(",") ||
    hours.join(",") !== saved.daily.hours.join(",");

  function toggleHour(h: number) {
    setOk(""); setErr("");
    setHours((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b));
  }

  async function save() {
    setBusy(true); setErr(""); setOk("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          daily: { to: dailyList, hours },
          weekly: { to: weeklyList },
          by: by.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j?.error || "Could not save. Try again."); return; }
      setSaved(j);
      setDailyTo((j.daily?.to || []).join("\n"));
      setWeeklyTo((j.weekly?.to || []).join("\n"));
      setHours(j.daily?.hours || []);
      const n = (j.daily?.hours || []).length;
      setOk(n === 0
        ? "Saved. The daily email is paused — no hours are selected."
        : `Saved. ${n} send${n === 1 ? "" : "s"} a day to ${(j.daily?.to || []).length || fallbackTo.length} recipient${((j.daily?.to || []).length || fallbackTo.length) === 1 ? "" : "s"}.`);
    } catch {
      setErr("Could not reach the server. Your changes are still on screen — try Save again.");
    } finally { setBusy(false); }
  }

  const lastStamp = saved.last?.at
    ? new Date(saved.last.at).toLocaleString("en-US", {
        timeZone: "America/Phoenix", weekday: "short", hour: "numeric", minute: "2-digit",
      })
    : null;

  return (
    <div className="oo-wrap">
      <div className="oo-head">
        <div>
          <div className="oo-brand">
            <img src="/logo.png" alt="" />
            <span>Oaktree Funding Corporation</span>
          </div>
          <h1>Email</h1>
          <p className="oo-sub">
            What goes out, who gets it, and how often. Changes take effect on the next send
            &mdash; nothing here needs a deploy.
          </p>
          {configured && <p className="oo-conn" title={tokenVar}>&#10003; Connected</p>}
          {saved.by && <p className="oo-sub">Last changed by {saved.by}.</p>}
        </div>
        <a className="oo-back" href="/">← Board</a>
      </div>

      {!configured && (
        <div className="oo-warn">
          <strong>No Blob store visible to this deployment.</strong> Expected either a
          <code>BLOB_READ_WRITE_TOKEN</code> or a <code>BLOB_STORE_ID</code> and found neither.
          If the store is already connected in Vercel, the fix is a <strong>redeploy</strong>.
          The emails keep going out to whatever <code>config.json</code> says in the meantime;
          this screen just can&rsquo;t change it.
        </div>
      )}

      {err && <div className="rs-err">{err}</div>}
      {ok && <div className="rs-ok">{ok}</div>}
      {bad.length > 0 && (
        <div className="oo-warn">
          {bad.length === 1 ? "This does not look like an address" : "These do not look like addresses"} and
          will be dropped on save: <strong>{bad.join(", ")}</strong>
        </div>
      )}

      {MAILS.map((m) => {
        const isDaily = m.key === "daily";
        const list = isDaily ? dailyTo : weeklyTo;
        const setList = isDaily ? setDailyTo : setWeeklyTo;
        const parsed = isDaily ? dailyList : weeklyList;
        return (
          <section className="oo-card" key={m.key}>
            <h2>{m.name}</h2>
            <p className="em-what">{m.what}</p>
            <p className="em-when">{m.when}</p>

            <label className="em-field">
              <span>Goes to</span>
              <textarea
                rows={Math.max(3, parsed.length + 1)}
                value={list}
                disabled={busy}
                placeholder={isDaily ? "one address per line" : "leave empty to use the same list as above"}
                onChange={(e) => { setOk(""); setErr(""); setList(e.target.value); }}
              />
            </label>
            {parsed.length === 0 && (
              <p className="em-note">
                {isDaily
                  ? <>Nobody set here, so it falls back to <code>config.json</code>: {fallbackTo.join(", ") || "nobody"}.</>
                  : <>Empty, so this uses the leading-indicators list above.</>}
              </p>
            )}

            {m.hours && (
              <>
                <div className="em-label">Send at these times <em>Arizona</em></div>
                <div className="em-hours">
                  {PICKABLE.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={"em-hr" + (hours.includes(h) ? " on" : "")}
                      aria-pressed={hours.includes(h)}
                      disabled={busy}
                      onClick={() => toggleHour(h)}
                    >
                      {hourLabel(h)}
                    </button>
                  ))}
                </div>
                <p className="em-note">
                  {hours.length === 0
                    ? "No times selected — the daily email is paused."
                    : `${hours.length} a day: ${hours.map(hourLabel).join(", ")}.`}
                  {" "}The scheduler fires every hour regardless; the board only lets these
                  through, so this is where the frequency is set.
                </p>
              </>
            )}

            {isDaily && lastStamp && (
              <p className="em-note">
                Last collected by the mailer {lastStamp} ({saved.last!.count || fallbackTo.length} recipient
                {(saved.last!.count || fallbackTo.length) === 1 ? "" : "s"}).
              </p>
            )}
          </section>
        );
      })}

      <div className="rs-bar">
        <button className="rs-save" disabled={busy || !configured || !dirty} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
        <input
          className="rs-by"
          placeholder="Your name"
          value={by}
          disabled={busy}
          onChange={(e) => setBy(e.target.value)}
        />
        <span className="rs-note">
          {dirty ? "Unsaved changes" : <span className="rs-count">{hours.length} sends · {dailyList.length || fallbackTo.length} people</span>}
        </span>
      </div>
    </div>
  );
}
