// Crowd stats: how everyone else answered today. Supabase over plain fetch (PostgREST), no SDK.
//
// Fail-safe by design:
// - Until VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY exist (src/net/config.ts) every call here is a
//   silent no-op: no requests, no storage writes, fetchDay resolves null.
// - Nothing here throws into the game, and every request gives up after REQUEST_TIMEOUT_MS.
// - Only day, round, slot, grade, points, clears and a random per-device id are ever sent.
//
// Backend: supabase/schema.sql (tables `picks` + `finishes`, insert-only for anon; `day_stats` RPC).
import type { Grade, RoundResult } from '../types';
import { GRADE_ORDER } from '../grades';
import { URINAL_EPOCH } from '../engine/daily';
import { dailyRounds } from '../engine/generate';
import { shiftDateKey } from '../state/dailyStreak';
import { getDefaultStorage } from '../state/storage';
import { communityConfig } from './config';

/** Pick counts for one round. bySlot[i] = players who picked slot i (length = the room's slot count). */
export interface RoundCrowd {
  total: number;
  bySlot: number[];
}

/** One day's crowd. rounds[0..5] (null = no picks yet); points[0..18] = finished players per hydration total. */
export interface DayCrowd {
  players: number;
  rounds: (RoundCrowd | null)[];
  points: number[];
}

/** Device id + which picks/finishes this device has already sent. */
export const CROWD_STORAGE_KEY = 'urinal:crowd:v1';
export const REQUEST_TIMEOUT_MS = 4000;
export const CROWD_ROUNDS = 6;
export const MAX_POINTS = 18;
/** Matches the CHECK on picks.slot (0..9). */
const MAX_SLOTS = 10;
/** Sent-keys older than this many days before the newest are pruned from storage. */
const KEEP_DAYS = 7;

const GRADE_POINTS: Record<Grade, number> = { clear: 3, straw: 2, amber: 1, doctor: 0 };

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const validDay = (day: unknown): day is number => isInt(day) && day >= 1 && day <= 100_000;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Hydration points for a day: clear 3, straw (Lemonade) 2, amber (Apple Juice) 1, doctor 0. Max 18. */
export function hydrationPoints(results: readonly RoundResult[]): number {
  let total = 0;
  for (const r of results) total += GRADE_POINTS[r?.grade] ?? 0;
  return total;
}

/**
 * Percent (0..100, rounded) of the OTHER finished players you beat, ties counting as half.
 * `hist[p]` = finished players with p points, and is assumed to include you.
 * null when nobody else has finished.
 */
export function betterThan(points: number, hist: readonly number[]): number | null {
  if (!Number.isFinite(points)) return null;
  const counts = hist.map((n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0));
  const total = counts.reduce((a, b) => a + b, 0);
  const others = total - 1;
  if (others <= 0) return null;
  const p = Math.max(0, Math.round(points));
  let below = 0;
  for (let i = 0; i < Math.min(p, counts.length); i++) below += counts[i];
  const ties = Math.max(0, (counts[p] ?? 0) - 1);
  const pct = ((below + ties / 2) / others) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** The round's crowd with your own pick counted (the server may not have caught up yet). */
export function withPick(crowd: RoundCrowd, pick: number): RoundCrowd {
  if (!isInt(pick) || pick < 0 || pick >= MAX_SLOTS) return crowd;
  if ((crowd.bySlot[pick] ?? 0) >= 1) return crowd;
  const bySlot = crowd.bySlot.slice();
  while (bySlot.length <= pick) bySlot.push(0);
  bySlot[pick] += 1;
  return { total: crowd.total + 1, bySlot };
}

/** The points histogram with your own finish counted (same reason as withPick). */
export function withFinish(hist: readonly number[], points: number): number[] {
  const out = hist.slice();
  const p = Math.round(points);
  if (!Number.isFinite(p) || p < 0 || p > MAX_POINTS) return out;
  while (out.length <= p) out.push(0);
  if ((out[p] ?? 0) < 1) out[p] = 1;
  return out;
}

/**
 * Percent of players per slot (0..100, unrounded) for BathroomScene's `crowd` prop, with your pick
 * counted. undefined when there's nothing worth drawing (no data, or you're the only player).
 */
export function crowdPercents(crowd: RoundCrowd | null | undefined, pick?: number): number[] | undefined {
  if (!crowd) return undefined;
  const c = pick === undefined ? crowd : withPick(crowd, pick);
  if (!(c.total >= 2)) return undefined;
  return c.bySlot.map((n) => (n > 0 ? (n / c.total) * 100 : 0));
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return isInt(n) && n > 0 ? n : 0;
};

/**
 * Map the day_stats RPC JSON ({players, rounds: [[round, slot, count]...], points: [[points, count]...]})
 * into a DayCrowd. `slotCounts[r]` = slots in round r+1's room: bySlot is padded to it and anything past
 * it dropped. Malformed entries are skipped; a non-object gives null.
 */
export function toDayCrowd(raw: unknown, slotCounts: readonly number[] = []): DayCrowd | null {
  if (!isObj(raw)) return null;
  const perRound: number[][] = Array.from({ length: CROWD_ROUNDS }, () => []);
  for (const t of Array.isArray(raw.rounds) ? raw.rounds : []) {
    if (!Array.isArray(t) || t.length < 3) continue;
    const r = Number(t[0]);
    const s = Number(t[1]);
    const n = count(t[2]);
    if (!isInt(r) || r < 1 || r > CROWD_ROUNDS || !isInt(s) || s < 0 || s >= MAX_SLOTS || n === 0) continue;
    const cap = slotCounts[r - 1];
    if (isInt(cap) && cap > 0 && s >= cap) continue;
    perRound[r - 1][s] = (perRound[r - 1][s] ?? 0) + n;
  }
  const rounds = perRound.map((sparse, r): RoundCrowd | null => {
    const cap = slotCounts[r];
    const len = Math.max(isInt(cap) && cap > 0 ? Math.min(cap, MAX_SLOTS) : 0, sparse.length);
    const bySlot = Array.from({ length: len }, (_, i) => sparse[i] ?? 0);
    const total = bySlot.reduce((a, b) => a + b, 0);
    return total > 0 ? { total, bySlot } : null;
  });
  const points: number[] = new Array(MAX_POINTS + 1).fill(0);
  for (const t of Array.isArray(raw.points) ? raw.points : []) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const p = Number(t[0]);
    const n = count(t[1]);
    if (!isInt(p) || p < 0 || p > MAX_POINTS || n === 0) continue;
    points[p] += n;
  }
  const finished = points.reduce((a, b) => a + b, 0);
  const players = Math.max(count(raw.players), finished, ...rounds.map((r) => r?.total ?? 0));
  return { players, rounds, points };
}

// ---------------------------------------------------------------------------
// Device id + per-device dedupe (localStorage, with an in-memory fallback)
// ---------------------------------------------------------------------------

interface CrowdStore {
  device: string;
  /** "12:3" = day 12 round 3 pick sent; "12:f" = day 12 finish sent. */
  sent: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let memStore: CrowdStore | null = null;

function newDeviceId(): string {
  try {
    const id = globalThis.crypto?.randomUUID?.();
    if (id && UUID_RE.test(id)) return id;
  } catch {
    /* insecure context or old browser */
  }
  const bytes = new Uint8Array(16);
  try {
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseStore(raw: string | null): CrowdStore | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!isObj(v) || typeof v.device !== 'string' || !UUID_RE.test(v.device)) return null;
    const sent = Array.isArray(v.sent) ? v.sent.filter((k): k is string => typeof k === 'string') : [];
    return { device: v.device, sent };
  } catch {
    return null;
  }
}

function writeStore(s: CrowdStore): void {
  memStore = s;
  const ls = getDefaultStorage();
  if (!ls) return;
  try {
    ls.setItem(CROWD_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / blocked: the in-memory copy still dedupes this session */
  }
}

function readStore(): CrowdStore {
  const ls = getDefaultStorage();
  if (ls) {
    try {
      const parsed = parseStore(ls.getItem(CROWD_STORAGE_KEY));
      if (parsed) return (memStore = parsed);
    } catch {
      /* blocked */
    }
  }
  const s = memStore ?? { device: newDeviceId(), sent: [] };
  writeStore(s);
  return s;
}

function markSent(key: string, day: number): void {
  const s = readStore();
  if (s.sent.includes(key)) return;
  const keep = s.sent.filter((k) => Number(k.split(':')[0]) >= day - KEEP_DAYS);
  writeStore({ device: s.device, sent: [...keep, key] });
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

/** POST to /rest/v1/<path>; `read` turns the response into a value. null on any failure or after the timeout. */
async function call<T>(path: string, body: unknown, prefer: string | null, read: (res: Response) => Promise<T> | T): Promise<T | null> {
  const cfg = communityConfig();
  if (!cfg || typeof fetch !== 'function') return null;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      try {
        ctrl?.abort();
      } catch {
        /* ignore */
      }
      resolve(null);
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    const headers: Record<string, string> = {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
    };
    if (prefer) headers.Prefer = prefer;
    const request = fetch(`${cfg.url}/rest/v1/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl?.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
      .then(read)
      .catch(() => null);
    return await Promise.race([request, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const inflight = new Map<string, Promise<void>>();

/** Resolves once every write started so far has finished (each is capped by the timeout). */
export async function whenSent(): Promise<void> {
  await Promise.allSettled([...inflight.values()]);
}

/** Insert one row unless this device already sent `key`. Fire-and-forget. */
function send(key: string, day: number, table: 'picks' | 'finishes', row: Record<string, string | number>): void {
  if (inflight.has(key)) return;
  const store = readStore();
  if (store.sent.includes(key)) return;
  // Plain insert: "resolution=ignore-duplicates" (ON CONFLICT DO NOTHING) fails Supabase's RLS check
  // since the public key has no SELECT policy. A repeat just comes back 409, which counts as sent.
  const done = call(table, { ...row, device: store.device }, 'return=minimal', (res) => res.status)
    .then((status) => {
      // 2xx = stored; 409 = already there; 400/422 = the data will never be accepted. Anything else
      // (offline, timeout, 401, 5xx, schema not set up yet) stays unsent and is retried next visit.
      if (status !== null && ((status >= 200 && status < 300) || status === 409 || status === 400 || status === 422)) {
        markSent(key, day);
      }
    })
    .catch(() => {})
    .finally(() => inflight.delete(key));
  inflight.set(key, done);
}

/** True when the crowd-stats backend is configured. */
export function communityEnabled(): boolean {
  return communityConfig() !== null;
}

/** Send one pick (round 1..6, slot index 0..9). Once per device per (day, round). Never throws. */
export function recordPick(day: number, round: number, slot: number, grade: Grade): void {
  try {
    if (!communityEnabled()) return;
    if (!validDay(day) || !isInt(round) || round < 1 || round > CROWD_ROUNDS) return;
    if (!isInt(slot) || slot < 0 || slot >= MAX_SLOTS || !GRADE_ORDER.includes(grade)) return;
    send(`${day}:${round}`, day, 'picks', { day, round, slot, grade });
  } catch {
    /* never break the game */
  }
}

/** Send a finished day (points 0..18, clears 0..6). Once per device per day. Never throws. */
export function recordFinish(day: number, points: number, clears: number): void {
  try {
    if (!communityEnabled()) return;
    if (!validDay(day) || !isInt(points) || !isInt(clears) || clears < 0 || clears > CROWD_ROUNDS) return;
    // Same rule as the table's CHECK: 3 per clear, at most 2 per other round.
    if (points < clears * 3 || points > clears * 3 + (CROWD_ROUNDS - clears) * 2) return;
    send(`${day}:f`, day, 'finishes', { day, points, clears });
  } catch {
    /* never break the game */
  }
}

const slotCache = new Map<number, number[]>();

/** Slot count of each of the day's six rooms (the dailies are deterministic). [] if that fails. */
function slotCountsFor(day: number): number[] {
  const hit = slotCache.get(day);
  if (hit) return hit;
  let counts: number[] = [];
  try {
    counts = dailyRounds(shiftDateKey(URINAL_EPOCH, day - 1)).map((r) => r.bathroom.slots.length);
  } catch {
    counts = [];
  }
  slotCache.set(day, counts);
  return counts;
}

/**
 * Today's crowd for Urinal #day. Waits for this device's own pending writes first so you're counted.
 * null when disabled, on any failure, or after the timeout. Never rejects.
 * `slotCounts` overrides the room sizes (defaults to the day's generated rooms).
 */
export async function fetchDay(day: number, slotCounts?: readonly number[]): Promise<DayCrowd | null> {
  try {
    if (!communityEnabled() || !validDay(day)) return null;
    await whenSent();
    const json = await call('rpc/day_stats', { p_day: day }, null, async (res) => (res.ok ? ((await res.json()) as unknown) : null));
    if (json == null) return null;
    return toDayCrowd(json, slotCounts ?? slotCountsFor(day));
  } catch {
    return null;
  }
}
