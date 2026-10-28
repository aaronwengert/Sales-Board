// Styling for the /roster screen. Built on the /ooo palette and shapes so the
// two admin screens read as one product, with only the toggle list added.
import { OOO_CSS } from "@/lib/ooocss";

export const ROSTER_CSS = OOO_CSS + `
/* One tappable row per AE. The whole row is the control, not just the box —
   this gets used on a phone, where a 16px checkbox is a miss waiting to
   happen. */
.rs-list{list-style:none;margin:0;padding:0}
.rs-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;
  background:none;border:none;border-bottom:1px solid #f1f4f8;
  padding:12px 2px;font:inherit;color:inherit;cursor:pointer}
.rs-row:last-child{border-bottom:none}
.rs-row:disabled{cursor:default;opacity:.55}
.rs-box{flex:0 0 auto;width:22px;height:22px;border-radius:7px;border:2px solid #cdd5e0;
  background:#fff;display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:800;color:#fff;line-height:1}
.rs-row.on .rs-box{background:var(--green);border-color:var(--green)}
.rs-nm{flex:1 1 auto;font-size:17px;font-weight:500;min-width:0;
  overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.rs-row.on .rs-nm{font-weight:700}
/* The badge exactly as the board draws it, so this screen is a preview and not
   a description of one. */
.rs-sr{flex:0 0 auto;display:inline-block;padding:1px 6px;border-radius:5px;
  font-size:10px;font-weight:700;letter-spacing:.7px;color:#fff;background:#2f6f43}
.rs-was{flex:0 0 auto;font-size:11.5px;font-weight:700;letter-spacing:.4px;color:#b06a00}
/* Save bar pinned to the bottom of the viewport: the list is longer than a
   phone screen, and a Save button you have to scroll to find gets missed. */
.rs-bar{position:sticky;bottom:0;margin:0 -16px -56px;padding:12px 16px 20px;
  background:linear-gradient(rgba(233,237,243,0),var(--page) 38%);
  display:flex;align-items:center;gap:12px}
.rs-save{flex:0 0 auto;background:var(--green);color:#fff;border:none;border-radius:11px;
  padding:13px 22px;font-size:16px;font-weight:700;cursor:pointer}
.rs-save:disabled{background:#b8c2cf;cursor:default}
.rs-note{flex:1 1 auto;font-size:13px;color:var(--ink2);line-height:1.35}
.rs-by{flex:0 0 auto;width:130px;border:1px solid var(--line);border-radius:10px;
  padding:11px 12px;font-size:15px;font-family:inherit;background:#fff;color:var(--ink)}
.rs-count{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}
.rs-err{background:#fdecea;border:1px solid #f0b8b2;color:#8a2017;border-radius:12px;
  padding:12px 14px;font-size:14px;line-height:1.45;margin-bottom:16px}
.rs-ok{background:#e9f6ee;border:1px solid #b7dec7;color:#1b5e34;border-radius:12px;
  padding:12px 14px;font-size:14px;line-height:1.45;margin-bottom:16px}
`;
