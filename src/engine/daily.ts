// Daily numbering + share text. Owned by the Engine agent.
import { RESULT_TITLES } from '../content';
import { GRADES } from '../grades';
import type { DailyRecord } from '../types';

/** Urinal #1 is this local date. */
export const URINAL_EPOCH = '2026-10-28';

const DAY_MS = 86_400_000;

/** Local noon of a YYYY-MM-DD key (noon keeps DST shifts from crossing a day boundary). */
function localNoon(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12).getTime();
}

/** Urinal #N for a local date key. The epoch is #1; earlier dates give 0 or negatives. */
export function dailyNumber(dateKey: string): number {
  return Math.round((localNoon(dateKey) - localNoon(URINAL_EPOCH)) / DAY_MS) + 1;
}

/** Local YYYY-MM-DD for a Date (defaults to now). */
export function dateKeyOf(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/**
 * Urinal #12 4/6
 * ⬜⬜🟨⬜🟧⬜
 * Regular
 * <url>
 *
 * Score = number of clears. In-progress records show the tiles so far and no title. The url line is omitted when empty.
 */
export function buildShareText(record: DailyRecord, url: string): string {
  const clears = record.results.filter((r) => r.grade === 'clear').length;
  const lines = [`Urinal #${record.number} ${clears}/6`, record.results.map((r) => GRADES[r.grade]?.emoji ?? '').join('')];
  const title = RESULT_TITLES[clears];
  if (record.finished && title) lines.push(title);
  if (url.trim()) lines.push(url.trim());
  return lines.join('\n');
}
