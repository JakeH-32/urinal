import { describe, expect, it } from 'vitest';
import { RESULT_TITLES } from '../content';
import type { DailyRecord, Grade } from '../types';
import { buildShareText, dailyNumber, dateKeyOf } from './daily';

function record(grades: Grade[], finished = grades.length === 6): DailyRecord {
  return {
    dateKey: '2026-11-08',
    number: 12,
    finished,
    results: grades.map((grade, i) => ({ roundId: `r${i}`, pick: 0, grade, reason: 'perfect' })),
  };
}

describe('dailyNumber', () => {
  it('epoch is #1', () => {
    expect(dailyNumber('2026-10-28')).toBe(1);
    expect(dailyNumber('2026-10-29')).toBe(2);
    expect(dailyNumber('2026-10-27')).toBe(0);
  });

  it('survives DST boundaries (US: 2026-11-01, 2027-03-14; EU: 2027-03-28)', () => {
    expect(dailyNumber('2026-10-31')).toBe(4);
    expect(dailyNumber('2026-11-01')).toBe(5);
    expect(dailyNumber('2026-11-02')).toBe(6);
    expect(dailyNumber('2026-11-08')).toBe(12);
    expect(dailyNumber('2027-03-13')).toBe(137);
    expect(dailyNumber('2027-03-14')).toBe(138);
    expect(dailyNumber('2027-03-15')).toBe(139);
    expect(dailyNumber('2027-03-29')).toBe(153);
    expect(dailyNumber('2027-10-28')).toBe(366);
  });

  it('consecutive local days always step by exactly 1', () => {
    let prev = dailyNumber('2026-10-28');
    for (let k = 1; k < 800; k++) {
      const key = dateKeyOf(new Date(2026, 9, 28 + k, 12));
      const n = dailyNumber(key);
      expect(n).toBe(prev + 1);
      prev = n;
    }
  });
});

describe('buildShareText', () => {
  it('finished record', () => {
    const text = buildShareText(record(['clear', 'clear', 'straw', 'clear', 'amber', 'clear']), 'https://urinal.example');
    expect(text).toBe(`Urinal #12 4/6\n⬜⬜🟨⬜🟧⬜\n${RESULT_TITLES[4]}\nhttps://urinal.example`);
  });

  it('omits the url line when empty; doctor tile', () => {
    const text = buildShareText(record(['doctor', 'doctor', 'doctor', 'doctor', 'doctor', 'doctor']), '');
    expect(text).toBe(`Urinal #12 0/6\n🟫🟫🟫🟫🟫🟫\n${RESULT_TITLES[0]}`);
  });

  it('in progress: tiles so far, no title', () => {
    expect(buildShareText(record(['clear', 'straw']), '')).toBe('Urinal #12 1/6\n⬜🟨');
  });
});
