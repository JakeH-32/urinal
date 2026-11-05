import { describe, expect, it } from 'vitest';
import type { Side } from '../types';
import { evaluate } from './code';
import { explainPick } from './explain';
import { parseLayout } from './layout';

const explain = (layout: string, door: Side, pick: number) => {
  const b = parseLayout(layout, door);
  return explainPick(b, evaluate(b), pick);
};

describe('explainPick', () => {
  it('says nothing for a textbook Clear', () => {
    expect(explain('_ _ _ N _ N', 'left', 0)).toBeNull();
  });

  it('drunk: picking his lean side tells you to go to the other side', () => {
    // Leaning right; you stood two to his right.
    expect(explain('_ _ D> _ _ _ _', 'left', 4)).toBe('He was leaning right, toward you.');
  });

  it('drunk: right next to him on his other side', () => {
    expect(explain('_ _ D> _ _ _ _', 'left', 1)).toBe('Even on the side he isn’t leaning, leave one empty urinal.');
  });

  it('facetime: in frame vs. next to the phone', () => {
    expect(explain('_ _ _ F< _ _ _', 'right', 6)).toBe(
      'His phone is in his left hand, so his right side is on camera.',
    );
    expect(explain('_ _ _ F< _ _ _', 'right', 2)).toBe('Leave one empty urinal beside his phone.');
    expect(explain('_ _ _ | F< _ _ _', 'right', 2)).toBe('His camera sees over dividers, so leave one empty urinal.');
  });

  it('gassy: downwind (door side) vs. right next to him upwind', () => {
    expect(explain('_ _ _ _ G _ _ _', 'left', 2)).toBe(
      'His smell drifts toward the door, and you were downwind.',
    );
    expect(explain('_ _ _ _ G _ _ _', 'left', 5)).toBe('Even upwind of him, leave one empty urinal.');
  });

  it('boss, talker through a divider, two men at once', () => {
    expect(explain('_ _ _ B _ _ _ _ _ _', 'left', 5)).toBe('A stressed boss needs two empty urinals.');
    expect(explain('_ _ _ B! _ _ _ _ _ _', 'left', 6)).toBe('An angry boss needs three empty urinals.');
    expect(explain('_ _ _ B+ _ _ _ _ _ _', 'left', 4)).toBe('Leave at least one empty urinal between you.');
    expect(explain('T | _ _ _ _ _', 'left', 1)).toBe('Talkers need two empty urinals, and he leans around dividers.');
    expect(explain('_ N _ N _ _ _', 'left', 2)).toBe('You were inside two men’s space at once.');
  });

  it('walking past the talker, and a talker as your closest neighbor', () => {
    expect(explain('_ _ _ _ T _ _ _', 'right', 0)).toBe('Legal, but you walked past the talker, and the ✓ spot didn’t.');
    expect(explain('_ _ T _ _ _ _ _ _ B', 'right', 5)).toBe('Same room, but the ✓ spot kept the talker farther away.');
  });

  it('father-in-law, pastor, peeper', () => {
    expect(explain('_ _ I _ _ _ _', 'left', 4)).toBe('Fathers-in-law need two empty urinals between you.');
    expect(explain('_ _ R _ _ _ _', 'left', 0)).toBe(
      'He greets everyone at the door, and you were on his door side.',
    );
    expect(explain('_ _ R _ _ _ _', 'left', 3)).toBe('Even on his far side, leave one empty urinal.');
    expect(explain('_ _ E> _ _ _ _', 'left', 4)).toBe('He was looking your way.');
    expect(explain('_ _ E> _ _ _ _', 'left', 1)).toBe('Even with him looking away, leave one empty urinal.');
  });

  it('Lemonade explains which tiebreak you lost', () => {
    expect(explain('_ _ _ N _ N', 'left', 1)).toBe('Legal, but the ✓ spot had more room.');
    expect(explain('_ N _', 'right', 2)).toBe('Same room, but the ✓ spot was against the wall.');
  });

  it('neighbors: names a normal guy only when the ✓ spot really has one (playtest: wedding)', () => {
    expect(explain('_ _ D< _ _ _ D> _ _ _', 'right', 4)).toBe('Legal, but the ✓ spot had more room.');
  });

  it('puddles: standing in one is worse than standing a bit close', () => {
    expect(explain('N _ W _ N _ N _ S', 'right', 2)).toBe('Legal, but anything dry beats standing in the puddle.');
    expect(explain('W _ N', 'right', 1)).toBe('Every dry spot broke the code.');
  });

  it('never sends you to a side with nowhere to stand (playtest: FaceTime by the door)', () => {
    expect(explain('W _ | F>', 'right', 0)).toBe('His phone is in his right hand, so his left side is on camera.');
    expect(explain('_ _ _ _ F>', 'right', 1)).toBe('His phone is in his right hand, so his left side is on camera.');
    expect(explain('_ _ _ F> _ _', 'right', 1)).toBe('His phone is in his right hand, so his left side is on camera.');
    expect(explain('_ _ _ D>', 'left', 3 - 1)).not.toContain('Go to');
  });

  it('least-bad Clear explains itself', () => {
    expect(explain('N _', 'left', 1)).toBe('Every spot broke the code.');
  });
});
