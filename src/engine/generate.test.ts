import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Round } from '../types';
import { evaluate } from './code';
import { dateKeyOf } from './daily';
import { SMALL_ROOM, dailyRoundSeed, dailyRounds, generateRound, isTrap, naivePicks, practiceDifficulty, practiceRound } from './generate';
import { decodePracticeCode } from './rng';

function days(count: number, start = '2026-10-28'): string[] {
  const [y, m, d] = start.split('-').map(Number);
  const out: string[] = [];
  for (let k = 0; k < count; k++) out.push(dateKeyOf(new Date(y, m - 1, d + k, 12)));
  return out;
}

const DAYS = days(400);
// The procedural generator only (daily rounds 2/4/6 are set pieces; see setpieces.test.ts).
const ALL: Round[][] = DAYS.map((k) =>
  [1, 2, 3, 4, 5, 6].map((r) => generateRound(dailyRoundSeed(k, r), r as Round['difficulty'], `d${k}-r${r}`)),
);

describe('generator determinism', () => {
  it('same date, same rounds', () => {
    expect(JSON.stringify(dailyRounds('2027-01-01'))).toBe(JSON.stringify(dailyRounds('2027-01-01')));
    expect(JSON.stringify(generateRound(1234, 4, 'x'))).toBe(JSON.stringify(generateRound(1234, 4, 'x')));
  });

  it('different dates differ', () => {
    expect(JSON.stringify(dailyRounds('2027-01-01'))).not.toBe(JSON.stringify(dailyRounds('2027-01-02')));
  });

  it('ids and difficulties', () => {
    const rs = dailyRounds('2026-10-28');
    expect(rs.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6].map((r) => `d2026-10-28-r${r}`));
    expect(rs.map((r) => r.difficulty)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('practice rounds: id round-trips, difficulty 2..6, deterministic', () => {
    for (let s = 0; s < 200; s++) {
      const seed = (s * 2654435761) & 0x3fffffff;
      const r = practiceRound(seed);
      expect(r.id).toMatch(/^p-[0-9A-Z]{6}$/);
      expect(decodePracticeCode(r.id.slice(2))).toBe(seed);
      if (!r.premise) expect(r.difficulty).toBe(practiceDifficulty(seed));
      expect(r.difficulty).toBeGreaterThanOrEqual(2);
      expect(r.difficulty).toBeLessThanOrEqual(6);
      expect(evaluate(r.bathroom).greens).toHaveLength(1);
    }
    expect(JSON.stringify(practiceRound(99))).toBe(JSON.stringify(practiceRound(99)));
  });

  it('is fast: dailyRounds well under 30ms', () => {
    const t0 = performance.now();
    for (const k of days(50, '2030-01-01')) dailyRounds(k);
    expect((performance.now() - t0) / 50).toBeLessThan(30);
  });
});

describe('400 days of dailies', () => {
  it('every round satisfies the constraints', () => {
    for (const rounds of ALL) {
      expect(rounds).toHaveLength(6);
      for (const r of rounds) {
        const b = r.bathroom;
        const n = b.slots.length;
        const ev = evaluate(b);
        const where = `${r.id} ${JSON.stringify(b)}`;
        const pick = ev.slots.filter((s) => s.pickable);
        const broke = pick.filter((s) => s.grade === 'amber' || s.grade === 'doctor').length;
        const straw = pick.filter((s) => s.grade === 'straw').length;
        const guys = b.slots.flatMap((s) => (s.occupant ? [s.occupant] : []));

        expect(n, where).toBeGreaterThanOrEqual(2);
        expect(n, where).toBeLessThanOrEqual(10);
        expect(b.dividers, where).toHaveLength(n - 1);
        expect(ev.greens, where).toHaveLength(1);
        expect(guys.length, where).toBeGreaterThanOrEqual(1);
        expect(r.venue.length, where).toBeGreaterThan(0);
        if (n > SMALL_ROOM) {
          expect(pick.length, where).toBeGreaterThanOrEqual(3);
          expect(broke, where).toBeGreaterThanOrEqual(1);
          if (r.difficulty >= 2 && r.difficulty <= 5) expect(straw, where).toBeGreaterThanOrEqual(1);
          if (r.difficulty === 4 || r.difficulty === 5) expect(isTrap(b, ev), where).toBe(true);
        }

        // d3+: never a single free spot.
        if (r.difficulty >= 3) expect(b.slots.filter((s) => !s.occupant && s.flag !== 'broken').length, where).toBeGreaterThanOrEqual(2);
        // People: unique names, sane looks, lean only on lopsided quirks, nobody in a stall.
        expect(new Set(guys.map((g) => g.name)).size, where).toBe(guys.length);
        for (const g of guys) {
          expect(g.name.length).toBeGreaterThan(0);
          expect(g.look.shirt).toBeGreaterThanOrEqual(0);
          expect(g.look.shirt).toBeLessThanOrEqual(7);
          expect(g.look.pants).toBeLessThanOrEqual(4);
          expect(g.look.hair).toBeLessThanOrEqual(5);
          expect(g.look.skin).toBeLessThanOrEqual(4);
          expect(g.look.height).toBeLessThanOrEqual(2);
          expect(g.lean !== undefined).toBe(g.quirk === 'drunk' || g.quirk === 'facetime');
        }
        for (const s of b.slots) if (s.kind === 'stall') expect(s.occupant).toBeUndefined();

        // Difficulty shape: a smooth ramp.
        const quirks = guys.filter((g) => g.quirk !== 'normal').map((g) => g.quirk);
        const hasStall = b.slots.some((s) => s.kind === 'stall');
        const hasDivider = b.dividers.some(Boolean);
        if (r.difficulty <= 2) {
          expect(quirks, where).toEqual([]);
          expect(hasStall || hasDivider, where).toBe(false);
        }
        if (r.difficulty === 1) {
          expect(guys.length).toBeLessThanOrEqual(2);
          for (const s of b.slots) expect(s.flag === undefined || s.flag === 'broken').toBe(true);
        }
        if (r.difficulty === 3) {
          expect(quirks).toHaveLength(1);
          expect(['talker', 'splasher', 'facetime']).toContain(quirks[0]);
        }
        if (r.difficulty === 4) for (const q of quirks) expect(['talker', 'splasher', 'facetime']).toContain(q);
        if (r.difficulty === 5) expect(quirks.some((q) => q === 'boss' || q === 'drunk'), where).toBe(true);
        if (r.difficulty <= 4) expect(ev.slots[ev.greens[0]].reason).not.toBe('stall-forced');
      }
    }
  });

  it('has the right mix (and writes stats when STATS_OUT is set)', () => {
    type Bucket = Record<string, number>;
    const stats: Record<number, Bucket> = {};
    for (const rounds of ALL) {
      for (const r of rounds) {
        const b = r.bathroom;
        const ev = evaluate(b);
        const c = ev.slots[ev.greens[0]];
        const st = (stats[r.difficulty] ??= {});
        const inc = (k: string) => (st[k] = (st[k] ?? 0) + 1);
        inc(`clear:${c.reason}`);
        inc(`size:${String(b.slots.length).padStart(2, '0')}`);
        inc(`guys:${b.slots.filter((s) => s.occupant).length}`);
        inc(`clearIdx:${c.index}`);
        if (b.slots.length > SMALL_ROOM) {
          inc('big');
          if (isTrap(b, ev)) inc('bigTrap');
          if (naivePicks(b).length > 1) inc('naiveTie');
        }
        for (const s of ev.slots) if (s.pickable) inc(`grade:${s.grade}`);
        for (const s of ev.slots) if (s.pickable && s.grade !== 'clear') inc(`${s.grade}:${s.reason}`);
      }
    }
    const pct = (d: number, k: string) => (stats[d][k] ?? 0) / 400;
    const small = (d: number) => ['size:02', 'size:03', 'size:04'].reduce((a, k) => a + pct(d, k), 0);

    // Stalls are rare: d6 stall answers stay under 12%, and under 8% of all rooms have a stall at all.
    expect(pct(6, 'clear:stall-forced')).toBeLessThanOrEqual(0.12);
    const rooms = ALL.flat();
    const withStall = rooms.filter((r) => r.bathroom.slots.some((s) => s.kind === 'stall')).length;
    expect(withStall / rooms.length).toBeLessThan(0.08);
    expect(pct(6, 'clear:only-option')).toBeGreaterThan(0.03);
    // Small rooms show up ~20% on d2..d6.
    for (const d of [2, 3, 4, 5, 6]) {
      expect(small(d)).toBeGreaterThan(0.1);
      expect(small(d)).toBeLessThan(0.32);
    }
    // d1 variety: guy count, room size and clear index all vary.
    expect(pct(1, 'guys:1')).toBeGreaterThan(0.2);
    expect(pct(1, 'guys:2')).toBeGreaterThan(0.2);
    expect(Object.keys(stats[1]).filter((k) => k.startsWith('clearIdx:')).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(stats[1]).filter((k) => k.startsWith('size:')).length).toBeGreaterThanOrEqual(4);
    // d3 prefers a trap.
    expect(stats[3].bigTrap / stats[3].big).toBeGreaterThan(0.6);

    if (process.env.STATS_OUT) {
      const lines = Object.entries(stats).map(([d, st]) => `d${d} ${JSON.stringify(Object.fromEntries(Object.entries(st).sort()))}`);
      writeFileSync(process.env.STATS_OUT, lines.join('\n'));
    }
  });
});
