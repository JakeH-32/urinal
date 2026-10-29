// THE CODE: evaluates a bathroom. Owned by the Engine agent. See src/types.ts for the exact rules.
import type { Bathroom, Evaluation, Grade, Guy, Quirk, Reason, Side, Slot, SlotAnalysis } from '../types';

/**
 * Personal-space radius by quirk. Drunk: 3 toward his lean, 1 the other way. FaceTime: see zoneRadius
 * (his camera films the whole side away from the phone; this entry is only the no-lean fallback).
 */
export const BASE_RADIUS: Record<Quirk, number> = { normal: 1, talker: 2, splasher: 2, boss: 3, drunk: 3, facetime: 2 };

/** Personal-space radius of `guy` toward `toward` (the side the candidate slot is on, relative to him). */
export function zoneRadius(guy: Guy, toward: Side): number {
  if (guy.quirk === 'facetime') {
    // `lean` is the phone hand. The camera films everything on the OTHER side, all the way to the
    // wall: any urinal over there is in the background of the call. Beside the phone: normal rule.
    if (!guy.lean) return BASE_RADIUS.facetime;
    return guy.lean === toward ? 1 : Infinity;
  }
  if (guy.quirk === 'drunk') {
    // Lopsided: 3 toward his lean, 1 the other way. No lean: both ways.
    if (!guy.lean) return BASE_RADIUS.drunk;
    return guy.lean === toward ? BASE_RADIUS.drunk : 1;
  }
  return BASE_RADIUS[guy.quirk] ?? 1;
}

/** Number of dividers strictly between slots i and j. */
export function dividersBetween(b: Bathroom, i: number, j: number): number {
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  let n = 0;
  for (let k = lo; k < hi; k++) if (b.dividers[k]) n++;
  return n;
}

/** Effective distance between slots i and j, honoring dividers (unless the occupant at j is a talker). */
export function effectiveDistance(b: Bathroom, i: number, j: number): number {
  const raw = Math.abs(i - j);
  if (b.slots[j]?.occupant?.quirk === 'talker') return raw;
  return raw + dividersBetween(b, i, j);
}

/** Side of slot i relative to slot j. */
export function sideOf(i: number, j: number): Side {
  return i < j ? 'left' : 'right';
}

/** True when slot j holds a guy who projects a zone (a guy in a stall has walls, so he doesn't). */
export function hasZone(b: Bathroom, j: number): boolean {
  const s = b.slots[j];
  return !!s?.occupant && s.kind === 'urinal';
}

/** clearance(i, guy at j) = effDist - radius toward i. <= 0 is a violation. */
export function clearanceTo(b: Bathroom, i: number, j: number): number {
  const guy = b.slots[j].occupant as Guy;
  return effectiveDistance(b, i, j) - zoneRadius(guy, sideOf(i, j));
}

/**
 * Spare room for ranking: raw |i - j| - radius, dividers ignored. Dividers can make a close spot
 * legal, but they never make it roomier than a spot that keeps the distance with real urinals.
 */
export function roomTo(b: Bathroom, i: number, j: number): number {
  const guy = b.slots[j].occupant as Guy;
  const r = zoneRadius(guy, sideOf(i, j));
  // In a FaceTime frame (infinite zone) farther back is still better: rank it as a large radius.
  return Math.abs(i - j) - (Number.isFinite(r) ? r : FRAME_RANK_RADIUS);
}

/** Ranking stand-in for an infinite zone; bigger than any room. */
const FRAME_RANK_RADIUS = 12;

export function isPickable(slot: Slot): boolean {
  return !slot.occupant && !(slot.kind === 'urinal' && slot.flag === 'broken');
}

/** The end slot AWAY from the door. (The door end is open to the room: not a wall.) */
export function wallIndex(b: Bathroom): number {
  return b.door === 'left' ? b.slots.length - 1 : 0;
}

export function isWall(b: Bathroom, i: number): boolean {
  return i === wallIndex(b);
}

/** How far slot i is from the door end (0 = right by the door). */
export function doorDistance(b: Bathroom, i: number): number {
  return b.door === 'left' ? i : b.slots.length - 1 - i;
}

/** Indices of zone-bearing occupants. */
export function occupantIndices(b: Bathroom): number[] {
  const out: number[] = [];
  for (let j = 0; j < b.slots.length; j++) if (hasZone(b, j)) out.push(j);
  return out;
}

/**
 * Urinal slots (other than his own) inside the zone of the occupant at `occupantIndex`.
 * Includes occupied / broken urinals (for drawing the overlay); never stalls.
 */
export function zoneCovers(b: Bathroom, occupantIndex: number): number[] {
  if (!hasZone(b, occupantIndex)) return [];
  const out: number[] = [];
  for (let i = 0; i < b.slots.length; i++) {
    if (i === occupantIndex || b.slots[i].kind !== 'urinal') continue;
    if (clearanceTo(b, i, occupantIndex) <= 0) out.push(i);
  }
  return out;
}

/**
 * The occupant a pick at slot i offends most: smallest clearance, tie -> bigger radius toward i,
 * tie -> lower index. null when slot i violates nobody (or is a stall).
 */
export function culpritOf(b: Bathroom, i: number): number | null {
  if (b.slots[i]?.kind !== 'urinal') return null;
  let best: number | null = null;
  let bestC = Infinity;
  let bestR = -Infinity;
  for (const j of occupantIndices(b)) {
    if (j === i) continue;
    const c = clearanceTo(b, i, j);
    if (c > 0) continue;
    const r = zoneRadius(b.slots[j].occupant as Guy, sideOf(i, j));
    if (c < bestC || (c === bestC && r > bestR)) {
      best = j;
      bestC = c;
      bestR = r;
    }
  }
  return best;
}

interface Cand {
  index: number;
  tier: 0 | 1 | 2 | 3;
  violations: number;
  /** How bad the violations are: 1 per normal guy, 2 per quirk guy. */
  severity: number;
  clearance: number;
  violatedBy: number[];
}

/** Ranking comparator: negative when x ranks better than y, 0 on an exact tie. */
function compareCand(b: Bathroom, x: Cand, y: Cand): number {
  if (x.tier !== y.tier) return x.tier - y.tier;
  if (x.violations !== y.violations) return x.violations - y.violations;
  if (x.severity !== y.severity) return x.severity - y.severity;
  if (x.clearance !== y.clearance) return x.clearance > y.clearance ? -1 : 1;
  const wx = isWall(b, x.index);
  const wy = isWall(b, y.index);
  if (wx !== wy) return wx ? -1 : 1;
  return doorDistance(b, y.index) - doorDistance(b, x.index);
}

function analyzeSlot(b: Bathroom, i: number, occ: number[]): Cand {
  const slot = b.slots[i];
  if (slot.kind === 'stall') return { index: i, tier: 2, violations: 0, severity: 0, clearance: Infinity, violatedBy: [] };
  let clearance = Infinity;
  const violatedBy: number[] = [];
  for (const j of occ) {
    const room = roomTo(b, i, j);
    if (room < clearance) clearance = room;
    if (clearanceTo(b, i, j) <= 0) violatedBy.push(j);
  }
  const tier = violatedBy.length > 0 ? 3 : slot.flag === 'low' || slot.flag === 'puddle' ? 1 : 0;
  let severity = 0;
  for (const j of violatedBy) severity += b.slots[j].occupant?.quirk === 'normal' ? 1 : 2;
  return { index: i, tier, violations: violatedBy.length, severity, clearance, violatedBy };
}

function strawReason(b: Bathroom, pick: Cand, best: Cand): Reason {
  if (pick.tier === 2 && best.tier !== 2) return 'stall-coward';
  if (pick.tier === 1 && best.tier === 0) return 'low-urinal';
  if (pick.clearance < best.clearance) return 'too-close';
  if (isWall(b, best.index) && !isWall(b, pick.index)) return 'not-wall';
  // "By the door" lines only fit the slot actually at the door end.
  return doorDistance(b, pick.index) === 0 ? 'near-door' : 'door-side';
}

function violationReason(b: Bathroom, i: number): Reason {
  const j = culpritOf(b, i);
  if (j === null) return 'adjacent';
  const q = b.slots[j].occupant?.quirk ?? 'normal';
  return q === 'normal' ? 'adjacent' : q;
}

export function evaluate(b: Bathroom): Evaluation {
  const occ = occupantIndices(b);
  const cands: Cand[] = [];
  for (let i = 0; i < b.slots.length; i++) if (isPickable(b.slots[i])) cands.push(analyzeSlot(b, i, occ));

  let best: Cand | undefined;
  for (const c of cands) if (!best || compareCand(b, c, best) < 0) best = c;

  const byIndex = new Map(cands.map((c) => [c.index, c]));
  /** The clear indices (name kept from the contract). */
  const greens: number[] = [];
  const slots: SlotAnalysis[] = b.slots.map((_, index) => {
    const c = byIndex.get(index);
    if (!c || !best) return { index, pickable: false };
    let grade: Grade;
    let reason: Reason;
    if (compareCand(b, c, best) === 0) {
      grade = 'clear';
      reason = best.tier <= 1 ? 'perfect' : best.tier === 2 ? 'stall-forced' : 'only-option';
      greens.push(index);
    } else if (
      c.violations === 0 ||
      (c.violations === best.violations && c.severity === best.severity && c.clearance === best.clearance)
    ) {
      // Lemonade: legal, or (when every spot breaks the code) exactly as bad as the answer and only
      // lost on the wall/door tiebreak. Breaking it more closely than needed is Apple Juice or worse.
      grade = 'straw';
      reason = strawReason(b, c, best);
    } else {
      reason = violationReason(b, index);
      // AMBER: one violation, of a normal guy. DOCTOR: 2+ violations, or any quirk guy's zone.
      grade = c.violations === 1 && reason === 'adjacent' ? 'amber' : 'doctor';
    }
    return {
      index,
      pickable: true,
      tier: c.tier,
      violations: c.violations,
      clearance: c.clearance,
      grade,
      reason,
      violatedBy: c.violatedBy,
    };
  });
  return { slots, greens };
}
