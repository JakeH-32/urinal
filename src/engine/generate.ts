// Seeded bathroom generator. Owned by the Engine agent.
//
// Layout, people and venue each draw from their own RNG fork, so filling in the content
// pools never changes a day's layouts. Rounds are rejection-sampled against per-difficulty
// constraints (see `accepts`), relaxing in stages; it never throws.
import { QUIRKS, VENUES } from '../content';
import { SET_PIECES } from '../content/setpieces';
import { LEGENDARY_ROOMS } from '../content/legendary';
import type { Bathroom, Difficulty, Evaluation, Guy, Quirk, Rng, Round, SetPiece, Side, Slot, UrinalFlag } from '../types';
import { actsNormal, evaluate, isOpen, zoneCovers } from './code';
import { dailyNumber } from './daily';
import { parseLayout } from './layout';
import { SEED_MASK, createRng, encodePracticeCode, hashString, seedFrom } from './rng';

// ---------------------------------------------------------------------------
// Analysis helpers (exported for tests / curious UI)
// ---------------------------------------------------------------------------

/**
 * What a naive player picks: the pickable URINAL(s) with the biggest raw |i-j| distance to the
 * nearest occupant, ignoring quirks, dividers and flags. Can be several on a tie.
 */
export function naivePicks(b: Bathroom): number[] {
  const occ: number[] = [];
  b.slots.forEach((s, i) => s.occupant && occ.push(i));
  let bestD = -1;
  let out: number[] = [];
  b.slots.forEach((s, i) => {
    if (s.kind !== 'urinal' || !isOpen(b, i)) return;
    let d = Infinity;
    for (const j of occ) d = Math.min(d, Math.abs(i - j));
    if (d > bestD) {
      bestD = d;
      out = [i];
    } else if (d === bestD) out.push(i);
  });
  return out;
}

/**
 * True when every guy with a label changes the answer: swap him for a plain guy and the ✓ moves.
 * Otherwise his label is decoration and "don't stand next to anyone" solves the room. A happy boss
 * already acts like a plain guy, so his test is the other way round: treat him as stressed and the
 * ✓ moves (he's a trap for anyone who flinches at the BOSS chip without reading his mood).
 */
export function labelsMatter(b: Bathroom, ev: Evaluation = evaluate(b)): boolean {
  const key = ev.greens.join();
  return b.slots.every((s, j) => {
    const g = s.occupant;
    // Twins and the napper play by the regular rules; their label is a bonus, not the puzzle.
    if (!g || g.quirk === 'normal' || g.quirk === 'twin' || g.quirk === 'napper' || s.kind !== 'urinal' || (g.part ?? 0) > 0) return true;
    // A guy wider than one urinal is swapped whole, for plain guys in each of his urinals.
    let end = j;
    while (b.slots[end + 1]?.occupant?.quirk === g.quirk && (b.slots[end + 1].occupant?.part ?? 0) > 0) end++;
    const swapped: Guy = g.quirk === 'boss' && g.mood === 'happy' ? { ...g, mood: 'stressed' } : { ...g, quirk: 'normal', lean: undefined, mood: undefined, part: undefined };
    const plain: Bathroom = { ...b, slots: b.slots.map((x, k) => (k >= j && k <= end ? { ...x, occupant: swapped } : x)) };
    return evaluate(plain).greens.join() !== key;
  });
}

/** True when no naive pick is clear (the round punishes eyeballing). */
export function isTrap(b: Bathroom, ev: Evaluation = evaluate(b)): boolean {
  const naive = naivePicks(b);
  return ev.greens.length > 0 && !naive.some((i) => ev.greens.includes(i));
}

// ---------------------------------------------------------------------------
// Layout building blocks
// ---------------------------------------------------------------------------

const PLACEHOLDER_LOOK: Guy['look'] = { shirt: 0, pants: 0, hair: 0, skin: 0, height: 0, bald: false };

function guy(quirk: Quirk, rng: Rng): Guy {
  const g: Guy = { quirk, name: '', blurb: '', look: PLACEHOLDER_LOOK };
  if (quirk === 'drunk' || quirk === 'facetime' || quirk === 'peeper' || quirk === 'knight') g.lean = rng.chance(0.5) ? 'left' : 'right';
  if (quirk === 'boss') g.mood = rng.pick(['happy', 'stressed', 'angry'] as const);
  return g;
}

function door(rng: Rng): Side {
  return rng.chance(0.5) ? 'left' : 'right';
}

/** n slots; `stalls` stalls packed at one end ('far' = opposite the door). */
function room(n: number, d: Side, stalls: number, at: 'far' | 'door'): Bathroom {
  const slots: Slot[] = Array.from({ length: n }, () => ({ kind: 'urinal' as const }));
  const farIsRight = d === 'left';
  const right = at === 'far' ? farIsRight : !farIsRight;
  for (let k = 0; k < stalls; k++) slots[right ? n - 1 - k : k] = { kind: 'stall' };
  return { slots, dividers: Array.from({ length: n - 1 }, () => false), door: d };
}

/** Dividers only go between two urinals. 'all' = every urinal gap; 'some' = each gap with p. */
function addDividers(rng: Rng, b: Bathroom, mode: 'none' | 'all' | 'some', p = 0.4): void {
  if (mode === 'none') return;
  for (let k = 0; k < b.dividers.length; k++) {
    if (b.slots[k].kind !== 'urinal' || b.slots[k + 1].kind !== 'urinal') continue;
    b.dividers[k] = mode === 'all' || rng.chance(p);
  }
}

function freeUrinals(b: Bathroom): number[] {
  const out: number[] = [];
  b.slots.forEach((s, i) => s.kind === 'urinal' && !s.occupant && !s.flag && out.push(i));
  return out;
}

/** Free plain urinals with `n - 1` more free plain urinals right after them, with no divider between. */
function freeRuns(b: Bathroom, n: number): number[] {
  const free = new Set(freeUrinals(b));
  const out: number[] = [];
  for (const i of free) {
    let ok = true;
    for (let k = 1; k < n && ok; k++) ok = free.has(i + k) && !b.dividers[i + k - 1];
    if (ok) out.push(i);
  }
  return out;
}

function placeGuys(rng: Rng, b: Bathroom, quirks: Quirk[]): void {
  for (const q of quirks) {
    const free = freeUrinals(b);
    if (free.length === 0) return;
    // Two-urinal guys: the napper lies across two, the wolf mascot is two urinals wide.
    if (q === 'napper' || q === 'mascot' || q === 'sumo') {
      const width = q === 'sumo' ? 3 : 2;
      const runs = freeRuns(b, width);
      if (runs.length === 0) continue;
      const i = rng.pick(runs);
      for (let k = 0; k < width; k++) b.slots[i + k].occupant = { ...guy(q, rng), part: k as 0 | 1 | 2 };
      continue;
    }
    // Twins side by side (rarely triplets): one unit.
    if (q === 'twin') {
      const n = rng.chance(1 / 15) ? 3 : 2;
      const runs = freeRuns(b, n);
      if (runs.length === 0) continue;
      const i = rng.pick(runs);
      const group = i + 1; // unique within the room, and the same every time the seed is built
      for (let k = 0; k < n; k++) b.slots[i + k].occupant = { ...guy(q, rng), group };
      continue;
    }
    // Gym Bro: a sink takes this urinal's spot, and his flex reaches over the urinal on one side.
    if (q === 'gymbro') {
      const spots = free.filter((i) => [i - 1, i + 1].some((k) => b.slots[k]?.kind === 'urinal' && !b.slots[k].occupant && !b.slots[k].flag));
      if (spots.length === 0) continue;
      const i = rng.pick(spots);
      const sides = ([-1, 1] as const).filter((d) => b.slots[i + d]?.kind === 'urinal' && !b.slots[i + d].occupant && !b.slots[i + d].flag);
      const d = rng.pick(sides);
      b.slots[i].flag = 'sink';
      b.slots[i].occupant = { ...guy(q, rng), lean: d < 0 ? 'left' : 'right' };
      continue;
    }
    const g = guy(q, rng);
    if (q === 'gassy' || q === 'pastor') g.lean = b.door; // the smell drifts out the door; the pastor greets everyone at it
    b.slots[rng.pick(free)].occupant = g;
  }
}

/**
 * How often each guy is drawn. Tuned against a year of dailies so everyone shows up: the classics
 * change the answer in more rooms and survive the generator's checks more often, so they draw less.
 */
const QUIRK_WEIGHT: Partial<Record<Quirk, number>> = {
  talker: 0.25,
  boss: 0.35,
  drunk: 0.35,
  splasher: 0.35,
  friend: 0.12,
  facetime: 1.3,
  peeper: 1.3,
  pilot: 1.2,
  crypto: 0.7,
  finance: 1.4,
  dropper: 1.5,
  sumo: 0.25,
  shy: 2.5,
  napper: 2.2,
  pastor: 2,
  security: 2.2,
  germ: 4,
  knight: 3,
  twin: 3,
  gymbro: 5,
  tourist: 7,
  mascot: 8,
};

/** Picks a quirk from a list, weighted so every guy turns up now and then. */
function pickQuirk(rng: Rng, list: readonly Quirk[]): Quirk {
  return rng.weighted(list, (q) => QUIRK_WEIGHT[q] ?? 1);
}

function addFlags(rng: Rng, b: Bathroom, count: number, kinds: readonly UrinalFlag[]): void {
  for (let k = 0; k < count; k++) {
    const free = freeUrinals(b);
    if (free.length === 0) return;
    b.slots[rng.pick(free)].flag = rng.pick(kinds);
  }
}

const ALL_FLAGS: readonly UrinalFlag[] = ['low', 'puddle', 'broken'];
const SOFT_QUIRKS: readonly Quirk[] = ['talker', 'splasher', 'facetime', 'inlaw', 'pastor', 'pilot', 'tourist', 'crypto', 'twin', 'napper', 'germ', 'security', 'friend', 'dropper', 'knight', 'sumo'];
const BIG_QUIRKS: readonly Quirk[] = ['boss', 'drunk', 'gassy', 'peeper', 'finance', 'shy', 'mascot', 'gymbro'];
const ANY_QUIRK: readonly Quirk[] = ['talker', 'splasher', 'boss', 'drunk', 'facetime', 'gassy', 'inlaw', 'pastor', 'peeper', 'pilot', 'tourist', 'crypto', 'finance', 'shy', 'mascot', 'gymbro', 'twin', 'napper', 'germ', 'security', 'friend', 'dropper', 'knight', 'sumo'];

/** Per-round intent decided once, before rejection sampling. */
interface Plan {
  /** Room size, fixed up front so rejection sampling can't skew the size mix. */
  size: number;
  /** d6 only: what kind of answer we're aiming for. */
  target?: 'stall' | 'urinal' | 'only-option';
}

function makePlan(rng: Rng, d: Difficulty): Plan {
  const size = roomSize(rng, d);
  if (d !== 6) return { size };
  const r = rng.next();
  // Stalls are rare by design (the user: they undercut the puzzle). Hard rooms lean on least-bad picks instead.
  return { size, target: r < 0.06 ? 'stall' : r < 0.26 ? 'only-option' : 'urinal' };
}

/** Small rooms (2..4 slots) relax the constraints: breaking the Code may be unavoidable. */
export const SMALL_ROOM = 4;

const D1_SIZE_WEIGHTS: Record<number, number> = { 3: 1, 4: 1.5, 5: 3, 6: 3, 7: 2 };

function roomSize(rng: Rng, d: Difficulty): number {
  if (d === 1) return rng.weighted([3, 4, 5, 6, 7], (n) => D1_SIZE_WEIGHTS[n] ?? 1);
  if (rng.chance(0.2)) return rng.weighted([2, 3, 4], (n) => (n === 2 ? 1 : 2));
  switch (d) {
    case 2: return rng.int(5, 8);
    case 3: return rng.int(6, 9);
    case 4: return rng.int(7, 10);
    case 5: return rng.int(8, 10);
    default: return rng.int(9, 10);
  }
}

/** Keep quirks (listed first) and drop extras so a small room keeps free spots. */
function fitGuys(guys: Quirk[], n: number, stalls: number): Quirk[] {
  const max = n <= 3 ? 1 : n === 4 ? (stalls > 0 ? 1 : 2) : Math.max(1, n - stalls - 3);
  return guys.slice(0, max);
}

/** Chance a d3..d6 room has a stall at all. Kept low: stalls undercut the puzzle. */
const STALL_CHANCE = 0.05;

function stallEnd(rng: Rng, pFar: number): 'far' | 'door' {
  return rng.chance(pFar) ? 'far' : 'door';
}

function dividerMode(rng: Rng, p: number): 'none' | 'all' | 'some' {
  return rng.chance(p) ? (rng.chance(0.5) ? 'all' : 'some') : 'none';
}

function layout(rng: Rng, d: Difficulty, plan: Plan): Bathroom {
  const n = plan.size;
  const small = n <= SMALL_ROOM;
  let stalls = 0;
  let guys: Quirk[];
  let b: Bathroom;
  switch (d) {
    case 1: {
      // Easy and obvious: a plain guy or two, one clearly roomiest spot.
      b = room(n, door(rng), 0, 'far');
      guys = rng.chance(0.55) ? ['normal', 'normal'] : ['normal'];
      placeGuys(rng, b, fitGuys(guys, n, 0));
      if (!small && rng.chance(0.15)) addFlags(rng, b, 1, ['broken']);
      return b;
    }
    case 2: {
      // One new wrinkle: a flagged urinal, a third guy, or (rarely) both.
      b = room(n, door(rng), 0, 'far');
      const r = rng.next();
      const third = r >= 0.55;
      const flag = r < 0.55 || r >= 0.85;
      placeGuys(rng, b, fitGuys(third ? ['normal', 'normal', 'normal'] : ['normal', 'normal'], n, 0));
      if (flag) addFlags(rng, b, 1, ALL_FLAGS);
      return b;
    }
    case 3: {
      // First quirk. Maybe dividers, rarely a stall at one end.
      stalls = n >= 3 && rng.chance(STALL_CHANCE) ? 1 : 0;
      b = room(n, door(rng), stalls, stallEnd(rng, 0.7));
      addDividers(rng, b, dividerMode(rng, 0.5));
      guys = [pickQuirk(rng, SOFT_QUIRKS)];
      if (rng.chance(0.75)) guys.push('normal');
      if (rng.chance(0.3)) addFlags(rng, b, 1, ALL_FLAGS);
      break;
    }
    case 4: {
      stalls = n >= 3 && rng.chance(STALL_CHANCE) ? 1 : 0;
      b = room(n, door(rng), stalls, stallEnd(rng, 0.7));
      addDividers(rng, b, dividerMode(rng, 0.75));
      const nQuirk = rng.chance(0.5) ? 2 : 1;
      const nGuys = Math.max(nQuirk, rng.int(2, 3));
      guys = [];
      for (let k = 0; k < nQuirk; k++) guys.push(pickQuirk(rng, SOFT_QUIRKS));
      while (guys.length < nGuys) guys.push('normal');
      if (!small) addFlags(rng, b, rng.int(0, 2), ['low', 'puddle', 'low', 'puddle', 'broken']);
      break;
    }
    case 5: {
      stalls = n >= 3 && rng.chance(STALL_CHANCE) ? 1 : 0;
      b = room(n, door(rng), stalls, stallEnd(rng, 0.75));
      addDividers(rng, b, dividerMode(rng, 0.75));
      guys = [pickQuirk(rng, BIG_QUIRKS)];
      if (rng.chance(0.5)) guys.push(pickQuirk(rng, SOFT_QUIRKS));
      const nGuys = rng.int(3, 4);
      while (guys.length < nGuys) guys.push('normal');
      if (!small) addFlags(rng, b, rng.int(0, 1), ALL_FLAGS);
      break;
    }
    case 6:
    default: {
      const target = plan.target ?? 'urinal';
      stalls = target === 'only-option' || n < 3 ? 0 : target === 'stall' ? 1 : rng.chance(STALL_CHANCE) ? 1 : 0;
      b = room(n, door(rng), stalls, stallEnd(rng, 0.65));
      addDividers(rng, b, dividerMode(rng, 0.7));
      const nGuys = rng.int(3, 5);
      const nQuirk = rng.int(2, Math.min(3, nGuys));
      guys = [];
      for (let k = 0; k < nQuirk; k++) guys.push(pickQuirk(rng, ANY_QUIRK));
      while (guys.length < nGuys) guys.push('normal');
      if (!small) addFlags(rng, b, rng.int(0, 2), ALL_FLAGS);
      break;
    }
  }
  // Security is there for the stall: give him one at the far end.
  if (guys.includes('security') && stalls === 0 && n >= 4) {
    const end = b.door === 'left' ? n - 1 : 0;
    b.slots[end] = { kind: 'stall' };
    b.dividers[end === 0 ? 0 : end - 1] = false;
    stalls = 1;
  }
  placeGuys(rng, b, rng.shuffle(fitGuys(guys, n, stalls)));
  return b;
}

// ---------------------------------------------------------------------------
// Acceptance
// ---------------------------------------------------------------------------

/**
 * Stage 0 = everything we want; 1 = drop preferences; 2 = hard rules only.
 * Hard rules: exactly one clear, <= 10 slots, at least one guy. Rooms bigger than SMALL_ROOM
 * also need >= 3 pickable and a Code-breaking spot (amber/doctor); d2..d5 a straw; d4..d5 a trap.
 */
function accepts(b: Bathroom, ev: Evaluation, d: Difficulty, plan: Plan, stage: number): boolean {
  const n = b.slots.length;
  if (n > 10 || n < 2 || ev.greens.length !== 1) return false;
  if (!b.slots.some((s) => s.occupant)) return false;
  const small = n <= SMALL_ROOM;
  let pickable = 0;
  let straw = 0;
  let broke = 0;
  for (const s of ev.slots) {
    if (!s.pickable) continue;
    pickable++;
    if (s.grade === 'straw') straw++;
    else if (s.grade === 'amber' || s.grade === 'doctor') broke++;
  }
  const green = ev.slots[ev.greens[0]];
  // The answer is never right next to the FaceTime guy, whichever hand holds the phone.
  // (Small rooms are exempt: with two or three urinals, beside him on camera can be the least bad.)
  if (!small && (b.slots[green.index - 1]?.occupant?.quirk === 'facetime' || b.slots[green.index + 1]?.occupant?.quirk === 'facetime')) return false;
  // From d3 on, a room with a single free spot is a free point: never allowed.
  if (d >= 3 && pickable < 2) return false;
  if (!small) {
    if (pickable < 3 || broke < 1) return false;
    if (d >= 2 && d <= 5 && straw < 1) return false;
    if ((d === 4 || d === 5) && !isTrap(b, ev)) return false;
  }
  // Security is there for the stall: no stall, no guard.
  if (b.slots.some((s) => s.occupant?.quirk === 'security') && !b.slots.some((s) => s.kind === 'stall')) return false;
  // The shy guy would have left already, and nobody stands at the germaphobe's wet urinals: their space is empty when you walk in.
  if (b.slots.some((s, j) => (s.occupant?.quirk === 'shy' || s.occupant?.quirk === 'germ') && zoneCovers(b, j).some((k) => b.slots[k].occupant))) return false;
  // From d3 on, a room has at least one guy with a label who isn't playing by the regular rules.
  if (d >= 3 && !b.slots.some((s) => s.occupant && !actsNormal(s.occupant))) return false;
  // A hard (d5) room always has one of the big guys. Some need two free urinals in a row and can fail to
  // fit, so check rather than assume.
  if (d === 5 && !b.slots.some((s) => s.occupant && BIG_QUIRKS.includes(s.occupant.quirk))) return false;
  // Easy rooms never hinge on the stall (a hard rule: the fallback stages keep it too).
  if (d >= 2 && d <= 4 && green.reason === 'stall-forced') return false;
  if (stage >= 2) return true;
  // Every label has to change the answer (playtest: rooms were solvable without reading them).
  // Small rooms are exempt: in two or three urinals you do what you gotta do (the user likes them).
  if (d >= 3 && !small && !labelsMatter(b, ev)) return false;

  if (d === 1 && !small) {
    // The clear spot must be the single roomiest spot, not a tiebreak.
    if (green.tier !== 0) return false;
    for (const s of ev.slots) {
      if (s.pickable && s.index !== green.index && (s.clearance ?? 0) >= (green.clearance ?? 0)) return false;
    }
  }
  if (d === 2 && !small && green.tier !== 0) return false;
  if (d >= 2 && d <= 4 && green.reason === 'stall-forced') return false;
  if (d === 5 && !small && green.reason === 'stall-forced') return false;
  if (d === 3 && stage === 0 && !small && !isTrap(b, ev)) return false;
  if (d === 6) {
    const t = plan.target ?? 'urinal';
    if (t === 'stall' && green.reason !== 'stall-forced') return false;
    if (t === 'only-option' && green.reason !== 'only-option') return false;
    if (t === 'urinal' && (green.reason !== 'perfect' || (stage === 0 && !small && !isTrap(b, ev)))) return false;
  }
  return true;
}

/** Always-valid backup: guys at 3 and 5 of six plain urinals (clear 0, straw 1, amber 2 and 4). */
function fallbackLayout(rng: Rng): Bathroom {
  const b = room(6, door(rng), 0, 'far');
  b.slots[3].occupant = guy('normal', rng);
  b.slots[5].occupant = guy('normal', rng);
  return b;
}

const ATTEMPTS_PER_STAGE = 400;

function buildBathroom(rng: Rng, d: Difficulty): Bathroom {
  const planRng = rng.fork('plan');
  const plan = makePlan(planRng, d);
  // Stages 0..2 keep the planned size; stage 3 lets the size vary too (hard rules only).
  for (let stage = 0; stage < 4; stage++) {
    const stageRng = rng.fork(`stage${stage}`);
    for (let a = 0; a < ATTEMPTS_PER_STAGE; a++) {
      const p = stage < 3 ? plan : { ...plan, size: roomSize(stageRng, d) };
      const b = layout(stageRng, d, p);
      if (accepts(b, evaluate(b), d, p, Math.min(stage, 2))) return b;
    }
  }
  return fallbackLayout(rng.fork('fallback'));
}

/**
 * Endless: a truly random room. Any size, any mix of guys, flags and dividers, nothing shaped to a
 * difficulty. Only sanity rules: one right answer, a real choice, and the guys' own rules (shy/germ
 * space empty). The security guard needs a stall to guard, so he sits these out.
 */
const RANDOM_QUIRKS: readonly Quirk[] = ANY_QUIRK.filter((q) => q !== 'security');

function randomBathroom(rng: Rng): Bathroom {
  for (let a = 0; a < 400; a++) {
    const n = rng.weighted([2, 3, 4, 5, 6, 7, 8, 9, 10], (k) => (k <= 3 ? 0.6 : k === 4 ? 1 : 2));
    const stalls = n >= 4 && rng.chance(0.08) ? 1 : 0;
    const b = room(n, door(rng), stalls, stallEnd(rng, 0.7));
    if (rng.chance(0.4)) addDividers(rng, b, rng.chance(0.5) ? 'all' : 'some');
    const nGuys = rng.int(1, Math.max(1, Math.ceil((n - stalls) / 2)));
    const guys: Quirk[] = [];
    for (let k = 0; k < nGuys; k++) guys.push(rng.chance(0.4) ? 'normal' : pickQuirk(rng, RANDOM_QUIRKS));
    if (n > SMALL_ROOM && rng.chance(0.4)) addFlags(rng, b, rng.int(1, 2), ALL_FLAGS);
    placeGuys(rng, b, guys);
    if (randomOk(b, evaluate(b))) return b;
  }
  return fallbackLayout(rng.fork('fallback'));
}

function randomOk(b: Bathroom, ev: Evaluation): boolean {
  if (ev.greens.length !== 1 || !b.slots.some((s) => s.occupant)) return false;
  const pickable = ev.slots.filter((s) => s.pickable).length;
  if (pickable < 2) return false;
  if (b.slots.some((s, j) => (s.occupant?.quirk === 'shy' || s.occupant?.quirk === 'germ') && zoneCovers(b, j).some((k) => b.slots[k].occupant))) return false;
  return true;
}

/** An Endless room from the random generator (difficulty is only a label here). */
export function randomRound(seed: number, id: string): Round {
  const rng = createRng(seed);
  const bathroom = randomBathroom(rng.fork('random-room'));
  dressGuys(rng.fork('people'), bathroom);
  const extra = rng.fork('boss-stall');
  if (extra.chance(BOSS_STALL_CHANCE)) bossInStall(extra, bathroom);
  const d = practiceDifficulty(seed);
  return { id, seed, difficulty: d, venue: pickVenue(rng.fork('venue'), d), bathroom };
}

// ---------------------------------------------------------------------------
// People + venue
// ---------------------------------------------------------------------------

function pickPerson(rng: Rng, quirk: Quirk, used: Set<string>): { name: string; blurb: string } {
  const text = QUIRKS[quirk];
  const pool = (text?.people ?? []).filter((p) => p && typeof p.name === 'string' && p.name.length > 0);
  const fresh = pool.filter((p) => !used.has(p.name));
  const p = fresh.length > 0 ? rng.pick(fresh) : pool.length > 0 ? rng.pick(pool) : { name: text?.label || 'Some guy', blurb: '' };
  let name = p.name;
  for (let k = 2; used.has(name); k++) name = `${p.name} ${k}`;
  used.add(name);
  return { name, blurb: p.blurb ?? '' };
}

/** Names + looks for every occupant. `people` (set pieces) overrides urinal occupants left to right. */
function dressGuys(rng: Rng, b: Bathroom, people?: SetPiece['people']): void {
  const used = new Set<string>();
  let k = 0;
  for (const s of b.slots) {
    const g = s.occupant;
    if (!g) continue;
    const given = s.kind === 'urinal' ? people?.[k++] : undefined;
    if (given) used.add(given.name);
    // Rare sightings: a plain guy is now and then someone else entirely (same rules, so the answer holds).
    if (!given && g.quirk === 'normal') {
      const roll = rng.next();
      if (roll < 1 / 400) g.quirk = 'doppel';
      else if (roll < 2 / 400) g.quirk = 'bigfoot';
      else if (roll < 2 / 400 + 1 / 140) g.quirk = 'rookie';
    }
    // The second half of a two-urinal guy is the same guy.
    const prev = b.slots[b.slots.indexOf(s) - 1]?.occupant;
    if (g.part !== undefined && g.part > 0 && prev && prev.quirk === g.quirk) {
      g.name = prev.name;
      g.blurb = prev.blurb;
      g.look = prev.look;
      continue;
    }
    const person = given ?? pickPerson(rng, g.quirk, used);
    g.name = person.name;
    g.blurb = person.blurb;
    g.look = {
      shirt: rng.int(0, 7),
      pants: rng.int(0, 4),
      hair: rng.int(0, 5),
      skin: rng.int(0, 4),
      height: rng.int(0, 2),
      bald: rng.chance(0.15),
    };
  }
  // Rookies: each his own jersey number and his own haircut (a whole team can walk in).
  const numbers = new Set<number>();
  const cuts = new Set<number>();
  for (const s of b.slots) {
    const g = s.occupant;
    if (g?.quirk !== 'rookie') continue;
    let n = rng.int(1, 99);
    while (numbers.has(n)) n = (n % 99) + 1;
    numbers.add(n);
    let h = g.look.hair;
    for (let t = 0; t < 6 && cuts.has(h); t++) h = (h + 1) % 6;
    cuts.add(h);
    g.look = { ...g.look, jersey: n, hair: h, bald: false };
  }
  // Twins (and triplets) are identical: same look as the first of them.
  const firsts = new Map<number, Guy['look']>();
  for (const s of b.slots) {
    const g = s.occupant;
    if (g?.quirk !== 'twin' || g.group === undefined) continue;
    const look = firsts.get(g.group);
    if (look) g.look = look;
    else firsts.set(g.group, g.look);
  }
}

function pickVenue(rng: Rng, d: Difficulty): string {
  const pool = (VENUES[d - 1] ?? []).filter((v) => typeof v === 'string' && v.length > 0);
  return pool.length > 0 ? rng.pick(pool) : 'A bathroom';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** How often the boss is hiding in an extra stall, just for fun. */
const BOSS_STALL_CHANCE = 1 / 30;

/**
 * Adds an occupied stall on the right end with the boss inside. It's a joke, not a rule: a stall
 * nobody can use and nobody stands next to, so it's kept only if every spot grades exactly as before.
 * Added on the right so no slot number moves.
 */
function bossInStall(rng: Rng, b: Bathroom): void {
  if (b.slots.length <= SMALL_ROOM || b.slots.length >= 10 || b.slots.some((s) => s.occupant?.quirk === 'boss')) return;
  const used = new Set(b.slots.flatMap((s) => (s.occupant ? [s.occupant.name] : [])));
  const person = pickPerson(rng, 'boss', used);
  const boss: Guy = {
    ...guy('boss', rng),
    name: person.name,
    blurb: person.blurb,
    look: { shirt: rng.int(0, 7), pants: rng.int(0, 4), hair: rng.int(0, 5), skin: rng.int(0, 4), height: rng.int(0, 2), bald: rng.chance(0.15) },
  };
  const next: Bathroom = { ...b, slots: [...b.slots, { kind: 'stall', occupant: boss }], dividers: [...b.dividers, false] };
  const before = evaluate(b);
  const after = evaluate(next);
  if (before.greens.join() !== after.greens.join() || naivePicks(b).join() !== naivePicks(next).join()) return;
  if (!before.slots.every((s) => after.slots[s.index]?.grade === s.grade && after.slots[s.index]?.reason === s.reason)) return;
  b.slots = next.slots;
  b.dividers = next.dividers;
}

export function generateRound(seed: number, difficulty: Difficulty, id: string): Round {
  const rng = createRng(seed);
  const bathroom = buildBathroom(rng.fork(`layout-d${difficulty}`), difficulty);
  dressGuys(rng.fork('people'), bathroom);
  const extra = rng.fork('boss-stall');
  if (difficulty >= 3 && extra.chance(BOSS_STALL_CHANCE)) bossInStall(extra, bathroom);
  const venue = pickVenue(rng.fork('venue'), difficulty);
  return { id, seed, difficulty, venue, bathroom };
}

/**
 * The usual daily: 1 easy, 1 medium, 3 hard. Every room has at least one guy with a label. Rounds 2 and 5
 * are always 4 and 6, the set-piece rounds.
 */
export const DAILY_DIFFICULTIES: readonly Difficulty[] = [3, 4, 5, 6, 6];

/** Some days vary the usual shape a little (weights out of 10). */
const DAILY_SHAPES: readonly { shape: readonly Difficulty[]; weight: number }[] = [
  { shape: DAILY_DIFFICULTIES, weight: 7 },
  { shape: [3, 4, 5, 5, 6], weight: 2 }, // a gentler middle
  { shape: [3, 4, 6, 6, 6], weight: 1 }, // brutal
];

/** Days before this keep the plain shape, so rooms already played never change. */
const SHAPE_VARIES_FROM = '2026-11-03';

/** Difficulty of each round on a date. Same for everyone. */
export function dailyDifficulties(dateKey: string): readonly Difficulty[] {
  if (dateKey < SHAPE_VARIES_FROM) return DAILY_DIFFICULTIES;
  return createRng(`shape:${dateKey}`).weighted(DAILY_SHAPES, (s) => s.weight).shape;
}

/** The first-visit warm-up: easy, easy, medium. Fixed rooms, the same for everyone; never scored. */
export function warmupRounds(): Round[] {
  return ([1, 2, 3] as const).map((d) => generateRound(hashString(`warmup-${d}`) & SEED_MASK, d, `w-r${d}`));
}

/** Seed of round r (1..5) of a date. */
export function dailyRoundSeed(dateKey: string, r: number): number {
  return hashString(`r${r}`, seedFrom(`urinal:${dateKey}`)) & SEED_MASK;
}

/** The rounds of a given local date (YYYY-MM-DD), by dailyDifficulties. Same for everyone. */
export function dailyRounds(dateKey: string): Round[] {
  const rounds: Round[] = [];
  dailyDifficulties(dateKey).forEach((d, k) => {
    const r = k + 1;
    const seed = dailyRoundSeed(dateKey, r);
    const id = `d${dateKey}-r${r}`;
    const sp = SET_PIECE_ROUNDS.includes(r) ? dailySetPiece(dateKey, d) : undefined;
    rounds.push(sp ? setPieceRound(sp, seed, id) : generateRound(seed, d, id));
  });
  return rounds;
}

// ---------------------------------------------------------------------------
// Set pieces (handmade rooms from src/content/setpieces.ts)
// ---------------------------------------------------------------------------

/** Daily rounds (1-based) that use a set piece of that round's difficulty, when one exists. */
export const SET_PIECE_ROUNDS: readonly number[] = [2, 5];

/** Set pieces come in these difficulties (2 is Endless-only since the daily dropped its warm-ups). */
export const SET_PIECE_DIFFICULTIES: readonly Difficulty[] = [2, 4, 6];

export function setPieceRound(sp: SetPiece, seed: number, id: string): Round {
  const bathroom = parseLayout(sp.layout, sp.door);
  dressGuys(createRng(seed).fork('people'), bathroom, sp.people);
  return { id, seed, difficulty: sp.difficulty, venue: sp.venue, premise: sp.premise, bathroom };
}

/** Set pieces of one difficulty in a fixed shuffled order (stable as long as the pool is unchanged). */
function setPieceBucket(d: Difficulty): SetPiece[] {
  const bucket = SET_PIECES.filter((sp) => sp.difficulty === d).sort((a, b) => (a.id < b.id ? -1 : 1));
  return createRng(`setpieces-d${d}`).shuffle(bucket);
}

/** The set piece for difficulty d on a date: walks the shuffled bucket one per day, then repeats. */
export function dailySetPiece(dateKey: string, d: Difficulty): SetPiece | undefined {
  const bucket = setPieceBucket(d);
  if (bucket.length === 0) return undefined;
  const n = bucket.length;
  return bucket[(((dailyNumber(dateKey) - 1) % n) + n) % n];
}

/** Difficulty (2..6) a practice seed plays at. */
export function practiceDifficulty(seed: number): Difficulty {
  return (2 + (hashString('difficulty', seed & SEED_MASK) % 5)) as Difficulty;
}

/** A practice round from a 30-bit seed (difficulty derived from the seed, 2..6). */
/** One Endless room in this many is a legendary room. */
export const LEGEND_ODDS = 2000;

/** The first Endless seed that deals legendary room `id` (for the dev gallery's links). */
export function legendSeed(id: string): number | undefined {
  const k = LEGENDARY_ROOMS.findIndex((r) => r.id === id);
  if (k < 0) return undefined;
  for (let s = 1; s < 10_000_000; s++) {
    if (hashString('empty-room', s) % 100 === 0) continue;
    const legend = hashString('legendary', s);
    if (legend % LEGEND_ODDS === 0 && Math.floor(legend / LEGEND_ODDS) % LEGENDARY_ROOMS.length === k) return s;
  }
  return undefined;
}

export function practiceRound(seed: number): Round {
  const s = seed & SEED_MASK;
  const id = `p-${encodePracticeCode(s)}`;
  // Rarely (about 1 in 100), nobody's in here at all. The far end from the door, obviously.
  if (hashString('empty-room', s) % 100 === 0) return emptyRound(s, id);
  // Very rarely (about 1 in 2,000), a legendary room: a whole basketball team, a family of Bigfoots...
  const legend = hashString('legendary', s);
  if (legend % LEGEND_ODDS === 0) {
    const sp = LEGENDARY_ROOMS[Math.floor(legend / LEGEND_ODDS) % LEGENDARY_ROOMS.length];
    return { ...setPieceRound(sp, s, id), legend: sp.id };
  }
  // Now and then a handmade room; otherwise anything goes.
  const roll = hashString('set-piece', s);
  if (SET_PIECES.length > 0 && roll % 10 === 0) return setPieceRound(SET_PIECES[Math.floor(roll / 10) % SET_PIECES.length], s, id);
  return randomRound(s, id);
}

/** An empty bathroom (a rare Endless room): every urinal free, the answer is the far end from the door. */
export function emptyRound(seed: number, id: string): Round {
  const rng = createRng(seed).fork('empty');
  const bathroom = room(rng.int(4, 8), door(rng), 0, 'far');
  return { id, seed, difficulty: 2, venue: pickVenue(rng.fork('venue'), 2), premise: 'Nobody’s here. Nobody.', bathroom };
}
