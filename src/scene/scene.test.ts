import { describe, expect, it } from 'vitest';
import type { Bathroom, Evaluation, Guy, Slot } from '../types';
import { DOOR_W, MIN_W, PITCH, contentWidth, headTopY, layoutBathroom, solidEnd, walkPose } from './geometry';
import { buildReveal, firstPickable, isPickable, lastPickable, nextPickable, slotLabel, zoneOf } from './logic';
import { SHIRTS, resolveLook } from './looks';

const g: Guy = { quirk: 'normal', name: 'G', blurb: '', look: { shirt: 0, pants: 0, hair: 0, skin: 0, height: 1, bald: false } };
const U = (occupant?: Guy, flag?: Slot['flag']): Slot => ({ kind: 'urinal', flag, occupant });
const room = (slots: Slot[], door: 'left' | 'right' = 'left', div: boolean[] = []): Bathroom => ({
  slots,
  door,
  dividers: slots.slice(1).map((_, i) => !!div[i]),
});

describe('layout', () => {
  it('places slots at a fixed pitch next to the door', () => {
    const l = layoutBathroom(room([U(), U(), U(), U()], 'left'));
    expect(l.slots.map((s) => s.x1 - s.x0)).toEqual([PITCH, PITCH, PITCH, PITCH]);
    for (let i = 1; i < 4; i++) expect(l.slots[i].cx - l.slots[i - 1].cx).toBe(PITCH);
    expect(l.slots[0].x0).toBe(l.door.x1);
    expect(l.door.x0).toBe(l.roomX0);
    expect(l.entryX).toBeLessThan(l.slots[0].x0);
  });

  it('mirrors for a door on the right', () => {
    const l = layoutBathroom(room([U(), U(), U()], 'right'));
    expect(l.door.x1).toBe(l.roomX1);
    expect(l.slots[2].x1).toBe(l.door.x0);
    expect(l.entryX).toBeGreaterThan(l.slots[2].x1);
    expect(solidEnd(l)).toEqual({ x0: 0, x1: l.roomX0, cornerX: l.roomX0 });
  });

  it('keeps tiny rooms at minimum width, centred, and big rooms inside the viewBox', () => {
    const tiny = layoutBathroom(room([U(), U()]));
    expect(tiny.width).toBe(MIN_W);
    expect(tiny.roomX0).toBeCloseTo(MIN_W - tiny.roomX1);
    const big = layoutBathroom(room(Array.from({ length: 10 }, () => U())));
    expect(big.width).toBeGreaterThan(contentWidth(10));
    expect(big.slots[9].x1).toBeLessThanOrEqual(big.width);
    expect(contentWidth(10)).toBe(DOOR_W + 10 * PITCH + 8);
  });

  it('puts dividers on slot boundaries', () => {
    const l = layoutBathroom(room([U(), U(), U(), U()], 'left', [false, true, true]));
    expect(l.dividers.map((d) => d.index)).toEqual([1, 2]);
    expect(l.dividers[0].x).toBe(l.slots[1].x1);
    expect(l.dividers[1].x).toBe(l.slots[3].x0);
  });

  it('taller guys have higher heads', () => {
    expect(headTopY(2)).toBeLessThan(headTopY(1));
    expect(headTopY(1)).toBeLessThan(headTopY(0));
  });

  it('walk pose goes from start to end and settles', () => {
    expect(walkPose(10, 200, 0).x).toBe(10);
    const end = walkPose(10, 200, 1);
    expect(end).toEqual({ x: 200, bob: 0, tilt: 0 });
    const mid = walkPose(10, 200, 0.5);
    expect(mid.x).toBeGreaterThan(10);
    expect(mid.x).toBeLessThan(200);
    expect(mid.bob).toBeLessThanOrEqual(0);
  });
});

describe('picking logic', () => {
  const b = room([U(g), U(), U(undefined, 'broken'), U(undefined, 'low'), { kind: 'stall' }, U(g)]);

  it('pickable = free and not broken', () => {
    expect(b.slots.map(isPickable)).toEqual([false, true, false, true, true, false]);
    expect(firstPickable(b)).toBe(1);
    expect(lastPickable(b)).toBe(4);
  });

  it('arrow focus skips non-pickable slots and stops at the ends', () => {
    expect(nextPickable(b, 1, 1)).toBe(3);
    expect(nextPickable(b, 3, 1)).toBe(4);
    expect(nextPickable(b, 4, 1)).toBe(4);
    expect(nextPickable(b, 1, -1)).toBe(1);
  });

  it('labels slots', () => {
    expect(slotLabel(b.slots[1], 1)).toBe('Urinal 2, free');
    expect(slotLabel(b.slots[3], 3)).toBe('Low urinal 4, free');
    expect(slotLabel(b.slots[4], 4)).toBe('Stall 5, free');
    expect(slotLabel(b.slots[2], 2)).toBe('Urinal 3, out of order');
    expect(slotLabel(U(undefined, 'puddle'), 0)).toBe('Urinal 1, puddle, free');
  });
});

describe('reveal', () => {
  // Occupants at 1 and 4; pick 2 is covered by both.
  const ev: Evaluation = {
    slots: [
      { index: 0, pickable: true, grade: 'doctor', violatedBy: [1] },
      { index: 1, pickable: false },
      { index: 2, pickable: true, grade: 'doctor', violatedBy: [1, 4] },
      { index: 3, pickable: true, grade: 'amber', violatedBy: [4] },
      { index: 4, pickable: false },
      { index: 5, pickable: true, grade: 'amber', violatedBy: [4] },
      { index: 6, pickable: true, grade: 'clear', violatedBy: [] },
    ],
    greens: [6],
  };

  it('zone hulls include the occupant', () => {
    expect(zoneOf(ev, 1)).toEqual({ occupant: 1, lo: 0, hi: 2 });
    expect(zoneOf(ev, 4)).toEqual({ occupant: 4, lo: 2, hi: 5 });
  });

  it('a violating pick gets bands, reactors facing you, and the missed best spot', () => {
    const r = buildReveal(ev, 2);
    expect(r.grade).toBe('doctor');
    expect(r.bands.map((x) => x.occupant)).toEqual([1, 4]);
    expect(r.reactors).toEqual([
      { index: 1, dir: 1 },
      { index: 4, dir: -1 },
    ]);
    expect(r.missedGreens).toEqual([6]);
  });

  it('a clear pick shows no bands and no missed marker', () => {
    const r = buildReveal(ev, 6);
    expect(r.bands).toEqual([]);
    expect(r.missedGreens).toEqual([]);
  });
});

describe('looks', () => {
  it('wraps out-of-range indices and handles bald', () => {
    const l = resolveLook({ shirt: 9, pants: -1, hair: 99, skin: 7, height: 5, bald: true });
    expect(l.shirt).toBe(SHIRTS[1]);
    expect(l.hair).toBeNull();
    expect(l.height).toBeGreaterThanOrEqual(0);
    expect(l.height).toBeLessThanOrEqual(2);
  });
});

describe('chip spreading', () => {
  it('pushes overlapping chips apart and leaves spaced ones alone', async () => {
    const { spreadChips } = await import('./logic');
    const out = spreadChips([{ id: 'b', x: 100 }, { id: 'a', x: 60 }, { id: 'c', x: 300 }], 66);
    const byId = Object.fromEntries(out.map((o) => [o.id, o.x]));
    expect(byId.b - byId.a).toBeGreaterThanOrEqual(66);
    expect(byId.a + byId.b).toBeCloseTo(160);
    expect(byId.c).toBe(300);
  });
});

describe('puddle straddle pose', () => {
  it('spreads the feet past the puddle and bends the knees; k=0 is a normal stance', async () => {
    const { legPose, STRADDLE_DROP } = await import('./pose');
    const normal = legPose(0, false);
    const full = legPose(1, false);
    expect(normal.footX).toBe(8.5);
    expect(normal.drop).toBe(0);
    expect(full.footX).toBeGreaterThanOrEqual(34); // puddle spans about ±30
    expect(full.drop).toBe(STRADDLE_DROP);
    expect(legPose(0, true).footX).toBe(17.5);
    expect(legPose(2, false)).toEqual(full); // clamped
    expect(legPose(0.5, false).footX).toBeGreaterThan(normal.footX);
  });
});
