// The donut dial, drawn once.
//
// Email clients cannot draw an arc: Gmail strips inline <svg>, Outlook renders
// with Word's engine (no conic-gradient), and VML is not worth the fragility.
// So the arc is drawn here as SVG and delivered to the email as an image.
//
//   preview  — data:image/svg+xml, which every browser renders natively
//   sending  — the mailer rasterises this same SVG to PNG and attaches it as an
//              inline CID part, which displays even with remote images blocked
//
// One shape, one set of numbers, two deliveries — the preview cannot show
// something the sent mail does not.

import type { DialSpec } from "./digest";
/** Must match BANDS.stone.bg in digest.ts — the strip the dials sit on.
 *  Kept as a literal so this module stays a leaf with no runtime imports. */
export const DIAL_BG = "#eceff2";

const SIZE = 224;              // 2x the 112px display size, for retina
const R = 86, STROKE = 27;
const CIRC = 2 * Math.PI * R;
const FONT = "Helvetica Neue,Helvetica,Arial,sans-serif";

/** The strip the dials sit on is tinted, so the image has to be tinted too —
 *  a white square around each donut is the giveaway that these are pictures. */
export function dialSvg(
  d: Pick<DialSpec, "value" | "goal" | "pct" | "pending" | "unit" | "color" | "track">,
  bg: string = DIAL_BG,
): string {
  const frac = Math.max(0, Math.min(1, d.pct / 100));
  const on = (CIRC * frac).toFixed(2);
  const off = (CIRC - +on).toFixed(2);
  const c = SIZE / 2;
  // A zero-length arc still paints a dot under a round cap, so draw nothing.
  const arc = frac > 0
    ? `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${d.color}" stroke-width="${STROKE}"`
      + ` stroke-dasharray="${on} ${off}" stroke-linecap="butt" transform="rotate(-90 ${c} ${c})"/>`
    : "";
  const num = d.pending ? "&#8211;" : String(d.value);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`
    + `<rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>`
    + `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${d.track}" stroke-width="${STROKE}"/>`
    + arc
    + `<text x="${c}" y="${c + 6}" text-anchor="middle" font-family="${FONT}" font-size="58" font-weight="700"`
    + ` letter-spacing="-2" fill="${d.pending ? "#b6bfcb" : d.color}">${num}</text>`
    + `<text x="${c}" y="${c + 36}" text-anchor="middle" font-family="${FONT}" font-size="19" font-weight="600"`
    + ` fill="#8a94a4">${d.unit}</text>`
    + `</svg>`;
}

/** Browser-renderable source for the preview. */
export function dialDataUri(d: Parameters<typeof dialSvg>[0], bg: string = DIAL_BG): string {
  const svg = dialSvg(d, bg);
  const b64 = typeof Buffer !== "undefined"
    ? Buffer.from(svg, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(svg)));
  return "data:image/svg+xml;base64," + b64;
}
