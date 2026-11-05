// Pure helpers for the play loop, results and stats. No React, so they're unit-tested.
import type { Bathroom, DailyRecord, Evaluation, Grade, Quirk, Reason, RoundResult, SaveData, Side } from '../types';
import { FIXTURES, QUIRKS, VERDICT_CASES, VERDICTS } from '../content';
import type { VerdictCase } from '../content';
import { hashString } from '../engine/rng';
import { actsNormal, culpritOf, dividersBetween, occupantIndices, roomTo, sideOf, zoneRadius } from '../engine/code';
import { GRADES, GRADE_ORDER } from '../grades';
import { ROUNDS_PER_DAY } from '../state/storage';

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
 * Name of the guy the verdict is about: the engine's culprit (most offended), else the first entry
 * of violatedBy, else (a legal pick) the closest neighbour by room, a quirk guy winning ties.
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
  if (idx === null || idx === undefined) idx = closestNeighbor(bathroom, pick);
  if (idx === null || idx === undefined) return undefined;
  return bathroom.slots[idx]?.occupant?.name;
}

function closestNeighbor(b: Bathroom, pick: number): number | undefined {
  let best: number | undefined;
  let bestRoom = Infinity;
  for (const j of occupantIndices(b)) {
    if (j === pick) continue;
    const room = roomTo(b, pick, j);
    const quirky = !actsNormal(b.slots[j].occupant);
    if (room < bestRoom || (room === bestRoom && quirky)) {
      best = j;
      bestRoom = room;
    }
  }
  return best;
}

/** The ✓ spot to compare against: a urinal over a stall when the divider rule made both Clear. */
function answerOf(evaluation: Evaluation): number | undefined {
  let best: number | undefined;
  for (const g of evaluation.greens) if (best === undefined || (evaluation.slots[g]?.tier ?? 9) < (evaluation.slots[best]?.tier ?? 9)) best = g;
  return best;
}

/** True when every guy at slot i's tightest room acts like a regular guy. */
function plainNeighbors(b: Bathroom, i: number): boolean {
  let room = Infinity;
  let plain = true;
  for (const j of occupantIndices(b)) {
    if (j === i) continue;
    const r = roomTo(b, i, j);
    if (r < room) {
      room = r;
      plain = true;
    }
    if (r === room && !actsNormal(b.slots[j].occupant)) plain = false;
  }
  return room !== Infinity && plain;
}

/** Which VERDICT_CASES hold for a pick (see VerdictCase in src/content). */
export function verdictCases(bathroom: Bathroom, evaluation: Evaluation | undefined, pick: number): VerdictCase[] {
  const slot = bathroom.slots[pick];
  if (!slot) return [];
  const out: VerdictCase[] = [];
  const occ = occupantIndices(bathroom);
  if (slot.kind === 'stall') out.push('stall');
  else if (occ.some((j) => Math.abs(j - pick) === 1)) out.push('beside');
  if (slot.flag === 'low' || slot.flag === 'puddle') out.push(slot.flag);
  let j: number | null = null;
  try {
    j = culpritOf(bathroom, pick);
  } catch {
    j = null;
  }
  const guy = j === null ? undefined : bathroom.slots[j]?.occupant;
  if (j !== null && guy) {
    if (dividersBetween(bathroom, pick, j) > 0) out.push('divider');
    // Lopsided guys: his space reaches farther on one side than the other.
    if (guy.quirk === 'drunk' || guy.quirk === 'gassy' || guy.quirk === 'peeper' || guy.quirk === 'pastor' || guy.quirk === 'facetime') {
      out.push(zoneRadius(guy, sideOf(pick, j)) > 1 ? 'long-side' : 'short-side');
    }
  }
  const best = evaluation ? answerOf(evaluation) : undefined;
  if (best !== undefined && plainNeighbors(bathroom, best)) out.push('plain-alt');
  return out;
}

/** Every line that can show for this pick: the reason's pool plus the lines of each case that holds. */
export function verdictPool(bathroom: Bathroom, evaluation: Evaluation | undefined, pick: number, reason: Reason): string[] {
  const cases = VERDICT_CASES[reason];
  const base = VERDICTS[reason] ?? [];
  if (!cases) return base;
  return [...base, ...verdictCases(bathroom, evaluation, pick).flatMap((c) => cases[c] ?? [])];
}

/** The verdict a player sees for a result in a room: the right pool, the right name, the round's line. */
export function verdictFor(roundId: string, bathroom: Bathroom, evaluation: Evaluation | undefined, result: Pick<RoundResult, 'pick' | 'reason'>): string {
  const pool = verdictPool(bathroom, evaluation, result.pick, result.reason);
  return verdictLine(roundId, result.reason, violatorName(bathroom, evaluation, result.pick), pool);
}

/**
 * The verdict line for a result. Chosen by hashString(roundId) so a reload shows the same line.
 * `{name}` becomes the violated occupant's name. `pool` defaults to the reason's base lines; pass
 * verdictPool's (or call verdictFor) to include the lines that depend on the room.
 */
export function verdictLine(roundId: string, reason: Reason, name?: string, pool?: readonly string[]): string {
  const lines = pool ?? VERDICTS[reason] ?? [];
  if (lines.length === 0) return '';
  // Daily ids end in -r<round>: offset by the round so one day never repeats a line.
  const m = /^(.*)-r(\d+)$/.exec(roundId);
  const at = m ? hashString(m[1]) + Number(m[2]) : hashString(roundId);
  const line = lines[at % lines.length];
  // "The groom's brother" mid-sentence reads "the groom's brother".
  if (name) {
    return line.replace(/([.:!?]\s+)?\{name\}/g, (_m, stop: string | undefined, at: number) =>
      at === 0 || stop !== undefined || !name.startsWith('The ') ? `${stop ?? ''}${name}` : `t${name.slice(1)}`,
    );
  }
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
      ...((g.quirk === 'drunk' || g.quirk === 'facetime' || g.quirk === 'gassy' || g.quirk === 'peeper' || g.quirk === 'pastor') && g.lean ? { lean: g.lean } : {}),
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
  /** distribution[n] = finished dailies with exactly n clears (0..ROUNDS_PER_DAY; old six-round days count as perfect at 6). */
  distribution: number[];
  /** Clears today, when today's daily is finished. */
  todayClears?: number;
  /** Every daily pick ever (finished days and in-progress ones), by grade. */
  lifetime: Record<Grade, number>;
}

export function dailyStats(save: SaveData, todayKey: string): DailyStats {
  const finished: DailyRecord[] = Object.values(save.daily.byDate).filter((r) => r.finished);
  const distribution: number[] = new Array(ROUNDS_PER_DAY + 1).fill(0);
  let total = 0;
  for (const r of finished) {
    const n = Math.min(ROUNDS_PER_DAY, clearsIn(r.results));
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
    perfect: distribution[ROUNDS_PER_DAY],
    avgClears: finished.length ? total / finished.length : 0,
    distribution,
    lifetime,
    ...(today?.finished ? { todayClears: Math.min(ROUNDS_PER_DAY, clearsIn(today.results)) } : {}),
  };
}
