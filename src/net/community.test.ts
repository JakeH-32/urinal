import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Grade, RoundResult } from '../types';
import { dailyRounds } from '../engine/generate';

type Community = typeof import('./community');

const URL_ = 'https://abc123.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiJ9.test.key';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => {
      m.delete(k);
    },
    setItem: (k, v) => {
      m.set(k, String(v));
    },
  };
}

function throwingStorage(): Storage {
  const boom = () => {
    throw new Error('SecurityError: storage is blocked');
  };
  return { length: 0, clear: boom, getItem: boom, key: boom, removeItem: boom, setItem: boom };
}

const enable = () => {
  vi.stubEnv('VITE_SUPABASE_URL', URL_);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', KEY);
};

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
const created = () => new Response(null, { status: 201 });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let m: Community;
let store: Storage;
let fetchMock: ReturnType<typeof vi.fn<FetchFn>>;

async function load(): Promise<Community> {
  vi.resetModules();
  return import('./community');
}

beforeEach(async () => {
  // Off by default, even if a developer has a .env.local with real values.
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
  store = memoryStorage();
  vi.stubGlobal('localStorage', store);
  fetchMock = vi.fn<FetchFn>(async () => created());
  vi.stubGlobal('fetch', fetchMock);
  m = await load();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const result = (grade: Grade): RoundResult => ({ roundId: `r-${Math.random()}`, pick: 0, grade, reason: 'perfect' });
/** Histogram from a list of point totals. */
const hist = (...pts: number[]) => {
  const h = new Array(19).fill(0);
  for (const p of pts) h[p] += 1;
  return h;
};
const body = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>;

describe('hydrationPoints', () => {
  it('scores clear 3, straw 2, amber 1, doctor 0', () => {
    expect(m.hydrationPoints([])).toBe(0);
    expect(m.hydrationPoints(['clear', 'straw', 'amber', 'doctor'].map((g) => result(g as Grade)))).toBe(6);
    expect(m.hydrationPoints(Array.from({ length: 6 }, () => result('clear')))).toBe(18);
    expect(m.hydrationPoints(Array.from({ length: 6 }, () => result('doctor')))).toBe(0);
  });
});

describe('betterThan', () => {
  it('is null when nobody else has finished', () => {
    expect(m.betterThan(12, hist(12))).toBeNull();
    expect(m.betterThan(12, hist())).toBeNull();
    expect(m.betterThan(12, [])).toBeNull();
  });

  it('handles a two-player day: win, loss, tie', () => {
    expect(m.betterThan(12, hist(12, 9))).toBe(100);
    expect(m.betterThan(12, hist(12, 15))).toBe(0);
    expect(m.betterThan(12, hist(12, 12))).toBe(50);
  });

  it('counts ties as half and excludes you', () => {
    // You (10) vs others: 5, 5, 10, 15 → (2 below + 1 tie / 2) / 4 = 62.5% → 63
    expect(m.betterThan(10, hist(10, 5, 5, 10, 15))).toBe(63);
  });

  it('rounds to a whole percent', () => {
    expect(m.betterThan(10, hist(10, 5, 12, 14))).toBe(33);
    expect(m.betterThan(10, hist(10, 5, 6, 14))).toBe(67);
    expect(m.betterThan(18, hist(18, 0, 1, 2, 3, 4, 5))).toBe(100);
    expect(m.betterThan(0, hist(0, 1, 2))).toBe(0);
  });
});

describe('withPick / withFinish / crowdPercents', () => {
  it('counts you when the server has not caught up, and leaves it alone when it has', () => {
    expect(m.withPick({ total: 2, bySlot: [1, 1, 0] }, 2)).toEqual({ total: 3, bySlot: [1, 1, 1] });
    expect(m.withPick({ total: 2, bySlot: [1, 1] }, 3)).toEqual({ total: 3, bySlot: [1, 1, 0, 1] });
    const already = { total: 2, bySlot: [1, 1] };
    expect(m.withPick(already, 0)).toBe(already);
    expect(m.withFinish(hist(5), 12)[12]).toBe(1);
    expect(m.withFinish(hist(12, 12), 12)[12]).toBe(2);
  });

  it('gives percent per slot for the scene, or undefined when there is nothing to compare', () => {
    expect(m.crowdPercents(null)).toBeUndefined();
    expect(m.crowdPercents({ total: 0, bySlot: [0, 0] }, 1)).toBeUndefined();
    expect(m.crowdPercents({ total: 1, bySlot: [0, 1] }, 1)).toBeUndefined();
    expect(m.crowdPercents({ total: 3, bySlot: [1, 0, 2, 0] }, 2)).toEqual([(1 / 3) * 100, 0, (2 / 3) * 100, 0]);
    // Your pick is added when missing: 4 others + you.
    expect(m.crowdPercents({ total: 4, bySlot: [4, 0] }, 1)).toEqual([80, 20]);
  });
});

describe('toDayCrowd (day_stats JSON → DayCrowd)', () => {
  it('maps rounds and points, pads each round to its room size', () => {
    const raw = { players: 3, rounds: [[1, 2, 2], [1, 4, 1], [3, 0, 3]], points: [[12, 1], [18, 2]] };
    const crowd = m.toDayCrowd(raw, [6, 5, 7, 8, 6, 9]);
    expect(crowd).not.toBeNull();
    expect(crowd!.players).toBe(3);
    expect(crowd!.rounds).toHaveLength(6);
    expect(crowd!.rounds[0]).toEqual({ total: 3, bySlot: [0, 0, 2, 0, 1, 0] });
    expect(crowd!.rounds[1]).toBeNull();
    expect(crowd!.rounds[2]).toEqual({ total: 3, bySlot: [3, 0, 0, 0, 0, 0, 0] });
    expect(crowd!.rounds.slice(3)).toEqual([null, null, null]);
    expect(crowd!.points).toHaveLength(19);
    expect(crowd!.points[12]).toBe(1);
    expect(crowd!.points[18]).toBe(2);
    expect(crowd!.points.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('skips malformed entries and accepts numeric strings (bigint counts)', () => {
    const raw = {
      players: '2',
      rounds: [[0, 1, 1], [7, 1, 1], [1, -1, 1], [1, 10, 1], [1, 5, 1], [1, 1, 0], [1, 1, -2], 'x', null, [1, 1], [1, 1, '2']],
      points: [[19, 1], [-1, 1], [3, 0], ['6', '1'], 'nope'],
    };
    const crowd = m.toDayCrowd(raw, [5, 5, 5, 5, 5, 5]);
    // [1, 5, 1] is past round 1's 5 slots, so it's dropped.
    expect(crowd!.rounds[0]).toEqual({ total: 2, bySlot: [0, 2, 0, 0, 0] });
    expect(crowd!.points[6]).toBe(1);
    expect(crowd!.points.reduce((a, b) => a + b, 0)).toBe(1);
    expect(crowd!.players).toBe(2);
  });

  it('never reports fewer players than it has picks or finishes for', () => {
    const crowd = m.toDayCrowd({ players: 0, rounds: [[2, 0, 4]], points: [[9, 1]] }, []);
    expect(crowd!.players).toBe(4);
    // No room sizes known: sized to the data.
    expect(crowd!.rounds[1]).toEqual({ total: 4, bySlot: [4] });
  });

  it('returns null for anything that is not an object, and an empty day for {}', () => {
    expect(m.toDayCrowd(null)).toBeNull();
    expect(m.toDayCrowd([1, 2])).toBeNull();
    expect(m.toDayCrowd('{"players":1}')).toBeNull();
    expect(m.toDayCrowd({})).toEqual({ players: 0, rounds: [null, null, null, null, null, null], points: new Array(19).fill(0) });
  });
});

describe('when not configured', () => {
  it('is disabled and completely inert', async () => {
    expect(m.communityEnabled()).toBe(false);
    m.recordPick(2, 1, 3, 'clear');
    m.recordFinish(2, 12, 2);
    expect(await m.fetchDay(2)).toBeNull();
    await m.whenSent();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.length).toBe(0);
  });

  it('needs both values, and a real https URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', URL_);
    expect(m.communityEnabled()).toBe(false);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '   ');
    expect(m.communityEnabled()).toBe(false);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', KEY);
    expect(m.communityEnabled()).toBe(true);
    vi.stubEnv('VITE_SUPABASE_URL', 'http://abc123.supabase.co');
    expect(m.communityEnabled()).toBe(false);
    vi.stubEnv('VITE_SUPABASE_URL', 'not a url');
    expect(m.communityEnabled()).toBe(false);
  });
});

describe('when configured', () => {
  beforeEach(enable);

  it('sends a pick once per device per (day, round), with only the expected fields', async () => {
    expect(m.communityEnabled()).toBe(true);
    m.recordPick(2, 3, 4, 'straw');
    await m.whenSent();
    m.recordPick(2, 3, 4, 'straw');
    await m.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL_}/rest/v1/picks`);
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers.apikey).toBe(KEY);
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(headers.Prefer).toBe('return=minimal');
    const sent = body(fetchMock.mock.calls[0]);
    expect(Object.keys(sent).sort()).toEqual(['day', 'device', 'grade', 'round', 'slot']);
    expect(sent).toMatchObject({ day: 2, round: 3, slot: 4, grade: 'straw' });
    expect(String(sent.device)).toMatch(UUID_RE);

    // Device id + sent marker live in localStorage.
    const saved = JSON.parse(store.getItem(m.CROWD_STORAGE_KEY) ?? '{}');
    expect(saved.device).toBe(sent.device);
    expect(saved.sent).toContain('2:3');

    // Another round the same day is a separate pick.
    m.recordPick(2, 4, 0, 'clear');
    await m.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body(fetchMock.mock.calls[1]).device).toBe(sent.device);
  });

  it('keeps the same device id across reloads', async () => {
    m.recordPick(2, 1, 0, 'clear');
    await m.whenSent();
    const first = body(fetchMock.mock.calls[0]).device;
    const again = await load();
    again.recordPick(2, 2, 1, 'amber');
    again.recordPick(2, 1, 0, 'clear'); // already sent before the reload
    await again.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body(fetchMock.mock.calls[1]).device).toBe(first);
  });

  it('does not double-send while a request is still in flight', async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => (release = res)));
    m.recordPick(2, 1, 0, 'clear');
    m.recordPick(2, 1, 0, 'clear');
    release(created());
    await m.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a finish once per device per day', async () => {
    m.recordFinish(2, 14, 3);
    m.recordFinish(2, 14, 3);
    await m.whenSent();
    m.recordFinish(2, 14, 3);
    await m.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${URL_}/rest/v1/finishes`);
    const sent = body(fetchMock.mock.calls[0]);
    expect(Object.keys(sent).sort()).toEqual(['clears', 'day', 'device', 'points']);
    expect(sent).toMatchObject({ day: 2, points: 14, clears: 3 });
  });

  it('never sends values the database would reject', async () => {
    m.recordPick(0, 1, 0, 'clear');
    m.recordPick(2, 0, 0, 'clear');
    m.recordPick(2, 7, 0, 'clear');
    m.recordPick(2, 1, -1, 'clear');
    m.recordPick(2, 1, 10, 'clear');
    m.recordPick(2, 1, 1.5, 'clear');
    m.recordPick(2, 1, 0, 'gold' as Grade);
    m.recordFinish(2, 19, 6);
    m.recordFinish(2, 18, 2); // 2 clears can score at most 6 + 4 * 2 = 14
    m.recordFinish(2, 5, 2); // 2 clears score at least 6
    m.recordFinish(2, 12, 7);
    await m.whenSent();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries next time after a network failure or server error, but not after a duplicate', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    m.recordPick(2, 1, 0, 'clear');
    await m.whenSent();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    m.recordPick(2, 1, 0, 'clear');
    await m.whenSent();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 409 }));
    m.recordPick(2, 1, 0, 'clear');
    await m.whenSent();
    m.recordPick(2, 1, 0, 'clear');
    await m.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('works (deduping in memory) when localStorage is blocked', async () => {
    vi.stubGlobal('localStorage', throwingStorage());
    const fresh = await load();
    expect(() => fresh.recordPick(2, 1, 0, 'clear')).not.toThrow();
    await fresh.whenSent();
    fresh.recordPick(2, 1, 0, 'clear');
    await fresh.whenSent();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(body(fetchMock.mock.calls[0]).device)).toMatch(UUID_RE);
  });

  it('fetchDay calls the day_stats RPC and maps the result', async () => {
    fetchMock.mockResolvedValueOnce(json({ players: 2, rounds: [[1, 0, 1], [1, 2, 1]], points: [[12, 2]] }));
    const crowd = await m.fetchDay(5, [4, 4, 4, 4, 4, 4]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL_}/rest/v1/rpc/day_stats`);
    expect(JSON.parse(String(init?.body))).toEqual({ p_day: 5 });
    expect(crowd).toEqual({
      players: 2,
      rounds: [{ total: 2, bySlot: [1, 0, 1, 0] }, null, null, null, null, null],
      points: hist(12, 12),
    });
  });

  it("fetchDay sizes rounds to the day's generated rooms by default", async () => {
    fetchMock.mockResolvedValueOnce(json({ players: 1, rounds: [1, 2, 3, 4, 5, 6].map((r) => [r, 0, 1]), points: [] }));
    const crowd = await m.fetchDay(2);
    const sizes = dailyRounds('2026-10-29').map((r) => r.bathroom.slots.length);
    expect(crowd!.rounds.map((r) => r?.bySlot.length)).toEqual(sizes);
  });

  it("fetchDay waits for this device's pending picks so you're counted", async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => (release = res)));
    fetchMock.mockImplementationOnce(async () => json({ players: 1, rounds: [[1, 0, 1]], points: [] }));
    m.recordPick(2, 1, 0, 'clear');
    const pending = m.fetchDay(2, [3, 3, 3, 3, 3, 3]);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release(created());
    const crowd = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('rpc/day_stats');
    expect(crowd!.rounds[0]).toEqual({ total: 1, bySlot: [1, 0, 0] });
  });

  it('fetchDay resolves null on errors, bad JSON or a rejected request', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'nope' }, 404));
    expect(await m.fetchDay(2)).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    expect(await m.fetchDay(2)).toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await m.fetchDay(2)).toBeNull();
    fetchMock.mockResolvedValueOnce(json('just a string'));
    expect(await m.fetchDay(2)).toBeNull();
    expect(await m.fetchDay(0)).toBeNull();
  });

  it('gives up after the timeout on a dead network', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    let settled = false;
    let value: unknown = 'pending';
    void m.fetchDay(2).then((v) => {
      settled = true;
      value = v;
    });
    await vi.advanceTimersByTimeAsync(m.REQUEST_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    expect(value).toBeNull();

    // A hung write doesn't stay "in flight" forever either.
    m.recordPick(2, 1, 0, 'clear');
    await vi.advanceTimersByTimeAsync(m.REQUEST_TIMEOUT_MS);
    await m.whenSent();
    expect(store.getItem(m.CROWD_STORAGE_KEY) ?? '').not.toContain('2:1');
  });
});
