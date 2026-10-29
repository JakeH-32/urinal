// Pure helpers for the play loop, results and stats. No React, so they're unit-tested.
import type { Bathroom, DailyRecord, Evaluation, Grade, Quirk, Reason, RoundResult, SaveData, Side } from '../types';
import { FIXTURES, QUIRKS, VERDICTS } from '../content';
import { hashString } from '../engine/rng';
import { culpritOf } from '../engine/code';
import { GRADES, GRADE_ORDER } from '../grades';

const FALLBACK_REASON: Record<Grade, Reason> = {
  clear: 'perfect',
  straw: 'too-close',
  amber: 'adjacent',
  doctor: 'adjacent',
};

/** Grade a pick from an evaluation. Defensive: a missing analysis falls back to the greens list. */
export function resultFromEvaluation(roundId: string, pick: number, evaluation: Evaluation): RoundResult {
  const a = evaluation.slots.find((s) => s.index === pick) ?? evaluation.slots[pick];
  const grade: Grade = a?.grade ?? (evaluation.greens.includes(pick) ? 'clear' : 'amber');
  return { roundId, pick, grade, reason: a?.reason ?? FALLBACK_REASON[grade] };
}

/**
 * Name of the guy whose zone the pick violated, if any: the engine's culprit (most offended),
 * else the first entry of violatedBy.
 */
export function violatorName(bathroom: Bathroom, evaluation: Evaluation | undefined, pick: number): string | undefined {
  let idx: number | null | undefined;
  try {
    idx = culpritOf(bathroom, pick);
  } catch {
    idx = null;
  }
  if (idx === null || idx === undefined) {
    const a = evaluation?.slots.find((s) => s.index === pick) ?? evaluation?.slots[pick];
    idx = a?.violatedBy?.[0];
  }
  if (idx === null || idx === undefined) return undefined;
  return bathroom.slots[idx]?.occupant?.name;
}

/**
 * The verdict line for a result. Chosen by hashString(roundId) so a reload shows the same line.
 * `{name}` becomes the violated occupant's name.
 */
export function verdictLine(roundId: string, reason: Reason, name?: string): string {
  const lines = VERDICTS[reason] ?? [];
  if (lines.length === 0) return '';
  const line = lines[hashString(roundId) % lines.length];
  if (name) return line.replace(/\{name\}/g, name);
  // No name (shouldn't happen in play): "He" at a sentence start, "him" elsewhere.
  return line.replace(/(^|[.:!?]\s+)\{name\}/g, '$1He').replace(/\{name\}/g, 'him');
}

/** The score: number of clears. */
export function clearsIn(results: readonly RoundResult[]): number {
  return results.reduce((n, r) => n + (r.grade === 'clear' ? 1 : 0), 0);
}

export function tileString(results: readonly RoundResult[]): string {
  return results.map((r) => GRADES[r.grade].emoji).join('');
}

export function emptyGradeCounts(): Record<Grade, number> {
  return { clear: 0, straw: 0, amber: 0, doctor: 0 };
}

export function gradeCounts(results: readonly RoundResult[]): Record<Grade, number> {
  const out = emptyGradeCounts();
  for (const r of results) if (r.grade in out) out[r.grade]++;
  return out;
}

/** Clears in a row after this pick. */
export function nextRun(run: number, grade: Grade): number {
  return grade === 'clear' ? run + 1 : 0;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

export interface LegendOccupant {
  index: number;
  quirk: Quirk;
  emoji: string;
  label: string;
  name: string;
  blurb: string;
  rule: string;
  lean?: Side;
}

export type FixtureKey = keyof typeof FIXTURES;

export interface Legend {
  occupants: LegendOccupant[];
  /** Fixture types present in the room, each listed once, in a stable order. */
  fixtures: FixtureKey[];
}

const FIXTURE_ORDER: FixtureKey[] = ['low', 'puddle', 'broken', 'stall', 'divider'];

export function legendFor(b: Bathroom): Legend {
  const occupants: LegendOccupant[] = [];
  const present = new Set<FixtureKey>();
  b.slots.forEach((slot, index) => {
    if (slot.kind === 'stall') present.add('stall');
    if (slot.flag) present.add(slot.flag);
    const g = slot.occupant;
    if (!g) return;
    const q = QUIRKS[g.quirk] ?? QUIRKS.normal;
    occupants.push({
      index,
      quirk: g.quirk,
      emoji: q.emoji,
      label: q.label,
      name: g.name,
      blurb: g.blurb,
      rule: q.rule,
      ...((g.quirk === 'drunk' || g.quirk === 'facetime' || g.quirk === 'gassy') && g.lean ? { lean: g.lean } : {}),
    });
  });
  if (b.dividers.some(Boolean)) present.add('divider');
  return { occupants, fixtures: FIXTURE_ORDER.filter((k) => present.has(k)) };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface DailyStats {
  played: number;
  perfect: number;
  /** Average clears per finished daily; 0 when none. */
  avgClears: number;
  /** distribution[n] = finished dailies with exactly n clears (0..6). */
  distribution: number[];
  /** Clears today, when today's daily is finished. */
  todayClears?: number;
  /** Every daily pick ever (finished days and in-progress ones), by grade. */
  lifetime: Record<Grade, number>;
}

export function dailyStats(save: SaveData, todayKey: string): DailyStats {
  const finished: DailyRecord[] = Object.values(save.daily.byDate).filter((r) => r.finished);
  const distribution = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const r of finished) {
    const n = Math.min(6, clearsIn(r.results));
    distribution[n]++;
    total += n;
  }
  const lifetime = emptyGradeCounts();
  for (const r of Object.values(save.daily.byDate)) {
    const c = gradeCounts(r.results);
    for (const g of GRADE_ORDER) lifetime[g] += c[g];
  }
  const today = save.daily.byDate[todayKey];
  return {
    played: finished.length,
    perfect: distribution[6],
    avgClears: finished.length ? total / finished.length : 0,
    distribution,
    lifetime,
    ...(today?.finished ? { todayClears: Math.min(6, clearsIn(today.results)) } : {}),
  };
}
