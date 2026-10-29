// Pure daily-record + streak + date helpers (local calendar days).
import type { DailyRecord, RoundResult, SaveData } from '../types';
import { ROUNDS_PER_DAY } from './storage';

export type DailyState = SaveData['daily'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse YYYY-MM-DD to local noon (noon dodges DST edge cases). */
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Shift a date key by whole days. Invalid keys are returned unchanged. */
export function shiftDateKey(key: string, days: number): string {
  const d = parseDateKey(key);
  if (!d) return key;
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/**
 * Count a finished daily toward the streak (call once per date):
 * - finished yesterday -> streak + 1
 * - same day as lastDate -> unchanged (replays never double count)
 * - back-filling an older date -> unchanged
 * - any gap (or first ever) -> streak = 1
 */
export function applyFinishedDay(daily: DailyState, key: string): DailyState {
  let streak: number;
  if (daily.lastDate === key) streak = Math.max(1, daily.streak);
  else if (daily.lastDate && daily.lastDate === shiftDateKey(key, -1)) streak = daily.streak + 1;
  else if (daily.lastDate && daily.lastDate > key) streak = daily.streak;
  else streak = 1;
  const lastDate = daily.lastDate && daily.lastDate > key ? daily.lastDate : key;
  return { ...daily, streak, bestStreak: Math.max(daily.bestStreak, streak), lastDate };
}

/**
 * Append one round result to the daily record for `dateKey` (creating it if needed).
 * At 6 results the record is marked finished and the streak is updated, once.
 * No-ops (returns the same object) for finished days and for a roundId already recorded.
 */
export function recordRound(save: SaveData, dateKey: string, number: number, result: RoundResult): SaveData {
  const existing: DailyRecord = save.daily.byDate[dateKey] ?? { dateKey, number, results: [], finished: false };
  if (existing.finished || existing.results.length >= ROUNDS_PER_DAY) return save;
  if (existing.results.some((r) => r.roundId === result.roundId)) return save;
  const results = [...existing.results, result];
  const finished = results.length >= ROUNDS_PER_DAY;
  const record: DailyRecord = { ...existing, number: existing.number || number, results, finished };
  let daily: DailyState = { ...save.daily, byDate: { ...save.daily.byDate, [dateKey]: record } };
  if (finished) daily = applyFinishedDay(daily, dateKey);
  return { ...save, daily };
}

/** The streak as it stands today: it's broken if you skipped yesterday. */
export function displayStreak(daily: DailyState, todayKey: string): number {
  if (!daily.lastDate) return 0;
  if (daily.lastDate === todayKey || daily.lastDate === shiftDateKey(todayKey, -1)) return daily.streak;
  return 0;
}

/** Milliseconds until the next local midnight (= next Urinal). */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

/** 3723000 -> "01:02:03". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
