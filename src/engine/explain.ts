// One plain sentence saying why a pick graded the way it did (shown under the verdict).
// Dry on purpose: the verdict line carries the joke, this carries the rule.
import type { Bathroom, Evaluation, Quirk, Side } from '../types';
import { actsNormal, culpritOf, dividersBetween, isPickable, roomTo, sideOf } from './code';

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
};

/**
 * True when there's somewhere to stand on that side of the guy at j, at least one empty urinal out.
 * Advice like "go to his other side" only makes sense when that side has a spot (not just the door).
 */
function roomOnSide(b: Bathroom, j: number, side: Side): boolean {
  return b.slots.some((s, k) => isPickable(s) && Math.abs(k - j) >= 2 && sideOf(k, j) === side);
}

/** Who sits at slot i's tightest room: how many quirk guys and how many normal guys. */
function tightNeighbors(b: Bathroom, i: number): { quirks: number; normals: number } {
  let room = Infinity;
  let quirks = 0;
  let normals = 0;
  b.slots.forEach((s, j) => {
    const q = s.occupant?.quirk;
    if (!q || j === i) return;
    const r = roomTo(b, i, j);
    if (r < room) {
      room = r;
      quirks = 0;
      normals = 0;
    }
    if (r === room) {
      if (actsNormal(s.occupant)) normals++;
      else quirks++;
    }
  });
  return { quirks, normals };
}

/** The quirk guy closest (by room) to slot i, if any. */
function tightQuirk(b: Bathroom, i: number): Exclude<Quirk, 'normal'> | undefined {
  let best: Exclude<Quirk, 'normal'> | undefined;
  let bestRoom = Infinity;
  b.slots.forEach((s, j) => {
    const q = s.occupant?.quirk;
    if (!q || q === 'normal' || actsNormal(s.occupant) || j === i) return;
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
    if (a.reason === 'only-option') {
      // A legal puddle doesn't count: standing in it is worse than any of this.
      const dryOnly = ev.slots.some((s) => s.pickable && s.violations === 0 && b.slots[s.index].flag === 'puddle');
      return `Every ${dryOnly ? 'dry ' : ''}spot broke the urinal code. This one broke it the least.`;
    }
    if (a.reason === 'stall-forced') return 'Every urinal broke the urinal code, so the stall was right.';
    return null;
  }

  if (a.grade === 'straw') {
    switch (a.reason) {
      case 'too-close':
        return 'Legal, but the ✓ spot had more room.';
      case 'quirk-neighbor': {
        const who = tightQuirk(b, pick);
        const noun = who ? QUIRK_NOUN[who] : 'a guy with a label';
        const mine = tightNeighbors(b, pick);
        const best = ev.greens.length ? tightNeighbors(b, ev.greens[0]) : undefined;
        if (best && best.quirks === 0 && best.normals > 0) return `Same room, but the ✓ spot put you next to a normal guy, not ${noun}.`;
        if (who === 'talker' && ev.greens.length && tightQuirk(b, ev.greens[0]) !== 'talker') return 'Same room, but the ✓ spot kept the talker farther away.';
        if (best && mine.quirks >= 2 && best.quirks === 1) return 'Same room, but you had a guy with a label on each side. The ✓ spot only had one that close.';
        return 'Same room, but the ✓ spot had fewer guys with labels that close.';
      }
      case 'not-wall':
        return 'Same room, but the ✓ spot was against the wall.';
      case 'quick-exit':
        return 'Same room, but in a room this small with someone you know in it, you get in and out. The ✓ spot was by the door.';
      case 'past-talker':
        return 'Legal, but you walked right past the talker. The ✓ spot never got near him.';
      case 'low-urinal':
        return b.slots[pick].flag === 'puddle'
          ? 'Legal, but you’d be standing in it. Anything dry beats the puddle.'
          : 'Legal, but any clean normal urinal beats the low one.';
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

  if (actsNormal(guy)) return 'You stood right next to him. Leave at least one empty urinal.';

  switch (guy.quirk) {
    case 'normal':
      return 'You stood right next to him. Leave at least one empty urinal.';
    case 'talker':
      return dividersBetween(b, pick, j) > 0
        ? 'Talkers need two empty urinals. He leans right around dividers.'
        : 'Talkers need two empty urinals between you.';
    case 'pilot':
      return dividersBetween(b, pick, j) > 0
        ? 'Pilots need two empty urinals. He told you about it over the divider.'
        : 'Pilots need two empty urinals between you. He mentioned that he’s a pilot.';
    case 'splasher':
      return 'Splashers need two empty urinals between you.';
    case 'boss':
      return guy.mood === 'angry' ? 'The boss is angry. Angry bosses need three empty urinals.' : 'The boss is stressed. Stressed bosses need two empty urinals.';
    case 'inlaw':
      return 'Fathers-in-law need two empty urinals between you.';
    case 'pastor':
      if (!guy.lean) return 'Pastors need two empty urinals between you.';
      if (side !== guy.lean) return 'Even on his far side, leave one empty urinal.';
      return roomOnSide(b, j, other(guy.lean))
        ? 'He greets everyone who comes through the door, and you were on his door side. Go to his far side, or two urinals away.'
        : 'He greets everyone who comes through the door, and you were on his door side. Leave two empty urinals.';
    case 'peeper': {
      const look = guy.lean;
      if (!look) return 'Peeping toms need two empty urinals between you.';
      if (side !== look) return 'He was looking the other way. Still leave one empty urinal.';
      return roomOnSide(b, j, other(look))
        ? `He was looking ${look}. Go to his ${other(look)} side, or leave two empty urinals.`
        : `He was looking ${look}, right at you. Leave two empty urinals.`;
    }
    case 'drunk': {
      const lean = guy.lean;
      if (!lean) return 'Drunks need two empty urinals between you.';
      if (side !== lean) return 'Even on the side he isn’t leaning, leave one empty urinal.';
      return roomOnSide(b, j, other(lean))
        ? `He was leaning ${lean}. Go to his ${other(lean)} side, or leave two empty urinals.`
        : `He was leaning ${lean}, toward you. Leave two empty urinals.`;
    }
    case 'gassy': {
      const drift = guy.lean;
      if (!drift) return 'Gassy guys need three empty urinals between you.';
      if (side !== drift) return 'Even upwind of him, leave one empty urinal.';
      return roomOnSide(b, j, other(drift))
        ? 'His smell drifts toward the door, and you were downwind. Stand on his far side, or three urinals away.'
        : 'His smell drifts toward the door, and you were downwind. Leave three empty urinals.';
    }
    case 'facetime': {
      const phone = guy.lean;
      if (!phone) return 'Stay out of his camera.';
      if (side === phone) {
        return dividersBetween(b, pick, j) > 0
          ? 'His camera sees right over the divider. Leave one empty urinal next to him.'
          : 'You were right next to his phone. Leave one empty urinal.';
      }
      const onCamera = `His phone was in his ${phone} hand, so everything to his ${other(phone)} is on camera.`;
      return roomOnSide(b, j, phone) ? `${onCamera} Go to his ${phone} side.` : onCamera;
    }
  }
}
