import { describe, expect, it } from 'vitest';
import type { RoundResult, SaveData } from '../types';
import { defaultSave } from './storage';
import { displayStreak, formatCountdown, msUntilNextDaily, recordRound, shiftDateKey, toDateKey } from './dailyStreak';

const result = (dateKey: string, i: number, grade: RoundResult['grade'] = 'clear'): RoundResult => ({
  roundId: `d${dateKey}-r${i}`,
  pick: 0,
  grade,
  reason: grade === 'clear' ? 'perfect' : 'adjacent',
});

/** Play all 6 rounds of each date in order. */
function finishDays(keys: string[], start: SaveData = defaultSave()): SaveData {
  return keys.reduce((s, k, n) => {
    for (let i = 1; i <= 6; i++) s = recordRound(s, k, n + 1, result(k, i));
    return s;
  }, start);
}

describe('date keys', () => {
  it('formats local dates', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('shifts across month, year and leap boundaries', () => {
    expect(shiftDateKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDateKey('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateKey('2026-03-08', 1)).toBe('2026-03-09');
    expect(shiftDateKey('garbage', 1)).toBe('garbage');
  });
});

describe('recordRound', () => {
  it('appends to an in-progress record without touching the streak', () => {
    let s = defaultSave();
    s = recordRound(s, '2026-10-28', 1, result('2026-10-28', 1));
    s = recordRound(s, '2026-10-28', 1, result('2026-10-28', 2, 'doctor'));
    const rec = s.daily.byDate['2026-10-28'];
    expect(rec).toMatchObject({ dateKey: '2026-10-28', number: 1, finished: false });
    expect(rec.results.map((r) => r.grade)).toEqual(['clear', 'doctor']);
    expect(s.daily.streak).toBe(0);
    expect(s.daily.lastDate).toBeUndefined();
  });

  it('finishes at 6 and starts a streak', () => {
    const s = finishDays(['2026-10-28']);
    expect(s.daily.byDate['2026-10-28'].finished).toBe(true);
    expect(s.daily.byDate['2026-10-28'].results).toHaveLength(6);
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(1);
    expect(s.daily.lastDate).toBe('2026-10-28');
  });

  it('ignores a duplicate round id and anything after the day is finished', () => {
    let s = recordRound(defaultSave(), '2026-10-28', 1, result('2026-10-28', 1));
    expect(recordRound(s, '2026-10-28', 1, result('2026-10-28', 1, 'amber'))).toBe(s);
    s = finishDays(['2026-10-28']);
    expect(recordRound(s, '2026-10-28', 1, result('2026-10-28', 7))).toBe(s);
  });

  it('counts consecutive days, including across month ends', () => {
    const s = finishDays(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(s.daily.streak).toBe(4);
    expect(s.daily.bestStreak).toBe(4);
  });

  it('resets after a gap but keeps the best streak', () => {
    const s = finishDays(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05']);
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(3);
    expect(finishDays(['2026-10-06'], s).daily.streak).toBe(2);
  });

  it('an unfinished day breaks the streak', () => {
    let s = finishDays(['2026-10-01']);
    s = recordRound(s, '2026-10-02', 2, result('2026-10-02', 1));
    s = finishDays(['2026-10-03'], s);
    expect(s.daily.streak).toBe(1);
  });

  it('is pure', () => {
    const s = defaultSave();
    recordRound(s, '2026-10-28', 1, result('2026-10-28', 1));
    expect(s).toEqual(defaultSave());
  });
});

describe('displayStreak', () => {
  const d = finishDays(['2026-10-13', '2026-10-14']).daily;

  it('shows the streak if you finished today or yesterday', () => {
    expect(displayStreak(d, '2026-10-14')).toBe(2);
    expect(displayStreak(d, '2026-10-15')).toBe(2);
  });

  it('shows 0 once a day has been skipped', () => {
    expect(displayStreak(d, '2026-10-16')).toBe(0);
    expect(displayStreak(defaultSave().daily, '2026-10-16')).toBe(0);
  });
});

describe('countdown', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextDaily(new Date(2026, 9, 15, 23, 59, 0))).toBe(60_000);
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});
