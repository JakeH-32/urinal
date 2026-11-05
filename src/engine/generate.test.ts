import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Round } from '../types';
import { actsNormal, evaluate, zoneCovers } from './code';
import { dateKeyOf } from './daily';
import { SMALL_ROOM, dailyDifficulties, dailyRoundSeed, dailyRounds, generateRound, isTrap, naivePicks, practiceDifficulty, practiceRound, warmupRounds } from './generate';
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
    expect(rs.map((r) => r.id)).toEqual([1, 2, 3, 4, 5].map((r) => `d2026-10-28-r${r}`));
    expect(rs.map((r) => r.difficulty)).toEqual([3, 4, 5, 6, 6]);
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
        // One entry per person: a two-urinal guy fills two slots, and a set of twins counts as one.
        const guys = b.slots.flatMap((s, i) => {
          const g = s.occupant;
          if (!g || (g.part ?? 0) > 0) return [];
          if (g.quirk === 'twin' && b.slots[i - 1]?.occupant?.quirk === 'twin' && b.slots[i - 1]?.occupant?.group === g.group) return [];
          return [g];
        });

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
        // People: unique names, sane looks, lean only on lopsided quirks, only the boss in a stall.
        expect(new Set(guys.map((g) => g.name)).size, where).toBe(guys.length);
        for (const g of guys) {
          expect(g.name.length).toBeGreaterThan(0);
          expect(g.look.shirt).toBeGreaterThanOrEqual(0);
          expect(g.look.shirt).toBeLessThanOrEqual(7);
          expect(g.look.pants).toBeLessThanOrEqual(4);
          expect(g.look.hair).toBeLessThanOrEqual(5);
          expect(g.look.skin).toBeLessThanOrEqual(4);
          expect(g.look.height).toBeLessThanOrEqual(2);
          expect(g.lean !== undefined).toBe(g.quirk === 'drunk' || g.quirk === 'peeper' || g.quirk === 'facetime' || g.quirk === 'gassy' || g.quirk === 'pastor' || g.quirk === 'gymbro' || g.quirk === 'knight');
          if (g.quirk === 'gassy' || g.quirk === 'pastor') expect(g.lean, where).toBe(b.door);
        }
        for (const s of b.slots) if (s.kind === 'stall' && s.occupant) expect(s.occupant.quirk).toBe('boss'); // only the boss, hiding (just for fun)

        // Difficulty shape: a smooth ramp.
        // Rare look-alikes (the rookie, the doppelganger, Bigfoot) play by regular rules, so they count as plain guys here.
        const inStall = new Set(b.slots.filter((s) => s.kind === 'stall').map((s) => s.occupant));
        const quirks = guys.filter((g) => !actsNormal(g) && !inStall.has(g)).map((g) => g.quirk); // the stall boss is just for fun
        const hasStall = b.slots.some((s) => s.kind === 'stall' && !s.occupant);
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
          expect(['talker', 'splasher', 'facetime', 'inlaw', 'pastor', 'pilot', 'tourist', 'crypto', 'twin', 'napper', 'germ', 'security', 'friend', 'dropper', 'knight', 'sumo']).toContain(quirks[0]);
        }
        if (r.difficulty === 4) for (const q of quirks) expect(['talker', 'splasher', 'facetime', 'inlaw', 'pastor', 'pilot', 'tourist', 'crypto', 'twin', 'napper', 'germ', 'security', 'friend', 'dropper', 'knight', 'sumo']).toContain(q);
        if (r.difficulty === 5) expect(guys.map((g) => g.quirk).some((q) => q === 'boss' || q === 'drunk' || q === 'gassy' || q === 'peeper' || q === 'finance' || q === 'shy' || q === 'mascot' || q === 'gymbro'), where).toBe(true);
        if (r.difficulty <= 4) expect(ev.slots[ev.greens[0]].reason).not.toBe('stall-forced');
      }
    }
  }, 20_000);

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
    const withStall = rooms.filter((r) => r.bathroom.slots.some((s) => s.kind === 'stall' && !s.occupant)).length;
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

describe('daily shape and warm-up', () => {
  it('keeps the plain shape before variation started, varies a little after', () => {
    expect(dailyDifficulties('2026-11-02')).toEqual([3, 4, 5, 6, 6]);
    const seen = new Map<string, number>();
    for (let k = 0; k < 400; k++) {
      const key = dateKeyOf(new Date(2026, 10, 3 + k, 12));
      const shape = dailyDifficulties(key);
      expect(shape).toHaveLength(5);
      expect([shape[1], shape[4]]).toEqual([4, 6]); // the set-piece rounds
      expect(dailyRounds(key).map((r) => r.difficulty)).toEqual(shape);
      seen.set(shape.join(), (seen.get(shape.join()) ?? 0) + 1);
    }
    expect(seen.size).toBe(3);
    expect(seen.get('3,4,5,6,6')!).toBeGreaterThan(180);
  }, 30_000);

  it('warm-up: easy, easy, medium, one clear answer each, stable', () => {
    const rs = warmupRounds();
    expect(rs.map((r) => r.difficulty)).toEqual([1, 2, 3]);
    for (const r of rs) expect(evaluate(r.bathroom).greens).toHaveLength(1);
    expect(JSON.stringify(warmupRounds())).toBe(JSON.stringify(rs));
  });
});

describe('empty room', () => {
  it('is rare, and its one answer is the far end from the door', () => {
    let empties = 0;
    for (let seed = 0; seed < 4000; seed++) {
      const r = practiceRound(seed);
      if (r.bathroom.slots.some((x) => x.occupant)) continue;
      empties++;
      const ev = evaluate(r.bathroom);
      expect(ev.greens).toEqual([r.bathroom.door === 'left' ? r.bathroom.slots.length - 1 : 0]);
    }
    expect(empties).toBeGreaterThan(15);
    expect(empties).toBeLessThan(80);
  }, 30000);
});

describe('shy guy and germaphobe', () => {
  it('never spawns with someone already in his space (and security always has a stall)', () => {
    let seen = 0;
    for (let seed = 1; seed <= 800; seed++) {
      for (const d of [5, 6] as const) {
        const b = generateRound(seed, d, 't').bathroom;
        b.slots.forEach((s, j) => {
          if (s.occupant?.quirk !== 'shy' && s.occupant?.quirk !== 'germ') return;
          seen++;
          expect(zoneCovers(b, j).filter((k) => b.slots[k].occupant)).toEqual([]);
        });
        if (b.slots.some((s) => s.occupant?.quirk === 'security')) expect(b.slots.some((s) => s.kind === 'stall')).toBe(true);
        b.slots.forEach(() => {
        });
      }
    }
    expect(seen).toBeGreaterThan(20);
  }, 30000);
});

describe('boss in a stall', () => {
  it('turns up now and then and never changes a grade', () => {
    let seen = 0;
    for (let seed = 1; seed <= 1500; seed++) {
      const r = generateRound(seed, 5, 't');
      const last = r.bathroom.slots[r.bathroom.slots.length - 1];
      if (last.kind !== 'stall' || last.occupant?.quirk !== 'boss') continue;
      seen++;
      const without = { ...r.bathroom, slots: r.bathroom.slots.slice(0, -1), dividers: r.bathroom.dividers.slice(0, -1) };
      const a = evaluate(r.bathroom);
      const b = evaluate(without);
      expect(a.greens).toEqual(b.greens);
      for (const s of b.slots) expect(a.slots[s.index].grade).toBe(s.grade);
    }
    expect(seen).toBeGreaterThan(5);
  }, 30000);
});
