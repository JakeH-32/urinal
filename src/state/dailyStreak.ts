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

const DAY_MS = 86_400_000;

/** Whole calendar days from `a` to `b` (negative when b is earlier). NaN for an invalid key. */
export function daysBetween(a: string, b: string): number {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  if (!da || !db) return NaN;
  return Math.round((db.getTime() - da.getTime()) / DAY_MS);
}

/** Two forgiven days must be at least this many days apart: one free miss in any 7 calendar days. */
const GRACE_SPACING = 7;

/** Can `missed` be forgiven, given the last day that was? */
function canForgive(missed: string, lastForgiven: string | undefined): boolean {
  return !lastForgiven || daysBetween(lastForgiven, missed) >= GRACE_SPACING;
}

export interface StreakScan {
  /** The run ending at the last finished day (0 with no finished days). Forgiven days don't count. */
  current: number;
  best: number;
  /** The last finished day. */
  lastDate?: string;
  /** The most recent missed day that was forgiven (in any run, live or not). */
  lastForgiven?: string;
}

/**
 * The streak worked out from scratch from the finished days. One missed day between two finished days is
 * forgiven (the run carries on, the missed day adds nothing) unless another day was forgiven less than
 * 7 days before it. Two missed days in a row always start a new run.
 */
export function scanStreak(byDate: DailyState['byDate']): StreakScan {
  const keys = Object.keys(byDate)
    .filter((k) => byDate[k]?.finished && parseDateKey(k))
    .sort();
  let current = 0;
  let best = 0;
  let prev: string | undefined;
  let lastForgiven: string | undefined;
  for (const key of keys) {
    const gap = prev ? daysBetween(prev, key) : 0;
    const missed = shiftDateKey(key, -1);
    if (prev && gap === 1) current += 1;
    else if (prev && gap === 2 && canForgive(missed, lastForgiven)) {
      current += 1;
      lastForgiven = missed;
    } else current = 1;
    best = Math.max(best, current);
    prev = key;
  }
  return { current, best, ...(prev ? { lastDate: prev } : {}), ...(lastForgiven ? { lastForgiven } : {}) };
}

/**
 * Count a finished daily toward the streak. `daily.byDate` must already hold the finished record: the
 * streak is recomputed from it (see scanStreak), so replays never double count and order doesn't matter.
 * The stored numbers never drop below what plain consecutive-day counting gives, which protects an old
 * save whose history has holes in it.
 */
export function applyFinishedDay(daily: DailyState, key: string): DailyState {
  const scan = scanStreak(daily.byDate);
  let floor = 1;
  if (daily.lastDate === key) floor = Math.max(1, daily.streak);
  else if (daily.lastDate && daily.lastDate === shiftDateKey(key, -1)) floor = daily.streak + 1;
  else if (daily.lastDate && daily.lastDate > key) floor = daily.streak;
  const streak = Math.max(scan.current, floor);
  const lastDate = daily.lastDate && daily.lastDate > key ? daily.lastDate : key;
  return { ...daily, streak, bestStreak: Math.max(daily.bestStreak, scan.best, streak), lastDate };
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

/**
 * Global "replay today" resets, by date key. When the rules or puzzles change mid-day, add that day
 * here and deploy: the first load on that same day clears that day's daily (once per device), so
 * everyone can replay it. Loaded on any later day, a reset is only marked as applied: old days stay.
 * A second reset on the same day gets a suffix ('2026-11-02b'); the first 10 characters are the day.
 */
export const DAILY_RESETS: readonly string[] = ['2026-10-29', '2026-11-02', '2026-11-02b', '2026-11-03', '2026-11-03b'];

export function applyDailyResets(save: SaveData, todayKey: string, resets: readonly string[] = DAILY_RESETS): SaveData {
  const done = save.daily.resets ?? [];
  const pending = resets.filter((k) => !done.includes(k));
  if (pending.length === 0) return save;
  const byDate = { ...save.daily.byDate };
  const wiped = pending.some((k) => k.slice(0, 10) === todayKey) && byDate[todayKey] !== undefined;
  if (wiped) delete byDate[todayKey];
  let daily: DailyState = { ...save.daily, byDate, resets: [...done, ...pending] };
  // Rebuild the streak from the remaining finished days (the wiped day may have counted).
  if (wiped) {
    const scan = scanStreak(byDate);
    const { lastDate: _old, ...rest } = daily;
    daily = { ...rest, streak: scan.current, bestStreak: scan.best, ...(scan.lastDate ? { lastDate: scan.lastDate } : {}) };
  }
  return { ...save, daily };
}

/** The streak as it stands on `todayKey`, and whether a forgiven yesterday is holding it up. */
export function streakStatus(daily: DailyState, todayKey: string): { streak: number; savedYesterday: boolean } {
  const scan = scanStreak(daily.byDate);
  const yesterday = shiftDateKey(todayKey, -1);
  let streak = 0;
  let savedYesterday = false;
  if (scan.lastDate) {
    const gap = daysBetween(scan.lastDate, todayKey);
    if (gap === 0) {
      streak = scan.current;
      savedYesterday = scan.lastForgiven === yesterday;
    } else if (gap === 1) streak = scan.current;
    else if (gap === 2 && canForgive(yesterday, scan.lastForgiven)) {
      // Yesterday was missed and today isn't played yet: still alive, for today only.
      streak = scan.current;
      savedYesterday = true;
    }
  }
  // Never below plain consecutive-day counting on the stored numbers (old saves with holes in the history).
  const stored = daily.lastDate === todayKey || daily.lastDate === yesterday ? daily.streak : 0;
  return { streak: Math.max(streak, stored), savedYesterday: savedYesterday && streak > 0 };
}

/** The streak as it stands today. One missed day is forgiven now and then; two in a row break it. */
export function displayStreak(daily: DailyState, todayKey: string): number {
  return streakStatus(daily, todayKey).streak;
}

/** True when yesterday was missed and forgiven, and the streak is alive because of it. */
export function streakSavedYesterday(save: SaveData, todayKey: string): boolean {
  return streakStatus(save.daily, todayKey).savedYesterday;
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
