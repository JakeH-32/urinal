import { describe, expect, it } from 'vitest';
import type { RoundResult, SaveData } from '../types';
import { defaultSave } from './storage';
import {
  applyDailyResets,
  daysBetween,
  displayStreak,
  formatCountdown,
  msUntilNextDaily,
  recordRound,
  scanStreak,
  shiftDateKey,
  streakSavedYesterday,
  toDateKey,
} from './dailyStreak';
import { migrate } from './storage';

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

  it('finishes at 5 and starts a streak', () => {
    const s = finishDays(['2026-10-28']);
    expect(s.daily.byDate['2026-10-28'].finished).toBe(true);
    expect(s.daily.byDate['2026-10-28'].results).toHaveLength(5);
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

  it('resets after a two-day gap but keeps the best streak', () => {
    const s = finishDays(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06']);
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(3);
    expect(finishDays(['2026-10-07'], s).daily.streak).toBe(2);
  });

  it('an unfinished day counts as a missed day', () => {
    let s = finishDays(['2026-10-01']);
    s = recordRound(s, '2026-10-02', 2, result('2026-10-02', 1));
    s = finishDays(['2026-10-03'], s);
    expect(s.daily.streak).toBe(2);
    s = recordRound(s, '2026-10-04', 4, result('2026-10-04', 1));
    s = finishDays(['2026-10-05'], s);
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

  it('survives one skipped day, shows 0 after two', () => {
    expect(displayStreak(d, '2026-10-16')).toBe(2);
    expect(displayStreak(d, '2026-10-17')).toBe(0);
    expect(displayStreak(defaultSave().daily, '2026-10-16')).toBe(0);
  });
});

describe('streak grace', () => {
  /** Every day from `from` for `n` days, minus the skipped ones. */
  const run = (from: string, n: number, skip: string[] = []) =>
    Array.from({ length: n }, (_, i) => shiftDateKey(from, i)).filter((k) => !skip.includes(k));

  /** The stored streak must match a from-scratch recount after every finished day. */
  function playChecked(keys: string[]): SaveData {
    let s = defaultSave();
    let best = 0;
    for (const k of keys) {
      s = finishDays([k], s);
      const scan = scanStreak(s.daily.byDate);
      best = Math.max(best, scan.current);
      expect(s.daily.streak).toBe(scan.current);
      expect(s.daily.bestStreak).toBe(scan.best);
      expect(s.daily.bestStreak).toBe(best);
      expect(s.daily.lastDate).toBe(k);
      expect(displayStreak(s.daily, k)).toBe(s.daily.streak);
      expect(displayStreak(s.daily, shiftDateKey(k, 1))).toBe(s.daily.streak);
    }
    return s;
  }

  it('counts days', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // US clocks change on the 8th
    expect(daysBetween('2026-11-02', '2026-11-01')).toBe(-1);
  });

  it('forgives one missed day without counting it', () => {
    // Mon, (Tue missed), Wed
    const s = playChecked(['2026-11-02', '2026-11-04']);
    expect(s.daily.streak).toBe(2);
    expect(s.daily.bestStreak).toBe(2);
    expect(displayStreak(s.daily, '2026-11-04')).toBe(2);
    expect(streakSavedYesterday(s, '2026-11-04')).toBe(true);
    // The day after, it's old news.
    expect(streakSavedYesterday(s, '2026-11-05')).toBe(false);
    expect(streakSavedYesterday(finishDays(['2026-11-05'], s), '2026-11-05')).toBe(false);
  });

  it('holds the streak through the day after a miss, then lets go', () => {
    const s = playChecked(['2026-11-02', '2026-11-03']);
    expect(streakSavedYesterday(s, '2026-11-04')).toBe(false);
    expect(displayStreak(s.daily, '2026-11-05')).toBe(2);
    expect(streakSavedYesterday(s, '2026-11-05')).toBe(true);
    expect(displayStreak(s.daily, '2026-11-06')).toBe(0);
    expect(streakSavedYesterday(s, '2026-11-06')).toBe(false);
  });

  it('two missed days in a row break it', () => {
    const s = playChecked(['2026-11-02', '2026-11-03', '2026-11-06']);
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(2);
    expect(streakSavedYesterday(s, '2026-11-06')).toBe(false);
  });

  it('a second missed day inside the same week breaks it', () => {
    // Missed the 3rd (forgiven) and the 9th (6 days later: not forgiven).
    const s = playChecked(run('2026-11-02', 9, ['2026-11-03', '2026-11-09']));
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(6);
    // Before playing the 10th, the streak already reads as gone.
    const before = playChecked(run('2026-11-02', 7, ['2026-11-03']));
    expect(displayStreak(before.daily, '2026-11-09')).toBe(6);
    expect(displayStreak(before.daily, '2026-11-10')).toBe(0);
    expect(streakSavedYesterday(before, '2026-11-10')).toBe(false);
  });

  it('a missed day a full week after the last forgiven one is forgiven', () => {
    // Missed the 3rd and the 10th.
    const s = playChecked(run('2026-11-02', 10, ['2026-11-03', '2026-11-10']));
    expect(s.daily.streak).toBe(8);
    expect(streakSavedYesterday(s, '2026-11-11')).toBe(true);
  });

  it('keeps a long streak alive through well-spaced misses, across month and year ends', () => {
    const skip = ['2026-11-30', '2026-12-09', '2026-12-31', '2027-01-08', '2027-02-28'];
    const s = playChecked(run('2026-11-20', 110, skip));
    expect(s.daily.streak).toBe(105);
    expect(s.daily.bestStreak).toBe(105);
    expect(s.daily.lastDate).toBe('2027-03-09');
  });

  it('forgives across a month end and a year end', () => {
    expect(playChecked(['2026-10-30', '2026-11-01']).daily.streak).toBe(2);
    const s = playChecked(['2026-12-30', '2027-01-01']);
    expect(s.daily.streak).toBe(2);
    expect(streakSavedYesterday(s, '2027-01-01')).toBe(true);
    expect(displayStreak(playChecked(['2026-12-30']).daily, '2027-01-01')).toBe(1);
  });

  it('a save with no days has no streak', () => {
    const s = defaultSave();
    expect(scanStreak(s.daily.byDate)).toEqual({ current: 0, best: 0 });
    expect(displayStreak(s.daily, '2026-11-09')).toBe(0);
    expect(streakSavedYesterday(s, '2026-11-09')).toBe(false);
  });

  it('an old save needs no migration, and never reads lower than before', () => {
    // Saved under the old rule: 1st-3rd, missed the 4th, played the 5th (stored streak 1, best 3).
    const played = finishDays(run('2026-10-01', 5, ['2026-10-04']));
    const old = migrate(JSON.stringify({ ...played, daily: { ...played.daily, streak: 1, bestStreak: 3 } }));
    expect(displayStreak(old.daily, '2026-10-06')).toBe(4);
    const next = finishDays(['2026-10-06'], old);
    expect(next.daily.streak).toBe(5);
    expect(next.daily.bestStreak).toBe(5);
    // A stored streak with holes in its history still stands.
    const holes = migrate({ daily: { streak: 9, bestStreak: 9, lastDate: '2026-10-05', byDate: {} } });
    expect(displayStreak(holes.daily, '2026-10-06')).toBe(9);
    expect(displayStreak(holes.daily, '2026-10-07')).toBe(0);
    expect(finishDays(['2026-10-06'], holes).daily.streak).toBe(10);
  });
});

describe('countdown', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextDaily(new Date(2026, 9, 15, 23, 59, 0))).toBe(60_000);
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});

describe('applyDailyResets', () => {
  const day = (save: SaveData, key: string, n: number) => {
    let s = save;
    for (let i = 0; i < 6; i++) s = recordRound(s, key, n, { roundId: `${key}-${i}`, pick: 0, grade: 'clear', reason: 'perfect' });
    return s;
  };
  const played = day(day(defaultSave(), '2026-10-28', 1), '2026-10-29', 2);

  it('clears the reset day on that day, once, and rebuilds the streak', () => {
    expect(played.daily.streak).toBe(2);
    const after = applyDailyResets(played, '2026-10-29', ['2026-10-29']);
    expect(after.daily.byDate['2026-10-29']).toBeUndefined();
    expect(after.daily.byDate['2026-10-28']?.finished).toBe(true);
    expect(after.daily).toMatchObject({ streak: 1, bestStreak: 1, lastDate: '2026-10-28', resets: ['2026-10-29'] });
    // Replaying today counts again, and a reload doesn't wipe the replay.
    const replayed = day(after, '2026-10-29', 2);
    expect(replayed.daily.streak).toBe(2);
    const reloaded = applyDailyResets(migrate(JSON.stringify(replayed)), '2026-10-29', ['2026-10-29']);
    expect(reloaded.daily.byDate['2026-10-29']?.finished).toBe(true);
  });

  it('on a later day only marks it applied: old days are kept', () => {
    const later = applyDailyResets(played, '2026-10-30', ['2026-10-29']);
    expect(later.daily.byDate['2026-10-29']?.finished).toBe(true);
    expect(later.daily.resets).toEqual(['2026-10-29']);
    expect(applyDailyResets(later, '2026-10-30', ['2026-10-29'])).toBe(later);
  });
});
