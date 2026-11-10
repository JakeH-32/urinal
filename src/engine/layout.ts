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
    case 'A': return { kind: 'urinal', occupant: guy('pilot') };
    case 'Y<': return { kind: 'urinal', flag: 'sink', occupant: guy('gymbro', 'left') };
    case 'Y>': return { kind: 'urinal', flag: 'sink', occupant: guy('gymbro', 'right') };
    case 'J': return { kind: 'urinal', occupant: guy('twin') }; // neighbouring J's are one set of twins
    case 'Z': return { kind: 'urinal', occupant: guy('napper') }; // always in pairs: Z Z
    case 'Q': return { kind: 'urinal', occupant: guy('mascot') }; // always in pairs: Q Q
    case 'H': return { kind: 'urinal', occupant: guy('shy') };
    case 'V': return { kind: 'urinal', occupant: guy('security') }; // guarding this urinal, for no stated reason
    case 'Ge': return { kind: 'urinal', occupant: guy('germ') };
    case 'Fr': return { kind: 'urinal', occupant: guy('friend') };
    case 'Rk': return { kind: 'urinal', occupant: guy('rookie') };
    case 'Dp': return { kind: 'urinal', occupant: guy('doppel') };
    case 'Bf': return { kind: 'urinal', occupant: guy('bigfoot') };
    case 'Fd': return { kind: 'urinal', occupant: guy('dropper') };
    case 'Kn<': return { kind: 'urinal', occupant: guy('knight', 'left') }; // shield in the urinal to his left
    case 'Kn>': return { kind: 'urinal', occupant: guy('knight', 'right') };
    case 'Sm': return { kind: 'urinal', occupant: guy('sumo') }; // always three: Sm Sm Sm
    case 'K': return { kind: 'urinal', occupant: guy('tourist') };
    case 'C': return { kind: 'urinal', occupant: guy('crypto') };
    case 'M': return { kind: 'urinal', occupant: guy('finance') };
    case 'P': return { kind: 'urinal', occupant: guy('splasher') };
    case 'B': return { kind: 'urinal', occupant: { ...guy('boss'), mood: 'stressed' } };
    case 'B+': return { kind: 'urinal', occupant: { ...guy('boss'), mood: 'happy' } };
    case 'B!': return { kind: 'urinal', occupant: { ...guy('boss'), mood: 'angry' } };
    case 'D<': return { kind: 'urinal', occupant: guy('drunk', 'left') };
    case 'D>': return { kind: 'urinal', occupant: guy('drunk', 'right') };
    case 'F<': return { kind: 'urinal', occupant: guy('facetime', 'left') };
    case 'F>': return { kind: 'urinal', occupant: guy('facetime', 'right') };
    case 'G': return { kind: 'urinal', occupant: guy('gassy') }; // pointed at the door below
    case 'I': return { kind: 'urinal', occupant: guy('inlaw') };
    case 'R': return { kind: 'urinal', occupant: guy('pastor') };
    case 'E<': return { kind: 'urinal', occupant: guy('peeper', 'left') };
    case 'E>': return { kind: 'urinal', occupant: guy('peeper', 'right') };
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
  for (const s of slots) if (s.occupant?.quirk === 'gassy' || s.occupant?.quirk === 'pastor') s.occupant.lean = door;
  // Pair up the two-urinal guys (Z Z, Q Q) and group runs of twins (J J or J J J).
  slots.forEach((s, i) => {
    const g = s.occupant;
    if (!g) return;
    const prev = slots[i - 1]?.occupant;
    const width = g.quirk === 'sumo' ? 3 : g.quirk === 'napper' || g.quirk === 'mascot' ? 2 : 1;
    if (width > 1) g.part = (prev?.quirk === g.quirk && prev.part !== undefined && prev.part < width - 1 ? prev.part + 1 : 0) as 0 | 1 | 2;
    if (g.quirk === 'twin') g.group = prev?.quirk === 'twin' && prev.group !== undefined ? prev.group : i + 1;
  });
  if (slots.length < 2) throw new Error(`layout needs 2+ slots: "${spec}"`);
  return { slots, dividers, door };
}
