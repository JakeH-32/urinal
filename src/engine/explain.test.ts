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
    expect(explain('_ _ D> _ _ _ _', 'left', 4)).toBe('He was leaning right. Go to his left side, or leave two empty urinals.');
  });

  it('drunk: right next to him on his other side', () => {
    expect(explain('_ _ D> _ _ _ _', 'left', 1)).toBe('Even on the side he isn’t leaning, leave one empty urinal.');
  });

  it('facetime: in frame vs. next to the phone', () => {
    expect(explain('_ _ _ F< _ _ _', 'right', 6)).toBe(
      'His phone was in his left hand, so everything to his right is on camera. Go to his left side.',
    );
    expect(explain('_ _ _ F< _ _ _', 'right', 2)).toBe('You were right next to his phone. Leave one empty urinal.');
    expect(explain('_ _ _ | F< _ _ _', 'right', 2)).toBe('His camera sees right over the divider. Leave one empty urinal next to him.');
  });

  it('gassy: downwind (door side) vs. right next to him upwind', () => {
    expect(explain('_ _ _ _ G _ _ _', 'left', 2)).toBe(
      'His smell drifts toward the door, and you were downwind. Stand on his far side, or three urinals away.',
    );
    expect(explain('_ _ _ _ G _ _ _', 'left', 5)).toBe('Even upwind of him, leave one empty urinal.');
  });

  it('boss, talker through a divider, two men at once', () => {
    expect(explain('_ _ _ B _ _ _ _ _ _', 'left', 5)).toBe('The boss needs three empty urinals between you.');
    expect(explain('T | _ _ _ _ _', 'left', 1)).toBe('Talkers need two empty urinals. He leans right around dividers.');
    expect(explain('_ N _ N _ _ _', 'left', 2)).toBe('You were inside two men’s space at once. Leave room on both sides.');
  });

  it('Lemonade explains which tiebreak you lost', () => {
    expect(explain('_ _ _ N _ N', 'left', 1)).toBe('Legal, but the ✓ spot had more room.');
    expect(explain('_ N _', 'right', 2)).toBe('Same room, but the ✓ spot was against the wall.');
  });

  it('neighbors: names a normal guy only when the ✓ spot really has one (playtest: wedding)', () => {
    expect(explain('_ | D> _ N | _ _ _ T', 'right', 0)).toBe('Same room, but the ✓ spot put you next to a normal guy, not the drunk.');
    expect(explain('_ _ D< _ _ _ D> _ _ _', 'right', 4)).toBe(
      'Same room, but you had a guy with a label on each side. The ✓ spot only had one that close.',
    );
  });

  it('least-bad Clear explains itself', () => {
    expect(explain('N _', 'left', 1)).toBe('Every spot broke the urinal code. This one broke it the least.');
  });
});
