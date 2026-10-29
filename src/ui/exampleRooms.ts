// Hand-built bathrooms for How to play (and tests). Read-only examples, no generator involved.
import type { Bathroom, Guy, Quirk, Side, Slot } from '../types';

let lookSeed = 0;

export function makeGuy(quirk: Quirk, name: string, blurb = '', lean?: Side): Guy {
  const n = lookSeed++;
  return {
    quirk,
    ...(lean ? { lean } : {}),
    name,
    blurb,
    look: { shirt: n % 6, pants: (n + 2) % 4, hair: (n + 1) % 5, skin: (n * 3) % 5, height: 0.5 + ((n * 7) % 5) / 10, bald: n % 4 === 3 },
  };
}

const urinal = (occupant?: Guy): Slot => (occupant ? { kind: 'urinal', occupant } : { kind: 'urinal' });
const stall = (): Slot => ({ kind: 'stall' });

export interface ExampleRoom {
  id: string;
  /** Matched against a How-to-play section's heading + body to place the example. */
  match: RegExp;
  bathroom: Bathroom;
  /** Where "you" stand in the example (the urinal code's answer). */
  pick: number;
  caption: string;
}

export const EXAMPLE_ROOMS: ExampleRoom[] = [
  {
    id: 'basic',
    match: /pick|space|next to|neighbou?r|far|wall|basic|rule|code/i,
    bathroom: {
      slots: [urinal(makeGuy('normal', 'Some guy')), urinal(), urinal(), urinal(), urinal()],
      dividers: [false, false, false, false],
      door: 'left',
    },
    pick: 4,
    caption: 'One guy by the door. The far wall is the answer.',
  },
  {
    id: 'talker',
    match: /talk|divider|quirk|special|splash|boss|drunk/i,
    bathroom: {
      slots: [urinal(), urinal(), urinal(makeGuy('talker', 'Gary')), urinal(), urinal(), urinal()],
      dividers: [true, true, true, true, true],
      door: 'left',
    },
    pick: 5,
    caption: 'A divider counts as a gap. Not against a talker.',
  },
  {
    id: 'stall',
    match: /stall|full|crowd|no good|least bad/i,
    bathroom: {
      slots: [urinal(makeGuy('normal', 'Some guy')), urinal(), urinal(makeGuy('normal', 'Another guy')), stall()],
      dividers: [false, false, false],
      door: 'left',
    },
    pick: 3,
    caption: 'Every urinal breaks the urinal code. Take the stall.',
  },
];

/**
 * Assign examples to sections: each example goes to the first unclaimed section it matches.
 * Returns a map section index -> example, plus any examples left over.
 */
export function placeExamples(
  sections: readonly { heading: string; body: string }[],
  examples: readonly ExampleRoom[] = EXAMPLE_ROOMS,
): { bySection: Map<number, ExampleRoom>; leftover: ExampleRoom[] } {
  const bySection = new Map<number, ExampleRoom>();
  const leftover: ExampleRoom[] = [];
  // Most specific first: stall and talker keywords are rarer than the generic ones.
  const order = [...examples].reverse();
  const placed = new Set<string>();
  for (const ex of order) {
    const i = sections.findIndex((s, idx) => !bySection.has(idx) && ex.match.test(`${s.heading} ${s.body}`));
    if (i >= 0) {
      bySection.set(i, ex);
      placed.add(ex.id);
    }
  }
  for (const ex of examples) if (!placed.has(ex.id)) leftover.push(ex);
  return { bySection, leftover };
}
