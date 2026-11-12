// Styling for the /email screen. Built on the /roster sheet so the three admin
// screens read as one product; only the address boxes and the hour picker are
// new here.
import { ROSTER_CSS } from "@/lib/rostercss";

export const EMAIL_CSS = ROSTER_CSS + `
.em-what{font-size:14.5px;line-height:1.45;color:var(--ink2);margin:0 0 6px}
.em-when{font-size:13px;line-height:1.4;color:var(--muted);margin:0 0 14px}
.em-field{display:block;margin-bottom:4px}
.em-field > span{display:block;font-size:12px;font-weight:700;letter-spacing:.8px;
  text-transform:uppercase;color:var(--muted);margin-bottom:6px}
/* One address per line rather than a comma-separated string: a long list in a
   single-line input is unreadable on a phone, and this is where you check who
   is on it as often as you change it. */
.em-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--line);
  border-radius:10px;padding:11px 12px;font-family:inherit;font-size:15.5px;line-height:1.5;
  background:#fff;color:var(--ink);resize:vertical;min-height:84px}
.em-field textarea:disabled{opacity:.6}
.em-note{font-size:12.5px;line-height:1.45;color:var(--muted);margin:6px 0 0}
.em-note code{font-size:12px;background:#eef1f6;padding:1px 5px;border-radius:5px}
.em-label{font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;
  color:var(--muted);margin:16px 0 8px}
.em-label em{font-style:normal;font-weight:600;letter-spacing:.3px;text-transform:none;color:#aab3c0}
/* Wraps to as many rows as the width allows. Tap targets stay finger-sized at
   phone width, which is where this gets used. */
.em-hours{display:flex;flex-wrap:wrap;gap:7px}
.em-hr{flex:0 0 auto;min-width:58px;border-radius:9px;padding:10px 8px;font:inherit;
  font-size:13.5px;font-weight:700;cursor:pointer;
  background:#fff;border:1.5px solid #dbe1ea;color:#8d97a5}
.em-hr:disabled{cursor:default;opacity:.55}
.em-hr.on{background:var(--green);border-color:var(--green);color:#fff}
`;
