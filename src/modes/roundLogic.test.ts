import { describe, expect, it } from 'vitest';
import type { Bathroom, Evaluation, RoundResult } from '../types';
import { VERDICTS } from '../content';
import { culpritOf } from '../engine/code';
import { defaultSave } from '../state/storage';
import { recordRound } from '../state/dailyStreak';
import { EXAMPLE_ROOMS, makeGuy, placeExamples } from '../ui/exampleRooms';
import {
  dailyStats,
  clearsIn,
  gradeCounts,
  legendFor,
  nextRun,
  resultFromEvaluation,
  tileString,
  verdictLine,
  violatorName,
} from './roundLogic';

const room: Bathroom = {
  slots: [
    { kind: 'urinal', occupant: makeGuy('boss', 'Mr. Hale') },
    { kind: 'urinal' },
    { kind: 'urinal', flag: 'puddle' },
    { kind: 'urinal', flag: 'broken' },
    { kind: 'urinal', occupant: makeGuy('drunk', 'Kyle', 'It is 11 a.m.', 'left') },
    { kind: 'stall' },
  ],
  dividers: [false, false, true, false, false],
  door: 'left',
};

const evaluation: Evaluation = {
  slots: [
    { index: 0, pickable: false },
    { index: 1, pickable: true, tier: 3, violations: 1, clearance: -2, grade: 'doctor', reason: 'boss', violatedBy: [0] },
    { index: 2, pickable: true, tier: 3, violations: 2, clearance: -1, grade: 'doctor', reason: 'drunk', violatedBy: [4, 0] },
    { index: 3, pickable: false },
    { index: 4, pickable: false },
    { index: 5, pickable: true, tier: 2, violations: 0, clearance: Infinity, grade: 'clear', reason: 'stall-forced' },
  ],
  greens: [5],
};

describe('grading', () => {
  it('reads grade and reason from the analysis', () => {
    expect(resultFromEvaluation('r1', 5, evaluation)).toEqual({ roundId: 'r1', pick: 5, grade: 'clear', reason: 'stall-forced' });
    expect(resultFromEvaluation('r1', 1, evaluation)).toMatchObject({ grade: 'doctor', reason: 'boss' });
  });

  it('falls back to the greens list when the analysis is incomplete', () => {
    const bare: Evaluation = { slots: [], greens: [2] };
    expect(resultFromEvaluation('r', 2, bare)).toMatchObject({ grade: 'clear', reason: 'perfect' });
    expect(resultFromEvaluation('r', 1, bare)).toMatchObject({ grade: 'amber', reason: 'adjacent' });
  });

  it('names the engine culprit, falling back to violatedBy[0], then the closest neighbour', () => {
    expect(violatorName(room, evaluation, 1)).toBe('Mr. Hale');
    const c = culpritOf(room, 2);
    expect(c).not.toBeNull();
    expect(violatorName(room, undefined, 2)).toBe(room.slots[c as number].occupant?.name);
    // Stall: no culprit from the engine, so the evaluation's violatedBy is used.
    const ev: Evaluation = { slots: [{ index: 5, pickable: true, grade: 'amber', reason: 'adjacent', violatedBy: [4] }], greens: [] };
    expect(violatorName(room, ev, 5)).toBe('Kyle');
    // A legal pick (the stall) has no culprit: the closest neighbour is named.
    expect(violatorName(room, evaluation, 5)).toBe('Kyle');
  });
});

describe('verdictLine', () => {
  it('is deterministic per round id and fills {name}', () => {
    const a = verdictLine('d2026-10-28-r3', 'adjacent', 'Dale');
    expect(a).toBe(verdictLine('d2026-10-28-r3', 'adjacent', 'Dale'));
    expect(a).not.toContain('{name}');
    expect(VERDICTS.adjacent.map((l) => l.replace(/\{name\}/g, 'Dale'))).toContain(a);
  });

  it('never leaves a placeholder even without a name', () => {
    for (const reason of Object.keys(VERDICTS) as (keyof typeof VERDICTS)[]) {
      expect(verdictLine('x', reason)).not.toContain('{name}');
    }
  });
});

describe('legend', () => {
  it('lists occupants with quirk text and each fixture once', () => {
    const l = legendFor(room);
    expect(l.occupants.map((o) => [o.index, o.quirk, o.name])).toEqual([
      [0, 'boss', 'Mr. Hale'],
      [4, 'drunk', 'Kyle'],
    ]);
    expect(l.occupants[1].lean).toBe('left');
    expect(l.occupants[0].lean).toBeUndefined();
    expect(l.fixtures).toEqual(['puddle', 'broken', 'stall', 'divider']);
  });
});

describe('results and stats', () => {
  const res = (i: number, grade: RoundResult['grade']): RoundResult => ({ roundId: `r${i}`, pick: 0, grade, reason: 'perfect' });

  it('counts clears and builds tiles', () => {
    const rs = [res(1, 'clear'), res(2, 'straw'), res(3, 'amber'), res(4, 'clear'), res(5, 'doctor')];
    expect(clearsIn(rs)).toBe(2);
    expect(tileString(rs)).toBe('🟦🟨🟧🟦🟫');
    expect(gradeCounts(rs)).toEqual({ clear: 2, straw: 1, amber: 1, doctor: 1 });
    expect(nextRun(3, 'clear')).toBe(4);
    expect(nextRun(3, 'straw')).toBe(0);
  });

  it('computes the distribution over finished days only', () => {
    let s = defaultSave();
    const play = (day: string, grades: RoundResult['grade'][]) => {
      grades.forEach((g, i) => {
        s = recordRound(s, day, 1, { roundId: `d${day}-r${i + 1}`, pick: 0, grade: g, reason: 'perfect' });
      });
    };
    play('2026-10-28', ['clear', 'clear', 'clear', 'clear', 'clear', 'clear']);
    play('2026-10-29', ['clear', 'doctor', 'clear', 'straw', 'clear', 'clear']);
    play('2026-10-30', ['clear', 'amber']);
    const st = dailyStats(s, '2026-10-29');
    expect(st.played).toBe(2);
    expect(st.perfect).toBe(1);
    expect(st.avgClears).toBe(5);
    expect(st.distribution).toEqual([0, 0, 0, 0, 1, 0, 1]);
    expect(st.todayClears).toBe(4);
    expect(st.lifetime).toEqual({ clear: 11, straw: 1, amber: 1, doctor: 1 });
    expect(dailyStats(s, '2026-10-30').todayClears).toBeUndefined();
    expect(dailyStats(defaultSave(), '2026-10-30')).toMatchObject({ played: 0, avgClears: 0 });
  });
});

describe('example rooms', () => {
  it('places each example on a matching section, leftovers go to the end', () => {
    const sections = [
      { heading: 'The Code', body: 'Never stand next to another man.' },
      { heading: 'Talkers', body: 'He talks through dividers.' },
      { heading: 'Stalls', body: 'Only when every urinal is bad.' },
    ];
    const { bySection, leftover } = placeExamples(sections);
    expect(bySection.get(0)?.id).toBe('basic');
    expect(bySection.get(1)?.id).toBe('talker');
    expect(bySection.get(2)?.id).toBe('stall');
    expect(leftover).toEqual([]);
    expect(placeExamples([{ heading: 'Hi', body: 'Nothing here.' }]).leftover).toHaveLength(EXAMPLE_ROOMS.length);
  });

  it('example picks are free, pickable slots', () => {
    for (const ex of EXAMPLE_ROOMS) {
      const slot = ex.bathroom.slots[ex.pick];
      expect(slot.occupant).toBeUndefined();
      expect(slot.flag).not.toBe('broken');
      expect(ex.bathroom.dividers).toHaveLength(ex.bathroom.slots.length - 1);
    }
  });
});
