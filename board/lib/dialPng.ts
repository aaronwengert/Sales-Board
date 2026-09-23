// The donut dial, rastered.
//
// This replaces the old arrangement, where the board handed out an SVG and
// every consumer had to turn it into a picture itself. The Python mailer grew
// its own Pillow implementation of this exact donut, which meant two renderers
// drifting apart and any NEW consumer — the projections app, say — needing a
// third. Drawing it once, here, and shipping PNG bytes means a consumer only
// has to attach a file.
//
// PNG rather than SVG because Gmail strips <svg> from delivered mail and
// blocks data: URIs in <img>, so an inline PNG attachment is the only form
// that reliably survives the trip.
//
// The same bytes serve the browser preview and the sent email. That is the
// point: a preview cannot show something the mail does not.

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { DIAL_FONT_BOLD, DIAL_FONT_REGULAR } from "./dialFont";
import type { DialSpec } from "./digest";

/** Must match BANDS.stone.bg in digest.ts — the strip the dials sit on. */
export const DIAL_BG = "#eceff2";

const SIZE = 224;              // 2x the 112px display size, for retina
const R = 86, STROKE = 27;
const BOLD = "OFCDialBold", REG = "OFCDialRegular";
// The unit line ("of 30") asked for weight 600 in the old SVG, a weight this
// family has no real face for. Bold is the nearer of the two, and bold is
// what the delivered mail has always shown.
const UNIT_FACE = BOLD;

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  // Registered by explicit name rather than by whatever the face calls itself,
  // so a font already present on the machine cannot shadow the embedded one
  // and make a local render disagree with production.
  GlobalFonts.register(Buffer.from(DIAL_FONT_BOLD, "base64"), BOLD);
  GlobalFonts.register(Buffer.from(DIAL_FONT_REGULAR, "base64"), REG);
  fontsReady = true;
}

export type DialArt = Pick<DialSpec, "value" | "goal" | "pct" | "pending" | "unit" | "color" | "track">
  & { adjPct?: number };

/** Draw one dial.
 *
 *  The background is a DISC, not a square, and the corners are left
 *  transparent. That one choice is what makes the picture survive a dark
 *  client: a square of #eceff2 sitting on an inverted email reads as a pale
 *  tile someone forgot to style, whereas the same dial with transparent
 *  corners is just a coin on whatever colour is behind it.
 *
 *  The disc itself stays light rather than going transparent too, because the
 *  number lives in the middle of it. The arc and track are thick and keep
 *  their contrast against anything, but "15" in #b5651d on a near-black hole
 *  is unreadable — so the hole keeps its light backing and the number keeps
 *  the contrast it was designed for. Pass an explicit colour to go back to a
 *  filled square.
 */
export function dialPng(d: DialArt, bg: string = DIAL_BG): Buffer {
  ensureFonts();
  const c = createCanvas(SIZE, SIZE);
  const x = c.getContext("2d");
  const mid = SIZE / 2;

  if (bg === "square") {
    x.fillStyle = DIAL_BG;
    x.fillRect(0, 0, SIZE, SIZE);
  } else if (bg && bg !== "transparent") {
    // A disc just wider than the ring, so the arc's antialiased outer edge
    // lands on backing rather than straight onto transparency.
    x.fillStyle = bg;
    x.beginPath();
    x.arc(mid, mid, R + STROKE / 2 + 1, 0, Math.PI * 2);
    x.fill();
  }

  // Track, then arc. Butt caps: a round cap on a near-zero arc paints a dot
  // that reads as progress where there is none.
  x.lineWidth = STROKE;
  x.lineCap = "butt";
  x.strokeStyle = d.track;
  x.beginPath();
  x.arc(mid, mid, R, 0, Math.PI * 2);
  x.stroke();

  const frac = Math.max(0, Math.min(1, d.pct / 100));
  if (frac > 0) {
    x.strokeStyle = d.color;
    x.beginPath();
    // -90° puts twelve o'clock at the start, the way a dial is read.
    x.arc(mid, mid, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    x.stroke();
  }

  // The attendance mark, when one is in force: a pin sitting ON the ring at
  // the point a full day's work lands for today's headcount.
  if (d.adjPct !== undefined && d.adjPct < 100) {
    const a = (-90 + 3.6 * d.adjPct) * Math.PI / 180;
    const px = mid + R * Math.cos(a), py = mid + R * Math.sin(a);
    x.beginPath();
    x.arc(px, py, 7.5, 0, Math.PI * 2);
    x.fillStyle = "#ffffff";
    x.fill();
    x.lineWidth = 3;
    x.strokeStyle = "#39434f";
    x.stroke();
  }

  x.textAlign = "center";
  // Text is placed by its MIDDLE at the same two heights the mailer's Pillow
  // version used — 98 and 138 in a 224 square — so the ring people already
  // know does not shift under them.
  x.textBaseline = "middle";
  x.letterSpacing = "-2px";
  x.font = `58px ${BOLD}`;
  x.fillStyle = d.pending ? "#b6bfcb" : d.color;
  x.fillText(d.pending ? "–" : String(d.value), mid, 98);
  // The unit beneath it, lighter and smaller.
  x.letterSpacing = "0px";
  x.font = `19px ${UNIT_FACE}`;
  x.fillStyle = "#8a94a4";
  x.fillText(d.unit, mid, 138);

  return c.toBuffer("image/png");
}

/** Browser-renderable source for a preview — the same bytes the mail gets. */
export function dialPngDataUri(d: DialArt, bg: string = DIAL_BG): string {
  return "data:image/png;base64," + dialPng(d, bg).toString("base64");
}
