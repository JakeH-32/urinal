// A 1080x1920 story image of a finished daily (score, tiles, rank, Puck, where to play), drawn on a
// canvas so phones can share it to Instagram Stories through the native share sheet.
import type { DailyRecord } from '../types';
import { GRADES } from '../grades';
import { GRADE_GLYPH } from './Tiles';

const W = 1080;
const H = 1920;
const INK = '#1d2b44';
const BG = '#f4f2ec';
const GROUT = '#e4e0d6';

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** A tile with an ink outline and a chunky offset shadow, like the game's buttons. */
function tile(c: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, ink: string, text: string, font: string) {
  roundRect(c, x, y + 10, s, s, 22);
  c.fillStyle = INK;
  c.fill();
  roundRect(c, x, y, s, s, 22);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = ink;
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x + s / 2, y + s / 2 + 4);
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
 * to leave him out. Resolves to a PNG blob.
 */
export async function drawStoryImage(record: DailyRecord, opts: { clears: number; total: number; title: string; puckSvg: string | null; site: string }): Promise<Blob> {
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

/** A square card of the same thing (for Messages and other chats), 1200x1200. */
export async function drawCardImage(record: DailyRecord, opts: { clears: number; total: number; title: string; puckSvg: string | null; site: string }): Promise<Blob> {
  const S = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
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
  c.fillRect(0, 0, S, S);
  c.strokeStyle = GROUT;
  c.lineWidth = 3;
  for (let x = 0; x <= S; x += 100) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, S);
    c.stroke();
    c.beginPath();
    c.moveTo(0, x);
    c.lineTo(S, x);
    c.stroke();
  }

  // URINAL tiles across the top.
  const letters = 'URINAL'.split('');
  const ts = 120;
  const gap = 16;
  const lx = (S - (letters.length * ts + (letters.length - 1) * gap)) / 2;
  letters.forEach((ch, i) => tile(c, lx + i * (ts + gap), 90, ts, '#ffffff', INK, ch, `900 68px ${display}`));

  // Puck on the left, the score on the right.
  if (opts.puckSvg) {
    const img = await loadSvg(opts.puckSvg);
    if (img) c.drawImage(img, 110, 300, 400, 400);
  }
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#55607a';
  c.font = `600 50px ${body}`;
  c.fillText(`Urinal #${record.number}`, 600, 400);
  c.fillStyle = INK;
  c.font = `900 220px ${display}`;
  const score = String(opts.clears);
  c.fillText(score, 594, 610);
  const sw = c.measureText(score).width;
  c.fillStyle = '#55607a';
  c.font = `900 92px ${display}`;
  c.fillText(`/${opts.total}`, 600 + sw, 610);
  c.fillStyle = INK;
  c.font = `900 66px ${display}`;
  c.fillText(opts.title, 600, 700);

  // Grade tiles.
  const gs = 130;
  const gg = 20;
  const n = record.results.length;
  const gx = (S - (n * gs + (n - 1) * gg)) / 2;
  record.results.forEach((r, i) => {
    const g = GRADES[r.grade];
    tile(c, gx + i * (gs + gg), 790, gs, g.color, g.ink, GRADE_GLYPH[r.grade], `900 64px ${body}`);
  });

  // Where to play.
  c.fillStyle = INK;
  roundRect(c, (S - 560) / 2, 1020, 560, 104, 28);
  c.fill();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 52px ${display}`;
  c.fillText(opts.site, S / 2, 1074);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
