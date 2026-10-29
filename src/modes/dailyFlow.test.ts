// End-to-end (no React): the same calls Daily/Practice/Results make, against the real engine.
import { describe, expect, it } from 'vitest';
import { evaluate } from '../engine/code';
import { buildShareText, dailyNumber } from '../engine/daily';
import { dailyRounds, practiceRound } from '../engine/generate';
import { decodePracticeCode, encodePracticeCode } from '../engine/rng';
import { defaultSave } from '../state/storage';
import { recordRound } from '../state/dailyStreak';
import { clearsIn, legendFor, resultFromEvaluation, verdictLine, violatorName } from './roundLogic';

const DAY = '2026-10-28';

describe('daily flow', () => {
  it('plays six rounds, grades, records and shares', () => {
    const rounds = dailyRounds(DAY);
    expect(rounds).toHaveLength(6);
    const number = dailyNumber(DAY);
    let save = defaultSave();
    rounds.forEach((round, i) => {
      const ev = evaluate(round.bathroom);
      expect(ev.greens.length).toBeGreaterThan(0);
      // Alternate: the Code's answer on even rounds, the worst pickable slot on odd ones.
      const pickable = ev.slots.filter((s) => s.pickable).map((s) => s.index);
      const pick = i % 2 === 0 ? ev.greens[0] : pickable[pickable.length - 1];
      const res = resultFromEvaluation(round.id, pick, ev);
      if (i % 2 === 0) expect(res.grade).toBe('clear');
      const line = verdictLine(round.id, res.reason, violatorName(round.bathroom, ev, pick));
      expect(line).not.toContain('{name}');
      expect(line.length).toBeGreaterThan(0);
      legendFor(round.bathroom);
      save = recordRound(save, DAY, number, res);
    });
    const rec = save.daily.byDate[DAY];
    expect(rec.finished).toBe(true);
    expect(clearsIn(rec.results)).toBeGreaterThanOrEqual(3);
    expect(save.daily.streak).toBe(1);
    const text = buildShareText(rec, 'https://example.test/#/daily');
    expect(text).toContain(`#${number}`);
    expect(text).toContain('https://example.test/#/daily');
  });

  it('dailies are deterministic per date', () => {
    expect(dailyRounds(DAY).map((r) => r.id)).toEqual(dailyRounds(DAY).map((r) => r.id));
  });
});

describe('practice flow', () => {
  it('a room code rebuilds the same room', () => {
    const seed = 123456789 & 0x3fffffff;
    const code = encodePracticeCode(seed);
    expect(decodePracticeCode(code)).toBe(seed);
    expect(decodePracticeCode(code.toLowerCase())).toBe(seed);
    expect(decodePracticeCode('nope!')).toBeNull();
    const a = practiceRound(seed);
    const b = practiceRound(decodePracticeCode(code) as number);
    expect(b).toEqual(a);
    expect(evaluate(a.bathroom).greens.length).toBeGreaterThan(0);
  });
});
