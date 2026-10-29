// Compact layout specs for handmade rooms (see SetPiece in src/types.ts for the token list).
import type { Bathroom, Guy, Quirk, Side, Slot } from '../types';

const PLACEHOLDER_LOOK: Guy['look'] = { shirt: 0, pants: 0, hair: 0, skin: 0, height: 0, bald: false };

function guy(quirk: Quirk, lean?: Side): Guy {
  const g: Guy = { quirk, name: '', blurb: '', look: PLACEHOLDER_LOOK };
  if (lean) g.lean = lean;
  return g;
}

function slotFor(tok: string): Slot {
  switch (tok) {
    case '_': return { kind: 'urinal' };
    case 'L': return { kind: 'urinal', flag: 'low' };
    case 'W': return { kind: 'urinal', flag: 'puddle' };
    case 'X': return { kind: 'urinal', flag: 'broken' };
    case 'S': return { kind: 'stall' };
    case '$': return { kind: 'stall', occupant: guy('normal') };
    case 'N': return { kind: 'urinal', occupant: guy('normal') };
    case 'T': return { kind: 'urinal', occupant: guy('talker') };
    case 'P': return { kind: 'urinal', occupant: guy('splasher') };
    case 'B': return { kind: 'urinal', occupant: guy('boss') };
    case 'D<': return { kind: 'urinal', occupant: guy('drunk', 'left') };
    case 'D>': return { kind: 'urinal', occupant: guy('drunk', 'right') };
    case 'F<': return { kind: 'urinal', occupant: guy('facetime', 'left') };
    case 'F>': return { kind: 'urinal', occupant: guy('facetime', 'right') };
    default: throw new Error(`bad layout token "${tok}"`);
  }
}

/** Parse "T | _ | L _ _ P _ S" into a Bathroom with placeholder guys (names/looks unset). Throws on bad input. */
export function parseLayout(spec: string, door: Side): Bathroom {
  const slots: Slot[] = [];
  const dividers: boolean[] = [];
  let pending = false;
  for (const tok of spec.trim().split(/\s+/)) {
    if (tok === '|') {
      if (slots.length === 0 || pending) throw new Error(`misplaced divider in "${spec}"`);
      pending = true;
      continue;
    }
    if (slots.length > 0) dividers.push(pending);
    pending = false;
    slots.push(slotFor(tok));
  }
  if (pending) throw new Error(`trailing divider in "${spec}"`);
  if (slots.length < 2) throw new Error(`layout needs 2+ slots: "${spec}"`);
  return { slots, dividers, door };
}
