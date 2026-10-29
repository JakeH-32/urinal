// Persistence: one localStorage key, defensive migration, pure update helpers.
// Every storage access is wrapped in try/catch so the game works with storage
// blocked (Safari private mode, sandboxed iframes, quota errors...).
import type { DailyRecord, Grade, Reason, RoundResult, SaveData, Settings } from '../types';
import { GRADE_ORDER } from '../grades';

export const STORAGE_KEY = 'urinal:v1';
export const ROUNDS_PER_DAY = 6;

// A Record so the compiler fails if a new Reason is added to types.ts but not here.
// (A missing reason makes migrate() drop that saved result, which strands the daily.)
const REASON_SET: Record<Reason, true> = {
  perfect: true,
  'only-option': true,
  'stall-forced': true,
  'too-close': true,
  'quirk-neighbor': true,
  'not-wall': true,
  'near-door': true,
  'door-side': true,
  'low-urinal': true,
  'stall-coward': true,
  adjacent: true,
  talker: true,
  splasher: true,
  boss: true,
  drunk: true,
  facetime: true,
  gassy: true,
};

export const REASONS: readonly Reason[] = Object.keys(REASON_SET) as Reason[];

export function defaultSettings(): Settings {
  return { sound: true, reducedMotion: false };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: defaultSettings(),
    daily: { byDate: {}, streak: 0, bestStreak: 0 },
    practice: { played: 0, greens: 0, bestRun: 0 },
    seenTutorial: false,
  };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function int(v: unknown, fallback: number, min = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.floor(v)) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function migrateSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(raw)) return d;
  return { sound: bool(raw.sound, d.sound), reducedMotion: bool(raw.reducedMotion, d.reducedMotion) };
}

function migrateResult(raw: unknown): RoundResult | null {
  if (!isObj(raw)) return null;
  const { roundId, pick, grade, reason } = raw;
  if (typeof roundId !== 'string' || !roundId) return null;
  if (typeof pick !== 'number' || !Number.isInteger(pick) || pick < 0) return null;
  if (!GRADE_ORDER.includes(grade as Grade) || !REASONS.includes(reason as Reason)) return null;
  return { roundId, pick, grade: grade as Grade, reason: reason as Reason };
}

function migrateRecord(key: string, raw: unknown): DailyRecord | null {
  if (!isObj(raw) || !DATE_KEY_RE.test(key)) return null;
  const results: RoundResult[] = [];
  if (Array.isArray(raw.results)) {
    for (const r of raw.results) {
      const m = migrateResult(r);
      if (m && results.length < ROUNDS_PER_DAY && !results.some((x) => x.roundId === m.roundId)) results.push(m);
    }
  }
  return { dateKey: key, number: int(raw.number, 0), results, finished: results.length >= ROUNDS_PER_DAY };
}

function migrateDaily(raw: unknown): SaveData['daily'] {
  const d = defaultSave().daily;
  if (!isObj(raw)) return d;
  const byDate: Record<string, DailyRecord> = {};
  if (isObj(raw.byDate)) {
    for (const [key, value] of Object.entries(raw.byDate)) {
      const r = migrateRecord(key, value);
      if (r) byDate[key] = r;
    }
  }
  const streak = int(raw.streak, 0);
  const lastDate = typeof raw.lastDate === 'string' && DATE_KEY_RE.test(raw.lastDate) ? raw.lastDate : undefined;
  const resets = Array.isArray(raw.resets) ? raw.resets.filter((k): k is string => typeof k === 'string' && DATE_KEY_RE.test(k)) : [];
  return {
    byDate,
    streak,
    bestStreak: Math.max(streak, int(raw.bestStreak, 0)),
    ...(lastDate ? { lastDate } : {}),
    ...(resets.length ? { resets } : {}),
  };
}

function migratePractice(raw: unknown): SaveData['practice'] {
  if (!isObj(raw)) return defaultSave().practice;
  const played = int(raw.played, 0);
  return { played, greens: Math.min(played, int(raw.greens, 0)), bestRun: int(raw.bestRun, 0) };
}

/**
 * Turn anything (parsed JSON, a JSON string, garbage, an older save) into a valid SaveData.
 * Unknown fields are dropped, missing/invalid fields fall back to defaults.
 */
export function migrate(raw: unknown): SaveData {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return defaultSave();
    }
  }
  if (!isObj(data)) return defaultSave();
  return {
    version: 1,
    settings: migrateSettings(data.settings),
    daily: migrateDaily(data.daily),
    practice: migratePractice(data.practice),
    seenTutorial: bool(data.seenTutorial, false),
  };
}

// ---------------------------------------------------------------------------
// Storage access
// ---------------------------------------------------------------------------

/** window.localStorage if it exists and is accessible, else null. Never throws. */
export function getDefaultStorage(): Storage | null {
  try {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null;
  }
}

/** Load the save. `null` storage (blocked) or any error -> defaults. */
export function loadSave(storage: Storage | null | undefined = getDefaultStorage()): SaveData {
  if (!storage) return defaultSave();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return defaultSave();
    return migrate(raw);
  } catch {
    return defaultSave();
  }
}

/** Persist the save. Returns false if storage is unavailable or throws (quota, blocked...). */
export function saveSave(save: SaveData, storage: Storage | null | undefined = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Pure update helpers
// ---------------------------------------------------------------------------

/** Fold one practice pick into the lifetime practice counters (`greens` counts clears). `run` = clears in a row after this pick. */
export function recordPractice(save: SaveData, grade: Grade, run: number): SaveData {
  const p = save.practice;
  return {
    ...save,
    practice: {
      played: p.played + 1,
      greens: p.greens + (grade === 'clear' ? 1 : 0),
      bestRun: Math.max(p.bestRun, run),
    },
  };
}

/** Wipe progress but keep settings (and don't force the tutorial again). */
export function resetProgress(save: SaveData): SaveData {
  return { ...defaultSave(), settings: { ...save.settings }, seenTutorial: save.seenTutorial };
}
