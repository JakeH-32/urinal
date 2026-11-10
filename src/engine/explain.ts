// One plain sentence saying why a pick graded the way it did (shown under the verdict).
// Dry on purpose: the verdict line carries the joke, this carries the rule.
import type { Bathroom, Evaluation, Quirk, Side } from '../types';
import { actsNormal, culpritOf, dividersBetween, isTalker, occupantIndices, roomTo, sideOf } from './code';

const other = (s: Side): Side => (s === 'left' ? 'right' : 'left');

const QUIRK_NOUN: Record<Exclude<Quirk, 'normal'>, string> = {
  talker: 'the talker',
  splasher: 'the splasher',
  boss: 'the boss',
  drunk: 'the drunk',
  facetime: 'the FaceTime guy',
  gassy: 'the gassy guy',
  inlaw: 'your father-in-law',
  pastor: 'the pastor',
  peeper: 'the peeping tom',
  pilot: 'the pilot',
  tourist: 'the backpacker',
  crypto: 'the crypto guy',
  finance: 'the finance bro',
  gymbro: 'the gym bro',
  twin: 'the twins',
  napper: 'the napper',
  shy: 'the shy guy',
  mascot: 'the mascot',
  security: 'the security guard',
  germ: 'the germaphobe',
  friend: 'your friend',
  rookie: 'the rookie',
  doppel: 'your doppelganger',
  bigfoot: 'Bigfoot',
  dropper: 'the full dropper',
  knight: 'the knight',
  sumo: 'the sumo wrestler',
};

/** The label guy closest (by room) to slot i, if any (men in stalls have walls: they don't count). */
function tightQuirkIndex(b: Bathroom, i: number): number | undefined {
  let best: number | undefined;
  let bestRoom = Infinity;
  for (const j of occupantIndices(b)) {
    if (j === i || actsNormal(b.slots[j].occupant)) continue;
    const room = roomTo(b, i, j);
    if (room < bestRoom) {
      bestRoom = room;
      best = j;
    }
  }
  return best;
}

/** Guys standing directly beside slot i (a divider between doesn't change that). */
function besideCount(b: Bathroom, i: number): number {
  return occupantIndices(b).filter((j) => Math.abs(j - i) === 1).length;
}

const COUNT_WORD = ['no', 'one', 'two', 'three', 'four', 'five'];

/** The ✓ spot to compare against: a urinal over a stall when the divider rule made both Clear. */
function answerOf(ev: Evaluation): number | undefined {
  let best: number | undefined;
  for (const g of ev.greens) if (best === undefined || (ev.slots[g]?.tier ?? 9) < (ev.slots[best]?.tier ?? 9)) best = g;
  return best;
}

/** Why `pick` got its grade, or null when there's nothing to teach (a textbook Clear). One sentence, 70 characters at most. */
export function explainPick(b: Bathroom, ev: Evaluation, pick: number): string | null {
  const a = ev.slots[pick];
  if (!a?.pickable || !a.grade || !a.reason) return null;
  // A legal puddle doesn't count as an option worth taking: standing in it is worse than any of this.
  const dryOnly = ev.slots.some((s) => s.pickable && s.violations === 0 && b.slots[s.index].flag === 'puddle');

  if (a.grade === 'clear') {
    // The verdict already says it was the least bad; this just says why there was no good spot.
    if (a.reason === 'only-option') return `Every ${dryOnly ? 'dry ' : ''}spot broke the code.`;
    if (a.reason === 'stall-forced') return `Every ${dryOnly ? 'dry ' : ''}urinal broke the code, so the stall was right.`;
    return null;
  }

  const best = answerOf(ev);
  if (a.grade === 'straw') {
    switch (a.reason) {
      case 'too-close':
        return best !== undefined && besideCount(b, pick) > besideCount(b, best)
          ? 'Legal, but the ✓ spot had fewer men right beside it.'
          : 'Legal, but the ✓ spot had more room.';
      case 'quirk-neighbor': {
        // The label guy closest to you, and whether the ✓ spot kept him farther off.
        const jq = tightQuirkIndex(b, pick);
        const who = jq === undefined ? undefined : (b.slots[jq].occupant?.quirk as Exclude<Quirk, 'normal'>);
        if (jq !== undefined && who && best !== undefined && roomTo(b, best, jq) > roomTo(b, pick, jq)) {
          return `Same room, but the ✓ spot kept ${QUIRK_NOUN[who]} farther away.`;
        }
        return 'Same room, but the ✓ spot had fewer guys with labels that close.';
      }
      case 'not-wall':
        return 'Same room, but the ✓ spot was against the wall.';
      case 'quick-exit':
        return 'Same room, but in a small room with a labeled guy, stay by the door.';
      case 'missed-friend':
        return 'Legal, but the ✓ spot was right next to your bro.';
      case 'past-talker': {
        // A talker you pass that the ✓ spot doesn't.
        const j = occupantIndices(b).find((k) => isTalker(b.slots[k].occupant) && passes(b, pick, k) && (best === undefined || !passes(b, best, k)));
        const q = j === undefined ? undefined : b.slots[j].occupant?.quirk;
        const noun = q && q !== 'normal' ? QUIRK_NOUN[q] : 'the talker';
        return `Legal, but you walked past ${noun}, and the ✓ spot didn’t.`;
      }
      case 'low-urinal':
        return b.slots[pick].flag === 'puddle' ? 'Legal, but anything dry beats standing in the puddle.' : 'Legal, but any clean normal urinal beats the low one.';
      case 'stall-coward':
        return 'A legal urinal was free, and the stall is a last resort.';
      default:
        return null;
    }
  }

  // Apple Juice / See a Doctor in a room where every spot broke the code: say why the ✓ was the least bad,
  // when there's a plain reason to give.
  const b0 = best === undefined ? undefined : ev.slots[best];
  if (b0?.reason === 'only-option') {
    const mine = a.violatedBy?.length ?? 0;
    const theirs = b0.violatedBy?.length ?? 0;
    if (theirs < mine) return 'Every spot broke the code. The ✓ crowded fewer men.';
    // Crowding a regular guy beats crowding one with a label.
    const plainOnly = (ix: readonly number[] | undefined) => (ix ?? []).every((k) => actsNormal(b.slots[k].occupant));
    if (plainOnly(b0.violatedBy) && !plainOnly(a.violatedBy)) return 'Every spot broke the code. The ✓ only crowded a regular guy.';
    // Otherwise the rule you broke (below) says more than "it broke it least".
  }

  // Apple Juice / See a Doctor: name the rule that was broken.
  const n = a.violatedBy?.length ?? 0;
  if (n >= 2) return `You were inside ${COUNT_WORD[n] ?? n} men’s space at once.`;
  const j = culpritOf(b, pick);
  const guy = j === null ? undefined : b.slots[j].occupant;
  const plain = 'Leave at least one empty urinal between you.';
  if (j === null || !guy || actsNormal(guy)) return plain;
  const side = sideOf(pick, j); // which side of him you were on
  const divider = dividersBetween(b, pick, j) > 0;

  switch (guy.quirk) {
    case 'normal':
    case 'tourist':
    case 'gymbro':
    case 'knight':
    case 'sumo':
    case 'mascot':
    case 'rookie':
    case 'doppel':
    case 'bigfoot':
    case 'napper':
    case 'friend':
      return plain;
    case 'twin':
      return 'The twins count as one. Crowd one, crowd both.';
    case 'shy':
      return 'The shy guy needs four empty urinals.';
    case 'security':
      return b.slots[pick].kind === 'stall' ? 'The stall isn’t safe with security in the room.' : plain;
    case 'dropper':
      return 'Pants at his ankles. Nobody stands closer than two urinals.';
    case 'germ':
      return 'He keeps flushing. The urinals beside him are wet.';
    case 'talker':
      return divider ? 'Talkers need two empty urinals, and he leans around dividers.' : 'Talkers need two empty urinals between you.';
    case 'pilot':
      return divider ? 'Pilots need two empty urinals, and he talks over dividers.' : 'Pilots need two empty urinals between you.';
    case 'crypto':
      return b.slots[pick].kind === 'stall' ? 'Within two urinals of him, he pitches you through the stall door.' : 'Crypto guys need two empty urinals between you.';
    case 'finance':
      return divider ? 'He’s on speakerphone, and a divider only counts as one urinal.' : 'He’s on speakerphone, so give him three empty urinals.';
    case 'splasher':
      return 'Splashers need two empty urinals between you.';
    case 'boss':
      return guy.mood === 'angry' ? 'An angry boss needs three empty urinals.' : 'A stressed boss needs two empty urinals.';
    case 'inlaw':
      return 'Fathers-in-law need two empty urinals between you.';
    case 'pastor':
      if (!guy.lean) return 'Pastors need two empty urinals between you.';
      if (side !== guy.lean) return 'Even on his far side, leave one empty urinal.';
      return 'He greets everyone at the door, and you were on his door side.';
    case 'peeper':
      if (!guy.lean) return 'Peeping toms need two empty urinals between you.';
      if (side !== guy.lean) return 'Even with him looking away, leave one empty urinal.';
      return 'He was looking your way.';
    case 'drunk':
      if (!guy.lean) return 'Drunks need two empty urinals between you.';
      if (side !== guy.lean) return 'Even on the side he isn’t leaning, leave one empty urinal.';
      return `He was leaning ${guy.lean}, toward you.`;
    case 'gassy':
      if (!guy.lean) return 'Gassy guys need three empty urinals between you.';
      if (side !== guy.lean) return 'Even upwind of him, leave one empty urinal.';
      return 'His smell drifts toward the door, and you were downwind.';
    case 'facetime': {
      const phone = guy.lean;
      if (!phone) return 'Stay out of his camera.';
      if (side === phone) return divider ? 'His camera sees over dividers, so leave one empty urinal.' : 'Leave one empty urinal beside his phone.';
      return `His phone is in his ${phone} hand, so his ${other(phone)} side is on camera.`;
    }
  }
}

/** True when the walk from the door to slot i goes past the guy at j. */
function passes(b: Bathroom, i: number, j: number): boolean {
  return b.door === 'left' ? j < i : j > i;
}
