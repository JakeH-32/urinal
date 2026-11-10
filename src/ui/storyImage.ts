// Share images of a finished daily (score, tiles, rank, Puck, where to play), drawn on a canvas: a
// 1080x1920 story for Instagram Stories and a 1300x520 banner for chats, both through the native share sheet.
import type { DailyRecord } from '../types';
import { GRADES } from '../grades';
import { GRADE_GLYPH } from './Tiles';

const W = 1080;
const H = 1920;
const INK = '#1d2b44';
const BG = '#f4f2ec';
const GROUT = '#e4e0d6';

/** Something rare the player ran into today, e.g. { emoji: '👀', label: 'Doppelgänger' }. */
export interface Sighting {
  emoji: string;
  label: string;
}

export interface CardOpts {
  clears: number;
  total: number;
  title: string;
  puckSvg: string | null;
  site: string;
  /** Today's sightings. Empty or missing: no badge, and the layout is exactly as without it. */
  spotted?: readonly Sighting[];
}

/** The badge line: "👀 Spotted: Doppelgänger", plus "+2" when there were more. Null when there is nothing to show. */
export function spottedLine(spotted: readonly Sighting[] | undefined): string | null {
  const first = spotted?.[0];
  if (!spotted || !first) return null;
  const more = spotted.length > 1 ? ` +${spotted.length - 1}` : '';
  return `${first.emoji || '👀'} Spotted: ${first.label}${more}`;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** A tile with an ink outline and a chunky offset shadow, like the game's buttons. `k` scales the outline, shadow and corners for small tiles. */
function tile(c: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, ink: string, text: string, font: string, k = 1) {
  roundRect(c, x, y + 10 * k, s, s, 22 * k);
  c.fillStyle = INK;
  c.fill();
  roundRect(c, x, y, s, s, 22 * k);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = 7 * k;
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = ink;
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x + s / 2, y + s / 2 + 4 * k);
}

/** Shrinks the font until `text` fits in `maxW`. Leaves the font set on the context. */
function fitFont(c: CanvasRenderingContext2D, text: string, weight: number, px: number, family: string, maxW: number) {
  let size = px;
  c.font = `${weight} ${size}px ${family}`;
  while (size > 12 && c.measureText(text).width > maxW) {
    size -= 2;
    c.font = `${weight} ${size}px ${family}`;
  }
}

/** A white pill with an ink outline holding the sightings line. `align` says what `x` is: its left edge or its centre. */
function badge(c: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, maxW: number, family: string, align: 'left' | 'center') {
  const pad = h * 0.42;
  fitFont(c, text, 800, Math.round(h * 0.52), family, maxW - pad * 2);
  const w = Math.min(maxW, c.measureText(text).width + pad * 2);
  const left = align === 'center' ? x - w / 2 : x;
  roundRect(c, left, y, w, h, h / 2);
  c.fillStyle = '#ffffff';
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = INK;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, left + w / 2, y + h / 2 + 2);
}

function loadSvg(markup: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    const svg = markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/**
 * Draws the story card. `puckSvg` is the outerHTML of a rendered Puck (taken from the page), or null
 * to leave Puck out. `spotted` adds a sightings badge under the rank. Resolves to a PNG blob.
 */
export async function drawStoryImage(record: DailyRecord, opts: CardOpts): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('no canvas');
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are a nicety */
  }
  const display = "'Archivo Black', 'Arial Black', Impact, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  // Tiled wall.
  c.fillStyle = BG;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = GROUT;
  c.lineWidth = 3;
  for (let x = 0; x <= W; x += 90) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 0; y <= H; y += 90) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }

  // Everything else sits a little smaller in the middle, with more wall around it.
  c.save();
  c.translate(W / 2, H / 2);
  c.scale(0.86, 0.86);
  c.translate(-W / 2, -H / 2);

  // With a sightings badge, the top half moves up and the bottom half down to open a line for it.
  const spotted = spottedLine(opts.spotted);
  const room = spotted ? 46 : 0;
  c.translate(0, -room);

  // URINAL letter tiles.
  const letters = 'URINAL'.split('');
  const ts = 132;
  const gap = 18;
  const lx = (W - (letters.length * ts + (letters.length - 1) * gap)) / 2;
  letters.forEach((ch, i) => tile(c, lx + i * (ts + gap), 190, ts, '#ffffff', INK, ch, `900 76px ${display}`));

  // Puck.
  if (opts.puckSvg) {
    const img = await loadSvg(opts.puckSvg);
    if (img) c.drawImage(img, (W - 420) / 2, 420, 420, 420);
  }

  // Number, score, rank.
  c.fillStyle = '#55607a';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `600 54px ${body}`;
  c.fillText(`Urinal #${record.number}`, W / 2, 940);
  c.fillStyle = INK;
  c.font = `900 230px ${display}`;
  const score = String(opts.clears);
  const sw = c.measureText(score).width;
  c.font = `900 96px ${display}`;
  const ow = c.measureText(`/${opts.total}`).width;
  const sx = (W - (sw + ow)) / 2;
  c.textAlign = 'left';
  c.font = `900 230px ${display}`;
  c.fillText(score, sx, 1170);
  c.font = `900 96px ${display}`;
  c.fillStyle = '#55607a';
  c.fillText(`/${opts.total}`, sx + sw + 6, 1170);
  c.textAlign = 'center';
  c.fillStyle = INK;
  c.font = `900 84px ${display}`;
  c.fillText(opts.title, W / 2, 1290);
  if (spotted) badge(c, spotted, W / 2, 1326, 80, 940, body, 'center');
  c.translate(0, room * 2);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  // Grade tiles.
  const gs = 140;
  const gg = 22;
  const n = record.results.length;
  const gx = (W - (n * gs + (n - 1) * gg)) / 2;
  record.results.forEach((r, i) => {
    const g = GRADES[r.grade];
    tile(c, gx + i * (gs + gg), 1370, gs, g.color, g.ink, GRADE_GLYPH[r.grade], `900 70px ${body}`);
  });

  // Call to action.
  c.fillStyle = INK;
  c.font = `600 50px ${body}`;
  c.fillText('Can you find the right urinal?', W / 2, 1680);
  roundRect(c, (W - 640) / 2, 1730, 640, 116, 30);
  c.fill();
  c.fillStyle = '#ffffff';
  c.font = `900 56px ${display}`;
  c.textBaseline = 'middle';
  c.fillText(opts.site, W / 2, 1790);
  c.restore();

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

/**
 * A short, wide banner of the same thing (for Messages and other chats), 1200x630, so several results
 * fit on one phone screen. Puck on the left, score and rank beside it, the day's tiles underneath.
 */
export async function drawCardImage(record: DailyRecord, opts: CardOpts): Promise<Blob> {
  const BW = 1300;
  const BH = 520;
  const canvas = document.createElement('canvas');
  canvas.width = BW;
  canvas.height = BH;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('no canvas');
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are a nicety */
  }
  const display = "'Archivo Black', 'Arial Black', Impact, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  c.fillStyle = BG;
  c.fillRect(0, 0, BW, BH);
  c.strokeStyle = GROUT;
  c.lineWidth = 3;
  for (let x = 0; x <= BW; x += 100) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, BH);
    c.stroke();
  }
  for (let y = 15; y <= BH; y += 100) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(BW, y);
    c.stroke();
  }

  // Wide margins all round: Messages rounds and crops the edges of a picture.
  c.save();

  // Top strip: URINAL tiles on the left, where to play on the right.
  const letters = 'URINAL'.split('');
  const ts = 54;
  const gap = 8;
  letters.forEach((ch, i) => tile(c, 90 + i * (ts + gap), 52, ts, '#ffffff', INK, ch, `900 32px ${display}`, 0.6));
  c.font = `900 30px ${display}`;
  const pw = c.measureText(opts.site).width + 56;
  c.fillStyle = INK;
  roundRect(c, BW - 90 - pw, 54, pw, 56, 18);
  c.fill();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(opts.site, BW - 90 - pw / 2, 83);

  // Puck on the left.
  if (opts.puckSvg) {
    const img = await loadSvg(opts.puckSvg);
    if (img) c.drawImage(img, 70, 130, 330, 330);
  }

  // The score, with the day, rank and any sightings beside it.
  const X = 450;
  const RIGHT = BW - 90;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = INK;
  c.font = `900 200px ${display}`;
  const score = String(opts.clears);
  c.fillText(score, X - 8, 318);
  const sw = c.measureText(score).width;
  c.fillStyle = '#55607a';
  c.font = `900 84px ${display}`;
  const of = `/${opts.total}`;
  c.fillText(of, X + sw, 318);
  const tx = X + sw + c.measureText(of).width + 40;
  const spotted = spottedLine(opts.spotted);
  
  c.font = `600 40px ${body}`;
  c.fillText(`Urinal #${record.number}`, tx, 226);
  c.fillStyle = INK;
  fitFont(c, opts.title, 900, 68, display, RIGHT - tx);
  c.fillText(opts.title, tx, 306);
  // Sightings ride in the top strip, between the name and the address.
  const stripL = 90 + 6 * (54 + 8) + 24;
  if (spotted) badge(c, spotted, (stripL + (BW - 90 - pw - 24)) / 2, 55, 54, BW - 90 - pw - 24 - stripL, body, 'center');

  // Grade tiles.
  const n = record.results.length;
  const gg = 18;
  const gs = Math.min(110, (RIGHT - X - (n - 1) * gg) / Math.max(1, n));
  record.results.forEach((r, i) => {
    const g = GRADES[r.grade];
    tile(c, X + i * (gs + gg), 350, gs, g.color, g.ink, GRADE_GLYPH[r.grade], `900 ${Math.round(gs * 0.5)}px ${body}`);
  });

  c.restore();

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
