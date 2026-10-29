// URINAL: shared contract. Every module codes against these types.
//
// THE CODE (the rules engine in src/engine/code.ts implements exactly this):
//
//   A bathroom is one row of slots, index 0 = leftmost on screen. The door is at
//   one end (`door`). A slot is a urinal (maybe low / puddled / broken) or a stall.
//   Some slots are occupied by guys. Dividers sit between neighbouring slots.
//
//   Effective distance from slot i to an occupant at j:
//     |i - j| + (number of dividers strictly between them)
//     ...except dividers don't count for a TALKER (he leans around them).
//
//   Each occupant has a personal-space radius r (by quirk; DRUNK and GASSY are lopsided; FACETIME's camera side is infinite).
//   clearance(i, guy) = effDist(i, guy) - r(toward i).  clearance <= 0 = VIOLATION.
//   A free STALL never violates (it has walls) and has no clearance.
//
//   Candidates (pickable slots: unoccupied, not broken) are ranked lexicographically:
//     1. tier:  0 = clean urinal,  1 = clean low/puddle urinal,  2 = stall,  3 = violating urinal
//     2. violations (fewer is better)
//     3. min spare room to any occupant: raw |i - j| - r, dividers IGNORED (bigger is better;
//        +Infinity if the room is empty). Dividers only decide legality; they never add room.
//     4. against the wall, i.e. the end slot AWAY from the door (better). The door end is
//        open to the room, so it is not a wall.
//     5. distance from the door end (bigger is better)
//   Equal keys tie. Grades are a hydration chart (display meta in src/grades.ts; players see
//   Clear / Lemonade / Apple Juice / See a Doctor, the ids below are internal):
//     CLEAR  = ties with the best (the Code's answer).
//     STRAW  = not clear, and legal (0 violations), or exactly as bad as a code-breaking best
//              (same violation count, severity and room; it only lost on wall/door).
//              Severity = 1 per normal guy, 2 per quirk guy.
//     AMBER  = otherwise, exactly 1 violation and the violated guy is a normal guy.
//     DOCTOR = otherwise: 2+ violations or a quirk guy's zone. ("See a doctor.")
//   Ranking step 2 is violations, then severity (crowding a normal guy beats crowding a boss).

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  chance(p: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
  fork(label: string): Rng;
}

export type Quirk = 'normal' | 'talker' | 'splasher' | 'boss' | 'drunk' | 'facetime' | 'gassy';
export type Side = 'left' | 'right';

export interface Guy {
  quirk: Quirk;
  /**
   * Lopsided quirks only. drunk: the side he sways toward (radius 3 that way, 1 the other).
   * facetime: the side he holds the phone. The camera films the whole OTHER side (every urinal over
   * there violates); beside the phone the normal 1-urinal rule applies.
   * gassy: always the door side (the smell drifts out the door): radius 3 that way, 1 the other.
   */
  lean?: Side;
  /** Display name + one-line description, filled from content pools. */
  name: string;
  blurb: string;
  /** Cosmetic, seeded: index into the scene's palettes. */
  look: { shirt: number; pants: number; hair: number; skin: number; height: number; bald: boolean };
}

export type SlotKind = 'urinal' | 'stall';
export type UrinalFlag = 'low' | 'puddle' | 'broken';

export interface Slot {
  kind: SlotKind;
  /** Urinals only. low/puddle = pickable but tier 1; broken = not pickable. */
  flag?: UrinalFlag;
  occupant?: Guy;
}

export interface Bathroom {
  slots: Slot[];
  /** dividers[i] === true means a divider between slot i and slot i+1 (length = slots.length - 1). */
  dividers: boolean[];
  door: Side;
}

export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6;

export interface Round {
  /** Stable id, e.g. "d2026-10-28-r3" or "p-K7Q2XM". */
  id: string;
  seed: number;
  difficulty: Difficulty;
  /** Venue line, e.g. "Stadium, halftime". From content. */
  venue: string;
  /** Set-piece rounds only: the one-line setup that makes the room a puzzle. */
  premise?: string;
  bathroom: Bathroom;
}

/**
 * A handmade puzzle room. `layout` is a compact spec, left to right, space-separated:
 *   _ empty urinal   L low   W puddle   X broken   S empty stall   $ occupied stall
 *   N normal guy   T talker   P splasher   B boss   D< drunk leaning left   D> drunk leaning right
 *   F< on FaceTime, phone in his left hand (camera films everything to his right)   F> the mirror
 *   G  gassy (his smell drifts toward the door; the parser points him at `door`)
 *   | divider between the neighbouring slots
 * e.g. "T | _ | L _ _ P _ S"
 */
export interface SetPiece {
  /** Stable id, e.g. "sp-final-interview". */
  id: string;
  difficulty: Difficulty;
  venue: string;
  premise: string;
  layout: string;
  door: Side;
  /** One per occupant (urinals only, not stalls), left to right. Omitted → names from the pools. */
  people?: { name: string; blurb: string }[];
  /** 1-based slot of the single Clear spot. Tests enforce that the engine agrees. */
  answer: number;
}

/** Hydration chart, best → worst. */
export type Grade = 'clear' | 'straw' | 'amber' | 'doctor';

/** Why a pick graded the way it did: drives the verdict line and the teaching overlay. */
export type Reason =
  // clear
  | 'perfect' // best clean urinal
  | 'only-option' // green but it was the least-bad violation (no stall, no clean urinal)
  | 'stall-forced' // stall was correct because every urinal violated
  // straw
  | 'too-close' // clean, but a roomier clean spot existed
  | 'not-wall' // same clearance, but a wall spot existed
  | 'near-door' // same everything, took the slot right at the door, and the far end was free
  | 'door-side' // same everything, just nearer the door than the answer (not at the door)
  | 'low-urinal' // picked low/puddle when a normal clean urinal existed
  | 'stall-coward' // picked the stall when a clean urinal existed
  // amber/doctor (named by the occupant whose zone you violated; the worst one if several)
  | 'adjacent' // normal guy
  | 'talker'
  | 'splasher'
  | 'boss'
  | 'drunk'
  | 'facetime'
  | 'gassy';

export interface SlotAnalysis {
  index: number;
  pickable: boolean;
  /** Present when pickable. */
  tier?: 0 | 1 | 2 | 3;
  violations?: number;
  /** Min clearance across occupants; Infinity when the room is empty or for stalls. */
  clearance?: number;
  grade?: Grade;
  reason?: Reason;
  /** Indices of occupants whose zone covers this slot. */
  violatedBy?: number[];
}

export interface Evaluation {
  slots: SlotAnalysis[];
  /** Indices graded clear (at least one, unless nothing is pickable, which the generator never emits). */
  greens: number[];
}

export interface RoundResult {
  roundId: string;
  pick: number;
  grade: Grade;
  reason: Reason;
}

/** A finished (or in-progress) daily. */
export interface DailyRecord {
  dateKey: string; // local YYYY-MM-DD
  number: number; // Urinal #N
  results: RoundResult[]; // length 6 when finished
  finished: boolean;
}

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
}

export interface SaveData {
  version: 1;
  settings: Settings;
  daily: {
    byDate: Record<string, DailyRecord>;
    /** Consecutive days with a finished daily. */
    streak: number;
    bestStreak: number;
    lastDate?: string;
  };
  practice: { played: number; greens: number; bestRun: number };
  /** True after the first-run How To Play has been shown. */
  seenTutorial: boolean;
}
