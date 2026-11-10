import { describe, expect, it } from 'vitest';
import type { DailyRecord } from '../types';
import { resultFromEvaluation } from '../modes/roundLogic';
import { activeChallenge, adoptChallenge, getChallengeName, setChallengeName, VS_STORAGE_KEY } from '../state/challengeStore';
import { challengeResults, challengeUrl, cleanChallengeName, decodeChallenge, encodeChallenge, readChallenge } from './challenge';
import { evaluate } from './code';
import { dailyNumber } from './daily';
import { dailyRounds } from './generate';

const DAY = '2026-11-09';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  } as Storage;
}

/** The answer in every room of a day. */
function bestPicks(day: string): number[] {
  return dailyRounds(day).map((r) => evaluate(r.bathroom).greens[0]);
}

function recordOf(day: string, picks: number[]): DailyRecord {
  const results = dailyRounds(day).map((r, i) => resultFromEvaluation(r.id, picks[i], evaluate(r.bathroom)));
  return { dateKey: day, number: dailyNumber(day), results, finished: true };
}

describe('encodeChallenge / decodeChallenge', () => {
  it('round-trips number, picks and name', () => {
    const code = encodeChallenge({ number: 13, picks: [4, 7, 2, 1, 5], name: 'Jake' });
    expect(code).toBe('13-47215-Jake');
    expect(decodeChallenge(code)).toEqual({ number: 13, picks: [4, 7, 2, 1, 5], name: 'Jake' });
  });

  it('round-trips without a name, and with leading-zero picks', () => {
    const code = encodeChallenge({ number: 1, picks: [0, 0, 9, 0, 3] });
    expect(code).toBe('1-00903');
    expect(decodeChallenge(code)).toEqual({ number: 1, picks: [0, 0, 9, 0, 3] });
  });

  it('keeps awkward names URL-safe and intact', () => {
    for (const name of ['Big J', "D'Arcy", 'A-B-C', 'José', '100%', 'a&b=c#d', '(me)!*', '😀 Jo']) {
      const code = encodeChallenge({ number: 20, picks: [1, 2, 3, 4, 5], name });
      expect(code).toMatch(/^[A-Za-z0-9\-_.~%]+$/);
      expect(decodeChallenge(code)).toEqual({ number: 20, picks: [1, 2, 3, 4, 5], name });
      expect(readChallenge(`?vs=${code}`)).toEqual({ number: 20, picks: [1, 2, 3, 4, 5], name });
    }
  });

  it('sanitises names: trimmed, one line, 12 characters at most', () => {
    expect(cleanChallengeName('  Jake  ')).toBe('Jake');
    expect(cleanChallengeName('Jake\n\tthe\u0000Snake')).toBe('Jake the Sna');
    expect(cleanChallengeName('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijkl');
    expect(cleanChallengeName('   ')).toBe('');
    expect(cleanChallengeName(undefined)).toBe('');
    expect(cleanChallengeName('<b>hi</b>')).toBe('<b>hi</b>');
    expect(encodeChallenge({ number: 2, picks: [1, 1, 1, 1, 1], name: '   ' })).toBe('2-11111');
    const long = decodeChallenge(`2-11111-${'x'.repeat(40)}`);
    expect(long?.name).toBe('x'.repeat(12));
    // A name that won't decode is dropped; the picks still count.
    expect(decodeChallenge('2-11111-%E0%A4%A')).toEqual({ number: 2, picks: [1, 1, 1, 1, 1] });
  });

  it('refuses picks or numbers it cannot carry', () => {
    expect(encodeChallenge({ number: 13, picks: [1, 2, 3, 4] })).toBeNull();
    expect(encodeChallenge({ number: 13, picks: [1, 2, 3, 4, 5, 6] })).toBeNull();
    expect(encodeChallenge({ number: 13, picks: [1, 2, 3, 4, 10] })).toBeNull();
    expect(encodeChallenge({ number: 13, picks: [1, 2, 3, 4, -1] })).toBeNull();
    expect(encodeChallenge({ number: 13, picks: [1, 2, 3, 4, 1.5] })).toBeNull();
    expect(encodeChallenge({ number: 0, picks: [1, 2, 3, 4, 5] })).toBeNull();
    expect(encodeChallenge({ number: 1e9, picks: [1, 2, 3, 4, 5] })).toBeNull();
    expect(encodeChallenge({ number: NaN, picks: [1, 2, 3, 4, 5] })).toBeNull();
  });

  it('rejects garbage without throwing', () => {
    const bad: unknown[] = [
      '',
      'hello',
      '13',
      '13-',
      '13-4721',
      '13-472155',
      '13-4721x',
      '13-47 15',
      'x3-47215',
      '-47215',
      '0-47215',
      '999999-47215',
      '1e3-47215',
      '13_47215',
      ' 13-47215',
      '13-47215'.padEnd(400, 'x'),
      null,
      undefined,
      42,
      {},
      [],
    ];
    for (const b of bad) expect(decodeChallenge(b)).toBeNull();
  });
});

describe('readChallenge', () => {
  it('finds vs among other parameters', () => {
    expect(readChallenge('?vs=13-47215-Jake')).toEqual({ number: 13, picks: [4, 7, 2, 1, 5], name: 'Jake' });
    expect(readChallenge('?day=2026-11-09&vs=13-47215')).toEqual({ number: 13, picks: [4, 7, 2, 1, 5] });
    expect(readChallenge('?vs=13-47215&utm_source=x')).toEqual({ number: 13, picks: [4, 7, 2, 1, 5] });
  });
  it('gives null for nothing or nonsense', () => {
    expect(readChallenge('')).toBeNull();
    expect(readChallenge('?day=2026-11-09')).toBeNull();
    expect(readChallenge('?vs=')).toBeNull();
    expect(readChallenge('?vs=%%%')).toBeNull();
    expect(readChallenge('?canvs=13-47215')).toBeNull();
    expect(readChallenge(undefined)).toBeNull();
  });
});

describe('challengeUrl', () => {
  it('puts the payload before the hash route', () => {
    const picks = bestPicks(DAY);
    const rec = recordOf(DAY, picks);
    const url = challengeUrl(rec, 'Jake');
    expect(url).toBe(`https://urinal.app/?vs=${rec.number}-${picks.join('')}-Jake#/daily`);
    const u = new URL(url);
    expect(u.hash).toBe('#/daily');
    expect(readChallenge(u.search)).toEqual({ number: rec.number, picks, name: 'Jake' });
    expect(challengeUrl(rec)).toBe(`https://urinal.app/?vs=${rec.number}-${picks.join('')}#/daily`);
  });
  it('falls back to the plain link for an unfinished record', () => {
    const rec = recordOf(DAY, bestPicks(DAY));
    expect(challengeUrl({ ...rec, results: rec.results.slice(0, 3), finished: false }, 'Jake')).toBe('https://urinal.app/#/daily');
  });
});

describe('challengeResults', () => {
  it('grades the picks exactly as playing them would', () => {
    const rounds = dailyRounds(DAY);
    const picks = bestPicks(DAY);
    const res = challengeResults(rounds, picks);
    expect(res).toEqual(recordOf(DAY, picks).results);
    expect(res?.every((r) => r.grade === 'clear')).toBe(true);
  });

  it('grades a bad pick as bad', () => {
    const rounds = dailyRounds(DAY);
    const picks = bestPicks(DAY);
    const ev = evaluate(rounds[0].bathroom);
    const miss = ev.slots.find((s) => s.pickable && s.grade !== 'clear');
    if (!miss) return;
    const res = challengeResults(rounds, [miss.index, ...picks.slice(1)]);
    expect(res?.[0].grade).toBe(miss.grade);
  });

  it('is null when a pick is not a spot you could take', () => {
    const rounds = dailyRounds(DAY);
    const picks = bestPicks(DAY);
    const taken = rounds.map((r) => r.bathroom.slots.findIndex((s) => s.occupant));
    const k = taken.findIndex((i) => i >= 0);
    expect(k).toBeGreaterThanOrEqual(0);
    const occupied = [...picks];
    occupied[k] = taken[k];
    expect(challengeResults(rounds, occupied)).toBeNull();
    const outOfRange = [...picks];
    outOfRange[0] = rounds[0].bathroom.slots.length;
    expect(challengeResults(rounds, outOfRange)).toBeNull();
    expect(challengeResults(rounds, picks.slice(0, 4))).toBeNull();
    expect(challengeResults(rounds.slice(0, 4), picks)).toBeNull();
    expect(challengeResults(rounds, [NaN, ...picks.slice(1)])).toBeNull();
  });

  it('every pick of the next two months fits in one digit', () => {
    const d = new Date(2026, 10, 9, 12);
    for (let i = 0; i < 60; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      for (const r of dailyRounds(key)) expect(r.bathroom.slots.length).toBeLessThanOrEqual(10);
      d.setDate(d.getDate() + 1);
    }
  });
});

describe('challenge store', () => {
  it('adopts a link for today and keeps it for a reload without the query', () => {
    const s = fakeStorage();
    expect(adoptChallenge('?vs=13-47215-Jake', 13, s)).toEqual({ challenge: { number: 13, picks: [4, 7, 2, 1, 5], name: 'Jake' } });
    expect(adoptChallenge('', 13, s).challenge?.name).toBe('Jake');
    expect(activeChallenge(13, s)?.picks).toEqual([4, 7, 2, 1, 5]);
  });
  it('ignores a stored challenge on another day', () => {
    const s = fakeStorage();
    adoptChallenge('?vs=13-47215-Jake', 13, s);
    expect(activeChallenge(14, s)).toBeNull();
    expect(adoptChallenge('', 14, s)).toEqual({ challenge: null });
  });
  it('reports a link for another day as stale and keeps today’s', () => {
    const s = fakeStorage();
    expect(adoptChallenge('?vs=12-47215-Jake', 13, s)).toEqual({ challenge: null, staleNumber: 12 });
    expect(s.getItem(VS_STORAGE_KEY)).toBeNull();
    adoptChallenge('?vs=13-11111-Ann', 13, s);
    expect(adoptChallenge('?vs=12-47215-Jake', 13, s)).toEqual({ challenge: { number: 13, picks: [1, 1, 1, 1, 1], name: 'Ann' }, staleNumber: 12 });
  });
  it('survives blocked or corrupt storage', () => {
    const s = fakeStorage();
    s.setItem(VS_STORAGE_KEY, '{"nope":1}');
    expect(activeChallenge(13, s)).toBeNull();
    expect(adoptChallenge('?vs=13-47215', 13, null).challenge?.number).toBe(13);
    expect(activeChallenge(13, null)).toBeNull();
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(adoptChallenge('?vs=13-47215', 13, broken).challenge?.number).toBe(13);
    expect(getChallengeName(broken)).toBe('');
  });
  it('saves and clears the player’s own name', () => {
    const s = fakeStorage();
    expect(getChallengeName(s)).toBe('');
    setChallengeName('  Jake the Snake of Denver ', s);
    expect(getChallengeName(s)).toBe('Jake the Sna');
    setChallengeName('  ', s);
    expect(getChallengeName(s)).toBe('');
  });
});
