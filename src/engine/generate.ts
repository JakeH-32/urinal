// Seeded bathroom generator. Owned by the Engine agent.
//
// Layout, people and venue each draw from their own RNG fork, so filling in the content
// pools never changes a day's layouts. Rounds are rejection-sampled against per-difficulty
// constraints (see `accepts`), relaxing in stages; it never throws.
import { QUIRKS, VENUES } from '../content';
import { SET_PIECES } from '../content/setpieces';
import type { Bathroom, Difficulty, Evaluation, Guy, Quirk, Rng, Round, SetPiece, Side, Slot, UrinalFlag } from '../types';
import { evaluate, isPickable } from './code';
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
    if (s.kind !== 'urinal' || !isPickable(s)) return;
    let d = Infinity;
    for (const j of occ) d = Math.min(d, Math.abs(i - j));
    if (d > bestD) {
      bestD = d;
      out = [i];
    } else if (d === bestD) out.push(i);
  });
  return out;
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
  if (quirk === 'drunk' || quirk === 'facetime') g.lean = rng.chance(0.5) ? 'left' : 'right';
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

function placeGuys(rng: Rng, b: Bathroom, quirks: Quirk[]): void {
  for (const q of quirks) {
    const free = freeUrinals(b);
    if (free.length === 0) return;
    b.slots[rng.pick(free)].occupant = guy(q, rng);
  }
}

function addFlags(rng: Rng, b: Bathroom, count: number, kinds: readonly UrinalFlag[]): void {
  for (let k = 0; k < count; k++) {
    const free = freeUrinals(b);
    if (free.length === 0) return;
    b.slots[rng.pick(free)].flag = rng.pick(kinds);
  }
}

const ALL_FLAGS: readonly UrinalFlag[] = ['low', 'puddle', 'broken'];
const SOFT_QUIRKS: readonly Quirk[] = ['talker', 'splasher', 'facetime'];
const BIG_QUIRKS: readonly Quirk[] = ['boss', 'drunk'];
const ANY_QUIRK: readonly Quirk[] = ['talker', 'splasher', 'boss', 'drunk', 'facetime'];

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
      guys = [rng.pick(SOFT_QUIRKS)];
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
      for (let k = 0; k < nQuirk; k++) guys.push(rng.pick(SOFT_QUIRKS));
      while (guys.length < nGuys) guys.push('normal');
      if (!small) addFlags(rng, b, rng.int(0, 2), ['low', 'puddle', 'low', 'puddle', 'broken']);
      break;
    }
    case 5: {
      stalls = n >= 3 && rng.chance(STALL_CHANCE) ? 1 : 0;
      b = room(n, door(rng), stalls, stallEnd(rng, 0.75));
      addDividers(rng, b, dividerMode(rng, 0.75));
      guys = [rng.pick(BIG_QUIRKS)];
      if (rng.chance(0.5)) guys.push(rng.pick(SOFT_QUIRKS));
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
      for (let k = 0; k < nQuirk; k++) guys.push(rng.pick(ANY_QUIRK));
      while (guys.length < nGuys) guys.push('normal');
      if (!small) addFlags(rng, b, rng.int(0, 2), ALL_FLAGS);
      break;
    }
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
  // From d3 on, a room with a single free spot is a free point: never allowed.
  if (d >= 3 && pickable < 2) return false;
  if (!small) {
    if (pickable < 3 || broke < 1) return false;
    if (d >= 2 && d <= 5 && straw < 1) return false;
    if ((d === 4 || d === 5) && !isTrap(b, ev)) return false;
  }
  if (stage >= 2) return true;

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
}

function pickVenue(rng: Rng, d: Difficulty): string {
  const pool = (VENUES[d - 1] ?? []).filter((v) => typeof v === 'string' && v.length > 0);
  return pool.length > 0 ? rng.pick(pool) : 'A bathroom';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateRound(seed: number, difficulty: Difficulty, id: string): Round {
  const rng = createRng(seed);
  const bathroom = buildBathroom(rng.fork(`layout-d${difficulty}`), difficulty);
  dressGuys(rng.fork('people'), bathroom);
  const venue = pickVenue(rng.fork('venue'), difficulty);
  return { id, seed, difficulty, venue, bathroom };
}

/** Seed of round r (1..6) of a date. */
export function dailyRoundSeed(dateKey: string, r: number): number {
  return hashString(`r${r}`, seedFrom(`urinal:${dateKey}`)) & SEED_MASK;
}

/** The 6 rounds of a given local date (YYYY-MM-DD), difficulty 1..6. Same for everyone. */
export function dailyRounds(dateKey: string): Round[] {
  const rounds: Round[] = [];
  for (let r = 1; r <= 6; r++) {
    const seed = dailyRoundSeed(dateKey, r);
    const id = `d${dateKey}-r${r}`;
    const sp = SET_PIECE_ROUNDS.includes(r) ? dailySetPiece(dateKey, r as Difficulty) : undefined;
    rounds.push(sp ? setPieceRound(sp, seed, id) : generateRound(seed, r as Difficulty, id));
  }
  return rounds;
}

// ---------------------------------------------------------------------------
// Set pieces (handmade rooms from src/content/setpieces.ts)
// ---------------------------------------------------------------------------

/** Daily rounds that use a set piece of the same difficulty, when one exists. */
export const SET_PIECE_ROUNDS: readonly number[] = [2, 4, 6];

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
export function practiceRound(seed: number): Round {
  const s = seed & SEED_MASK;
  const id = `p-${encodePracticeCode(s)}`;
  const roll = hashString('set-piece', s);
  if (SET_PIECES.length > 0 && roll % 3 === 0) return setPieceRound(SET_PIECES[Math.floor(roll / 3) % SET_PIECES.length], s, id);
  return generateRound(s, practiceDifficulty(s), id);
}
