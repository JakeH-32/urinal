// One plain sentence saying why a pick graded the way it did (shown under the verdict).
// Dry on purpose: the verdict line carries the joke, this carries the rule.
import type { Bathroom, Evaluation, Quirk, Side } from '../types';
import { culpritOf, dividersBetween, roomTo, sideOf } from './code';

const other = (s: Side): Side => (s === 'left' ? 'right' : 'left');

const QUIRK_NOUN: Record<Exclude<Quirk, 'normal'>, string> = {
  talker: 'the talker',
  splasher: 'the splasher',
  boss: 'the boss',
  drunk: 'the drunk',
  facetime: 'the FaceTime guy',
  gassy: 'the gassy guy',
};

/** The quirk guy closest (by room) to slot i, if any. */
function tightQuirk(b: Bathroom, i: number): Exclude<Quirk, 'normal'> | undefined {
  let best: Exclude<Quirk, 'normal'> | undefined;
  let bestRoom = Infinity;
  b.slots.forEach((s, j) => {
    const q = s.occupant?.quirk;
    if (!q || q === 'normal' || j === i) return;
    const room = roomTo(b, i, j);
    if (room < bestRoom) {
      bestRoom = room;
      best = q;
    }
  });
  return best;
}

/** Why `pick` got its grade, or null when there's nothing to teach (a textbook Clear). */
export function explainPick(b: Bathroom, ev: Evaluation, pick: number): string | null {
  const a = ev.slots[pick];
  if (!a?.pickable || !a.grade || !a.reason) return null;

  if (a.grade === 'clear') {
    if (a.reason === 'only-option') return 'Every spot broke the urinal code. This one broke it the least.';
    if (a.reason === 'stall-forced') return 'Every urinal broke the urinal code, so the stall was right.';
    return null;
  }

  if (a.grade === 'straw') {
    switch (a.reason) {
      case 'too-close':
        return 'Legal, but the ✓ spot had more room.';
      case 'quirk-neighbor': {
        const who = tightQuirk(b, pick);
        return `Same room, but the ✓ spot put you next to a normal guy, not ${who ? QUIRK_NOUN[who] : 'a guy with a label'}.`;
      }
      case 'not-wall':
        return 'Same room, but the ✓ spot was against the wall.';
      case 'low-urinal': {
        const what = b.slots[pick].flag === 'puddle' ? 'the puddle one' : 'the low one';
        return `Legal, but any clean normal urinal beats ${what}.`;
      }
      case 'stall-coward':
        return 'A legal urinal was free. The stall is only for when every urinal breaks the code.';
      default:
        return null;
    }
  }

  // Apple Juice / See a Doctor: name the rule that was broken.
  if ((a.violatedBy?.length ?? 0) >= 2) return 'You were inside two men’s space at once. Leave room on both sides.';
  const j = culpritOf(b, pick);
  const guy = j === null ? undefined : b.slots[j].occupant;
  if (j === null || !guy) return 'You stood right next to him. Leave at least one empty urinal.';
  const side = sideOf(pick, j); // which side of him you were on

  switch (guy.quirk) {
    case 'normal':
      return 'You stood right next to him. Leave at least one empty urinal.';
    case 'talker':
      return dividersBetween(b, pick, j) > 0
        ? 'Talkers need two empty urinals. He leans right around dividers.'
        : 'Talkers need two empty urinals between you.';
    case 'splasher':
      return 'Splashers need two empty urinals between you.';
    case 'boss':
      return 'The boss needs three empty urinals between you.';
    case 'drunk': {
      const lean = guy.lean;
      if (!lean) return 'Drunks need two empty urinals between you.';
      return side === lean
        ? `He was leaning ${lean}. Go to his ${other(lean)} side, or leave two empty urinals.`
        : `Even on the side he isn’t leaning, leave one empty urinal.`;
    }
    case 'gassy': {
      const drift = guy.lean;
      if (!drift) return 'Gassy guys need three empty urinals between you.';
      return side === drift
        ? 'His smell drifts toward the door, and you were downwind. Stand on his far side, or three urinals away.'
        : 'Even upwind of him, leave one empty urinal.';
    }
    case 'facetime': {
      const phone = guy.lean;
      if (!phone) return 'Stay out of his camera.';
      if (side === phone) {
        return dividersBetween(b, pick, j) > 0
          ? 'His camera sees right over the divider. Leave one empty urinal next to him.'
          : 'You were right next to his phone. Leave one empty urinal.';
      }
      return `His phone was in his ${phone} hand, so everything to his ${other(phone)} is on camera. Go to his ${phone} side.`;
    }
  }
}
