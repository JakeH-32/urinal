// Pure scene logic (labels, keyboard focus order, reveal model). No React.
import type { Bathroom, Evaluation, Grade, Quirk, Slot } from '../types';
import { isOpen } from '../engine/code';
import { QUIRK_STYLE } from './looks';

/** Grades that broke the urinal code: show zone bands and reactions. */
export function isViolationGrade(g: Grade | undefined): boolean {
  return g === 'amber' || g === 'doctor';
}

export const QUIRK_BADGES: Record<Quirk, string | null> = {
  normal: null,
  talker: '🗣️',
  splasher: '💦',
  boss: '👔',
  drunk: '🍺',
  facetime: '📱',
  gassy: '💨',
  inlaw: '👴',
  pastor: '⛪',
  peeper: '👀',
  pilot: '✈️',
  tourist: '🎒',
  crypto: '🪙',
  finance: '📞',
};

/** The slot on its own: unoccupied and not broken. A tourist's gear can still block it; see `canPick`. */
export function isPickable(slot: Slot): boolean {
  return !slot.occupant && slot.flag !== 'broken';
}

/**
 * Can the player pick slot `i` in this room? Straight from the engine (`isOpen`), so a urinal full
 * of a backpack tourist's gear is never tappable, focusable or highlighted.
 */
export function canPick(b: Bathroom, i: number): boolean {
  return isOpen(b, i);
}

export function pickableIndices(b: Bathroom): number[] {
  const out: number[] = [];
  b.slots.forEach((_, i) => {
    if (canPick(b, i)) out.push(i);
  });
  return out;
}

/** Accessible label for a slot (1-based numbering, left to right). */
export function slotLabel(slot: Slot, index: number): string {
  const n = index + 1;
  if (slot.kind === 'stall') {
    if (slot.occupant) return `Stall ${n}, occupied`;
    return `Stall ${n}, free`;
  }
  if (slot.flag === 'broken') return `Urinal ${n}, out of order`;
  const base = slot.flag === 'low' ? `Low urinal ${n}` : `Urinal ${n}`;
  const extra = slot.flag === 'puddle' ? ', puddle' : '';
  if (slot.occupant) {
    const { quirk, lean, mood } = slot.occupant;
    // The peeper's direction and the boss's mood are the whole puzzle with them, so say them.
    const look = quirk === 'peeper' && lean ? `, looking ${lean}` : quirk === 'boss' && mood ? `, ${mood}` : '';
    const q = quirk === 'normal' ? '' : ` (${QUIRK_STYLE[quirk].tag.toLowerCase()}${look})`;
    return `${base}${extra}, occupied${q}`;
  }
  return `${base}${extra}, free`;
}

/** One-sentence summary for the scene's accessible name. */
export function describeBathroom(b: Bathroom): string {
  const urinals = b.slots.filter((s) => s.kind === 'urinal').length;
  const stalls = b.slots.length - urinals;
  const busy = b.slots.filter((s) => s.occupant).length;
  const parts = [`${urinals} urinal${urinals === 1 ? '' : 's'}`];
  if (stalls) parts.push(`${stalls} stall${stalls === 1 ? '' : 's'}`);
  return `Bathroom: ${parts.join(' and ')}, ${busy} occupied, door on the ${b.door}.`;
}

/**
 * Next pickable index from `from` moving `dir` (-1 left, +1 right). Stays put at the ends.
 * If `from` isn't pickable, starts from it anyway (finds the nearest in that direction).
 */
export function nextPickable(b: Bathroom, from: number, dir: -1 | 1): number {
  for (let i = from + dir; i >= 0 && i < b.slots.length; i += dir) {
    if (canPick(b, i)) return i;
  }
  return from;
}

export function firstPickable(b: Bathroom): number {
  return b.slots.findIndex((_, i) => canPick(b, i));
}

export function lastPickable(b: Bathroom): number {
  for (let i = b.slots.length - 1; i >= 0; i--) if (canPick(b, i)) return i;
  return -1;
}

export interface ZoneBand {
  /** Occupant index whose zone this is. */
  occupant: number;
  lo: number;
  hi: number;
}

/**
 * Slots covered by occupant `j`'s zone, per the evaluation: his own slot plus every slot whose
 * `violatedBy` names him. Zones are contiguous by construction, so return the hull.
 */
export function zoneOf(evaluation: Evaluation, j: number): ZoneBand {
  let lo = j;
  let hi = j;
  for (const s of evaluation.slots) {
    if (s.violatedBy?.includes(j)) {
      lo = Math.min(lo, s.index);
      hi = Math.max(hi, s.index);
    }
  }
  return { occupant: j, lo, hi };
}

export interface Reveal {
  picked?: number;
  grade?: Grade;
  /** Best spots (evaluation.greens, graded clear) to mark with a check, only when the player missed them. */
  missedGreens: number[];
  /** Zone bands to draw (only for an amber/doctor pick). */
  bands: ZoneBand[];
  /** Occupants that react, with the direction toward "you" (-1 = you are to his left). */
  reactors: { index: number; dir: -1 | 1 }[];
}

export function buildReveal(evaluation: Evaluation, picked: number | undefined, bathroom?: Bathroom): Reveal {
  const pickedA = picked === undefined ? undefined : evaluation.slots.find((s) => s.index === picked);
  const grade = pickedA?.grade;
  const missedGreens = grade === 'clear' ? [] : evaluation.greens.filter((g) => g !== picked);
  const bands: ZoneBand[] = [];
  const reactors: Reveal['reactors'] = [];
  if (isViolationGrade(grade) && picked !== undefined) {
    for (const j of pickedA?.violatedBy ?? []) {
      bands.push(zoneOf(evaluation, j));
      reactors.push({ index: j, dir: picked < j ? -1 : 1 });
    }
  }
  // Sneak in right behind a peeper's back and he swivels round to look, even when a divider made it legal.
  if (bathroom && picked !== undefined) {
    for (const j of [picked - 1, picked + 1]) {
      const g = bathroom.slots[j]?.occupant;
      if (g?.quirk !== 'peeper' || bathroom.slots[j].kind !== 'urinal' || reactors.some((r) => r.index === j)) continue;
      const youOn = picked < j ? 'left' : 'right';
      if (g.lean && g.lean !== youOn) reactors.push({ index: j, dir: picked < j ? -1 : 1 });
    }
  }
  return { picked, grade, missedGreens, bands, reactors };
}

/**
 * Nudge chip centres apart so neighbouring chips (width `w`) never overlap. Input order doesn't
 * matter; output keeps each item's id. A relaxation pass pushes each overlapping pair apart evenly.
 */
export function spreadChips<T extends { x: number }>(items: T[], w: number, gap = 2): T[] {
  const out = items.map((it) => ({ ...it })).sort((a, b) => a.x - b.x);
  const min = w + gap;
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let k = 1; k < out.length; k++) {
      const d = out[k].x - out[k - 1].x;
      if (d < min - 1e-6) {
        const push = (min - d) / 2;
        out[k - 1].x -= push;
        out[k].x += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}
