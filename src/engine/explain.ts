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

/** "the mascot", "a stranger"; several of a kind become "both mascots" / "three strangers". */
function guyList(b: Bathroom, ix: readonly number[]): string {
  // One entry per guy: twins are one unit, a guy two or three urinals wide counts once.
  const seen = new Set<string>();
  const nouns: string[] = [];
  for (const k of ix) {
    const g = b.slots[k]?.occupant;
    if (!g) continue;
    const key = g.quirk === 'twin' ? `twin-${g.group}` : `${g.name}-${k - (g.part ?? 0)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    nouns.push(actsNormal(g) || g.quirk === 'normal' ? 'a stranger' : QUIRK_NOUN[g.quirk as Exclude<Quirk, 'normal'>]);
  }
  const counts = new Map<string, number>();
  for (const n of nouns) counts.set(n, (counts.get(n) ?? 0) + 1);
  const parts = [...counts].map(([n, c]) => {
    if (c === 1) return n;
    const bare = n.replace(/^(the|a|your) /, '');
    const plural = /s$/.test(bare) ? bare : `${bare}s`;
    return `${c === 2 ? (n === 'a stranger' ? 'two' : 'both') : (COUNT_WORD[c] ?? String(c))} ${plural}`;
  });
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Who you crowded (when it was more than one), and who the ✓ crowded instead in a no-good-spot room. */
function crowdLine(b: Bathroom, ev: Evaluation, pick: number, best: number | undefined): string | null {
  const mine = ev.slots[pick]?.violatedBy ?? [];
  const bestSlot = best === undefined ? undefined : ev.slots[best];
  const leastBad = bestSlot?.reason === 'only-option';
  const theirs = leastBad ? (bestSlot?.violatedBy ?? []) : [];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  let first: string | null = null;
  if (mine.length >= 2 || (leastBad && mine.length >= 1)) {
    const both = mine.some((k) => k < pick) && mine.some((k) => k > pick);
    first = both && mine.length >= 2 ? `You were wedged between ${guyList(b, mine)}.` : `You crowded ${guyList(b, mine)}.`;
  }
  if (!leastBad || theirs.length === 0) return mine.length >= 2 ? first : null;
  // The ✓ crowded the same men, just less: the rule you broke (or who you were wedged between) says it better.
  if (theirs.every((k) => mine.includes(k)) && theirs.length === mine.length) return mine.length >= 2 ? first : null;
  const second = `The ✓ only crowded ${guyList(b, theirs)}.`;
  const line = first ? `${first} ${second}` : second;
  return line.length <= 80 ? line : second.length <= 80 ? `${cap(second)}` : null;
}

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
  const guard = [i - 1, i + 1].filter((j) => b.slots[j]?.kind === 'urinal' && b.slots[j].occupant?.quirk === 'security').length;
  return occupantIndices(b).filter((j) => Math.abs(j - i) === 1).length + guard;
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
        return 'In a room this small, the spot by the door gets you out fastest.';
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

  // Apple Juice / See a Doctor: name who you crowded, and who the ✓ crowded instead when every spot broke
  // the code. Uses the room's own guys, so it reads as this room, not a rulebook.
  const told = crowdLine(b, ev, pick, best);
  if (told) return told;

  // Apple Juice / See a Doctor: name the rule that was broken.
  const n = a.violatedBy?.length ?? 0;
  if (n >= 2) return `You were inside ${COUNT_WORD[n] ?? n} men’s space at once.`;
  const j = culpritOf(b, pick);
  const guy = j === null ? undefined : b.slots[j].occupant;
  // Right beside someone who has no rules of his own: say who, in this room.
  const who = !guy || actsNormal(guy) || guy.quirk === 'normal' ? 'a stranger' : QUIRK_NOUN[guy.quirk as Exclude<Quirk, 'normal'>];
  const plain = best !== undefined ? `Right beside ${who}, with a better spot open.` : `Right beside ${who}.`;
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
    case 'security': // guards the stall, takes no urinal space
      return plain;
    case 'security':
      return b.slots[pick].kind === 'stall' ? 'The stall isn’t safe with security in the room.' : plain;
    case 'twin':
      return 'The twins count as one. Crowd one, crowd both.';
    case 'shy':
      return 'The shy guy needs four empty urinals.';
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
