import { describe, expect, it } from 'vitest';
import type { Reason, RoundResult } from '../types';
import { VERDICTS } from '../content';
import { STORAGE_KEY, defaultSave, loadSave, migrate, recordPractice, resetProgress, saveSave, withPracticeCurrent } from './storage';

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

const r = (i: number, grade: RoundResult['grade'] = 'clear'): RoundResult => ({
  roundId: `d2026-10-28-r${i}`,
  pick: i,
  grade,
  reason: grade === 'clear' ? 'perfect' : grade === 'straw' ? 'too-close' : 'adjacent',
});

describe('migrate', () => {
  it('turns garbage into a default save', () => {
    for (const junk of [null, undefined, 42, 'not json', '[]', [], { version: 'x' }]) {
      expect(migrate(junk)).toEqual(defaultSave());
    }
  });

  it('round-trips a valid save', () => {
    const s = defaultSave();
    s.settings = { sound: false, reducedMotion: true };
    s.seenTutorial = true;
    s.practice = { played: 10, greens: 7, bestRun: 4 };
    s.daily = {
      byDate: { '2026-10-28': { dateKey: '2026-10-28', number: 1, results: [1, 2, 3, 4, 5, 6].map((i) => r(i)), finished: true } },
      streak: 1,
      bestStreak: 3,
      lastDate: '2026-10-28',
    };
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(migrate(JSON.stringify(s))).toEqual(s);
  });

  it('drops invalid records and results, and recomputes finished', () => {
    const out = migrate({
      daily: {
        byDate: {
          garbage: { results: [] },
          '2026-10-27': 'nope',
          '2026-10-28': {
            number: 1,
            finished: true,
            results: [r(1), { roundId: 'x', pick: -1, grade: 'clear', reason: 'perfect' }, { ...r(2), grade: 'purple' }, r(1), r(3, 'amber')],
          },
        },
        streak: -4,
        bestStreak: 'lots',
        lastDate: 'yesterday',
      },
    });
    expect(Object.keys(out.daily.byDate)).toEqual(['2026-10-28']);
    const rec = out.daily.byDate['2026-10-28'];
    expect(rec.results.map((x) => x.roundId)).toEqual(['d2026-10-28-r1', 'd2026-10-28-r3']);
    expect(rec.finished).toBe(false);
    expect(out.daily.streak).toBe(0);
    expect(out.daily.bestStreak).toBe(0);
    expect(out.daily.lastDate).toBeUndefined();
  });

  it('caps a record at 6 results and marks it finished', () => {
    const out = migrate({
      daily: { byDate: { '2026-10-28': { number: 1, results: [1, 2, 3, 4, 5, 6, 7].map((i) => r(i)), finished: false } } },
    });
    expect(out.daily.byDate['2026-10-28'].results).toHaveLength(6);
    expect(out.daily.byDate['2026-10-28'].finished).toBe(true);
  });

  it('keeps best streak at least the current streak and greens at most played', () => {
    const out = migrate({ daily: { streak: 5, bestStreak: 2 }, practice: { played: 3, greens: 9, bestRun: 2 } });
    expect(out.daily.bestStreak).toBe(5);
    expect(out.practice.greens).toBe(3);
  });
});

describe('every reason survives a reload', () => {
  it('keeps saved results for all reasons the engine can produce (VERDICTS keys)', () => {
    // One reason per day (a day holds at most 6 results).
    const reasons = Object.keys(VERDICTS) as Reason[];
    const s = defaultSave();
    reasons.forEach((reason, i) => {
      const key = `2027-01-${String(i + 1).padStart(2, '0')}`;
      const result: RoundResult = { roundId: `d${key}-r1`, pick: 0, grade: 'doctor', reason };
      s.daily.byDate[key] = { dateKey: key, number: i + 1, results: [result], finished: false };
    });
    const back = migrate(JSON.parse(JSON.stringify(s)));
    const kept = Object.values(back.daily.byDate).flatMap((d) => d.results.map((r) => r.reason));
    expect(kept.sort()).toEqual([...reasons].sort());
  });
});

describe('load/save', () => {
  it('persists under urinal:v1', () => {
    const store = memoryStorage();
    const s = { ...defaultSave(), seenTutorial: true };
    expect(saveSave(s, store)).toBe(true);
    expect(store.getItem(STORAGE_KEY)).toContain('"seenTutorial":true');
    expect(STORAGE_KEY).toBe('urinal:v1');
    expect(loadSave(store)).toEqual(s);
  });

  it('survives missing or blocked storage', () => {
    expect(loadSave(null)).toEqual(defaultSave());
    expect(loadSave(throwingStorage())).toEqual(defaultSave());
    expect(saveSave(defaultSave(), null)).toBe(false);
    expect(saveSave(defaultSave(), throwingStorage())).toBe(false);
  });

  it('survives corrupt JSON', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, '{oops');
    expect(loadSave(store)).toEqual(defaultSave());
  });
});

describe('pure helpers', () => {
  it('recordPractice counts plays, greens and best run', () => {
    let s = defaultSave();
    s = recordPractice(s, 'clear', 1);
    s = recordPractice(s, 'clear', 2);
    s = recordPractice(s, 'amber', 0);
    expect(s.practice).toEqual({ played: 3, greens: 2, bestRun: 2 });
  });

  it('resetProgress keeps settings and the tutorial flag', () => {
    const s = { ...defaultSave(), settings: { sound: false, reducedMotion: true }, seenTutorial: true };
    s.practice = { played: 4, greens: 1, bestRun: 1 };
    const out = resetProgress(s);
    expect(out.settings).toEqual(s.settings);
    expect(out.seenTutorial).toBe(true);
    expect(out.practice.played).toBe(0);
  });
});

describe('Endless room in progress', () => {
  it('survives a save/load round trip and a grade, and reset clears it', () => {
    let s = withPracticeCurrent(defaultSave(), { seed: 12345, run: 3, history: ['clear', 'clear', 'clear'], done: false });
    s = recordPractice(s, 'clear', 4);
    expect(s.practice.current).toEqual({ seed: 12345, run: 3, history: ['clear', 'clear', 'clear'], done: false });
    const back = migrate(JSON.stringify(s));
    expect(back.practice.current).toEqual(s.practice.current);
    expect(back.practice.bestRun).toBe(4);
    expect(resetProgress(back).practice.current).toBeUndefined();
  });

  it('drops a junk current room and caps the history', () => {
    expect(migrate({ version: 1, practice: { current: { seed: -1 } } }).practice.current).toBeUndefined();
    const long = withPracticeCurrent(defaultSave(), { seed: 1, run: 0, history: Array(20).fill('straw'), done: true });
    expect(long.practice.current?.history).toHaveLength(12);
    expect(migrate({ version: 1, practice: { current: { seed: 7, history: ['clear', 'nope'] } } }).practice.current).toEqual({
      seed: 7,
      run: 0,
      history: ['clear'],
      done: false,
    });
  });
});
