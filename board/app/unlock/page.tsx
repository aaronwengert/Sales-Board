"use client";

import { useState } from "react";

export default function Unlock() {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    try {
      const r = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        const from = new URLSearchParams(window.location.search).get("from") || "/";
        window.location.href = from.startsWith("/") ? from : "/";
        return;
      }
      setErr(true);
      setPin("");
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#e9edf3", fontFamily: 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      padding: "20px", overflowY: "auto",
    }}>
      <form onSubmit={submit} style={{
        width: "340px", maxWidth: "100%", background: "#fff", border: "1px solid #e5e9f0",
        borderRadius: "16px", padding: "28px 26px", boxShadow: "0 4px 20px rgba(20,30,50,.08)",
        textAlign: "center",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Oaktree Funding Corp" style={{ height: "46px", width: "auto", margin: "0 auto 14px", display: "block", mixBlendMode: "multiply" }} />
        <div style={{ fontSize: "17px", fontWeight: 800, color: "#17233d", letterSpacing: "-.2px" }}>
          Sales Production Board
        </div>
        <div style={{ fontSize: "13px", color: "#8b95a6", marginTop: "4px", marginBottom: "18px" }}>
          Enter the PIN to view
        </div>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="••••"
          style={{
            width: "100%", textAlign: "center", fontSize: "24px", letterSpacing: "6px",
            fontWeight: 700, padding: "12px", borderRadius: "10px",
            border: "1px solid " + (err ? "#e34948" : "#cdd4de"), outline: "none",
            color: "#17233d", background: "#f7f9fc",
          }}
        />
        {err && (
          <div style={{ color: "#c0392b", fontSize: "12.5px", fontWeight: 600, marginTop: "9px" }}>
            Incorrect PIN — try again.
          </div>
        )}
        <button type="submit" disabled={busy || !pin} style={{
          marginTop: "16px", width: "100%", padding: "12px", borderRadius: "10px", border: "none",
          background: busy || !pin ? "#9fb0c4" : "#1a9e4e", color: "#fff", fontSize: "15px",
          fontWeight: 800, cursor: busy || !pin ? "default" : "pointer",
        }}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
