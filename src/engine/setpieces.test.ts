import { describe, expect, it } from 'vitest';
import { SET_PIECES } from '../content/setpieces';
import { evaluate } from './code';
import { SET_PIECE_ROUNDS, dailyRounds, dailySetPiece, practiceRound } from './generate';
import { parseLayout } from './layout';

describe('parseLayout', () => {
  it('reads slots, flags, guys and dividers', () => {
    const b = parseLayout('T | _ | L X S $ D< W', 'right');
    expect(b.slots.map((s) => s.occupant?.quirk ?? s.flag ?? s.kind)).toEqual(['talker', 'urinal', 'low', 'broken', 'stall', 'normal', 'drunk', 'puddle']);
    expect(b.slots[6].occupant?.lean).toBe('left');
    expect(b.dividers).toEqual([true, true, false, false, false, false, false]);
    expect(b.door).toBe('right');
  });

  it('rejects junk', () => {
    expect(() => parseLayout('_ Q _', 'left')).toThrow();
    expect(() => parseLayout('| _ _', 'left')).toThrow();
    expect(() => parseLayout('_ _ |', 'left')).toThrow();
    expect(() => parseLayout('_', 'left')).toThrow();
  });
});

describe('set pieces', () => {
  it('have unique ids', () => {
    const ids = SET_PIECES.map((sp) => sp.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SET_PIECES.map((sp) => [sp.id, sp] as const))('%s: the engine agrees with the answer', (_id, sp) => {
    expect(SET_PIECE_ROUNDS).toContain(sp.difficulty);
    expect(sp.premise.length).toBeGreaterThan(0);
    const b = parseLayout(sp.layout, sp.door);
    expect(b.slots.length).toBeLessThanOrEqual(10);
    const guys = b.slots.filter((s) => s.kind === 'urinal' && s.occupant).length;
    if (sp.people) expect(sp.people.length).toBe(guys);
    const ev = evaluate(b);
    expect(ev.greens.map((i) => i + 1)).toEqual([sp.answer]);
    // Never right next to the FaceTime guy (playtest).
    for (const n of [sp.answer - 2, sp.answer]) expect(b.slots[n]?.occupant?.quirk).not.toBe('facetime');
    // A puzzle needs at least one wrong answer.
    expect(ev.slots.filter((s) => s.pickable && s.grade !== 'clear').length).toBeGreaterThan(0);
  });

  it('show up in the daily on rounds 2, 4 and 6 with their premise', () => {
    const rounds = dailyRounds('2026-10-29');
    for (const r of SET_PIECE_ROUNDS) {
      const sp = dailySetPiece('2026-10-29', r as 2 | 4 | 6);
      if (!sp) continue;
      expect(rounds[r - 1].premise).toBe(sp.premise);
      expect(rounds[r - 1].venue).toBe(sp.venue);
    }
  });

  it('practice rounds are deterministic, set piece or not', () => {
    for (const seed of [1, 2, 3, 42, 999, 123456]) expect(practiceRound(seed)).toEqual(practiceRound(seed));
  });
});
