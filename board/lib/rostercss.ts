// Styling for the /roster screen. Built on the /ooo palette and shapes so the
// two admin screens read as one product, with only the rank picker added.
import { OOO_CSS } from "@/lib/ooocss";

export const ROSTER_CSS = OOO_CSS + `
:root{--sr:#2f6f43;--avp:#4b2fa8}
.rs-list{list-style:none;margin:0;padding:0}
.rs-row{display:flex;align-items:center;gap:10px;padding:10px 2px;
  border-bottom:1px solid #f1f4f8}
.rs-row:last-child{border-bottom:none}
.rs-nm{flex:1 1 auto;font-size:17px;font-weight:500;min-width:0;
  overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.rs-row.on .rs-nm{font-weight:700}
.rs-was{flex:0 0 auto;font-size:11px;font-weight:700;letter-spacing:.3px;color:#b06a00;white-space:nowrap}
/* The rank picker. Two pills rather than a dropdown: on a phone a dropdown is
   two taps and hides the current value behind the first one, and there are
   only ever two ranks to choose between. Tapping the rank someone already
   holds clears it, which is why there is no third "none" pill. */
.rs-seg{flex:0 0 auto;display:flex;gap:6px}
.rs-pill{min-width:52px;border-radius:9px;padding:9px 10px;font:inherit;
  font-size:12px;font-weight:700;letter-spacing:.6px;cursor:pointer;
  background:#fff;border:1.5px solid #dbe1ea;color:#97a1b0}
.rs-pill:disabled{cursor:default;opacity:.55}
.rs-pill.sr.on{background:var(--sr);border-color:var(--sr);color:#fff}
.rs-pill.avp.on{background:var(--avp);border-color:var(--avp);color:#fff}
/* The badge exactly as the board draws it, so the legend up top is a preview
   and not a description of one. */
.rs-rank{display:inline-block;padding:1px 6px;border-radius:5px;
  font-size:10px;font-weight:700;letter-spacing:.7px;color:#fff}
.rs-rank.sr{background:var(--sr)}
.rs-rank.avp{background:var(--avp)}
/* Save bar pinned to the bottom of the viewport: the list is longer than a
   phone screen, and a Save button you have to scroll to find gets missed. */
.rs-bar{position:sticky;bottom:0;margin:0 -16px -56px;padding:12px 16px 20px;
  background:linear-gradient(rgba(233,237,243,0),var(--page) 38%);
  display:flex;align-items:center;gap:12px}
.rs-save{flex:0 0 auto;background:var(--green);color:#fff;border:none;border-radius:11px;
  padding:13px 22px;font-size:16px;font-weight:700;cursor:pointer}
.rs-save:disabled{background:#b8c2cf;cursor:default}
.rs-note{flex:1 1 auto;font-size:13px;color:var(--ink2);line-height:1.35}
.rs-by{flex:0 0 auto;width:120px;min-width:0;border:1px solid var(--line);border-radius:10px;
  padding:11px 12px;font-size:15px;font-family:inherit;background:#fff;color:var(--ink)}
.rs-count{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}
.rs-err{background:#fdecea;border:1px solid #f0b8b2;color:#8a2017;border-radius:12px;
  padding:12px 14px;font-size:14px;line-height:1.45;margin-bottom:16px}
.rs-ok{background:#e9f6ee;border:1px solid #b7dec7;color:#1b5e34;border-radius:12px;
  padding:12px 14px;font-size:14px;line-height:1.45;margin-bottom:16px}
/* On a narrow phone the pending-change chip is the first thing to give up its
   space — the pills and the name both have to stay legible. */
@media (max-width:380px){
  .rs-was{display:none}
  .rs-pill{min-width:46px;padding:9px 7px}
}
`;
