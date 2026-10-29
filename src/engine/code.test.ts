// Test helper (not shipped code): build a bathroom from a compact string.
//   _  empty urinal      L  low urinal       W  puddle urinal    X  broken urinal
//   S  empty stall       $  stall with a guy in it
//   N  normal guy        T  talker           P  splasher         B  boss
//   D< drunk leaning left   D> drunk leaning right
//   |  divider between the neighbouring slots
import { describe, expect, it } from 'vitest';
import type { Bathroom, Evaluation, Guy, Quirk, Side, Slot } from '../types';
import { clearanceTo, culpritOf, effectiveDistance, evaluate, isWall, wallIndex, zoneCovers, zoneRadius } from './code';
import { parseLayout } from './layout';

const LOOK: Guy['look'] = { shirt: 0, pants: 0, hair: 0, skin: 0, height: 0, bald: false };

function g(quirk: Quirk, name: string, lean?: Side): Guy {
  const out: Guy = { quirk, name, blurb: '', look: LOOK };
  if (lean) out.lean = lean;
  return out;
}

function bath(spec: string, door: Side = 'left'): Bathroom {
  const slots: Slot[] = [];
  const dividers: boolean[] = [];
  let pendingDivider = false;
  for (const tok of spec.trim().split(/\s+/)) {
    if (tok === '|') {
      pendingDivider = true;
      continue;
    }
    if (slots.length > 0) dividers.push(pendingDivider);
    pendingDivider = false;
    const name = `g${slots.length}`;
    switch (tok) {
      case '_': slots.push({ kind: 'urinal' }); break;
      case 'L': slots.push({ kind: 'urinal', flag: 'low' }); break;
      case 'W': slots.push({ kind: 'urinal', flag: 'puddle' }); break;
      case 'X': slots.push({ kind: 'urinal', flag: 'broken' }); break;
      case 'S': slots.push({ kind: 'stall' }); break;
      case '$': slots.push({ kind: 'stall', occupant: g('normal', name) }); break;
      case 'N': slots.push({ kind: 'urinal', occupant: g('normal', name) }); break;
      case 'T': slots.push({ kind: 'urinal', occupant: g('talker', name) }); break;
      case 'P': slots.push({ kind: 'urinal', occupant: g('splasher', name) }); break;
      case 'B': slots.push({ kind: 'urinal', occupant: g('boss', name) }); break;
      case 'D<': slots.push({ kind: 'urinal', occupant: g('drunk', name, 'left') }); break;
      case 'D>': slots.push({ kind: 'urinal', occupant: g('drunk', name, 'right') }); break;
      default: throw new Error(`bad token ${tok}`);
    }
  }
  return { slots, dividers, door };
}

/** One string per slot: "-" unpickable, else "<grade initial>:<reason>" (C clear, S straw, A amber, D doctor). */
function grades(b: Bathroom, ev: Evaluation = evaluate(b)): string[] {
  return ev.slots.map((s) => (s.pickable ? `${s.grade?.[0].toUpperCase()}:${s.reason}` : '-'));
}

describe('primitives', () => {
  it('radii by quirk, drunk lopsided', () => {
    const b = bath('N T P B D< D>');
    const r = (j: number, side: Side) => zoneRadius(b.slots[j].occupant as Guy, side);
    expect([r(0, 'left'), r(1, 'right'), r(2, 'left'), r(3, 'right')]).toEqual([1, 2, 2, 3]);
    expect([r(4, 'left'), r(4, 'right')]).toEqual([3, 1]);
    expect([r(5, 'left'), r(5, 'right')]).toEqual([1, 3]);
  });

  it('facetime: the whole camera side is in frame, the phone side is the normal rule', () => {
    const b = parseLayout('_ _ _ _ F< _ _ _', 'left');
    const g = b.slots[4].occupant as Guy;
    expect([zoneRadius(g, 'left'), zoneRadius(g, 'right')]).toEqual([1, Infinity]);
    expect(zoneCovers(b, 4)).toEqual([3, 5, 6, 7]);
  });

  it('dividers add distance, except for a talker', () => {
    const b = bath('_ | N | _ _ | T');
    expect(effectiveDistance(b, 0, 1)).toBe(2);
    expect(effectiveDistance(b, 3, 1)).toBe(3);
    expect(effectiveDistance(b, 0, 4)).toBe(4); // talker: raw distance
    expect(clearanceTo(b, 3, 1)).toBe(2);
  });

  it('the wall is the end away from the door', () => {
    expect(wallIndex(bath('_ _ _', 'left'))).toBe(2);
    expect(wallIndex(bath('_ _ _', 'right'))).toBe(0);
    expect(isWall(bath('_ _ _', 'left'), 0)).toBe(false);
  });
});

describe('the user examples', () => {
  it.each(['left', 'right'] as const)('canonical easy round [_ _ _ G _ G], door %s', (door) => {
    const b = bath('_ _ _ N _ N', door);
    const ev = evaluate(b);
    expect(ev.greens).toEqual([0]);
    expect(grades(b, ev)).toEqual(['C:perfect', 'S:too-close', 'A:adjacent', '-', 'D:adjacent', '-']); // slot 4 is between two guys: doctor
  });

  it('2 urinals, door left [G _]: the only pick is next to him', () => {
    expect(grades(bath('N _', 'left'))).toEqual(['-', 'C:only-option']);
  });

  it('3 urinals, door right [_ G _]: wall end green, door end yellow', () => {
    expect(grades(bath('_ N _', 'right'))).toEqual(['C:only-option', '-', 'S:not-wall']);
  });

  it('nobody stands in the background of a FaceTime (user report, Urinal #1 round 3)', () => {
    // Phone in his left hand: everything to his right is on camera, even the far wall spot.
    const b = parseLayout('_ _ _ _ F< _ _ _', 'left');
    expect(grades(b)).toEqual([
      'C:perfect', 'S:too-close', 'S:too-close', 'D:facetime', '-', 'D:facetime', 'D:facetime', 'D:facetime',
    ]);
  });

  it('dividers make a spot legal but never roomier (user report, Urinal #1 round 4)', () => {
    // Two real empties each side of slot 3 beats slot 4, which is one urinal from the splasher
    // and only legal thanks to the dividers.
    const b = bath('T | _ | L | _ | _ | _ | P | _ | _ S', 'right');
    const ev = evaluate(b);
    expect(ev.greens).toEqual([3]);
    expect(ev.slots[4].grade).toBe('straw');
    expect(ev.slots[4].reason).toBe('too-close');
  });
});

describe('evaluate', () => {
  it('empty room: the far wall from the door', () => {
    expect(evaluate(bath('_ _ _ _', 'left')).greens).toEqual([3]);
    expect(evaluate(bath('_ _ _ _', 'right')).greens).toEqual([0]);
    const ev = evaluate(bath('_ _ _ _', 'left'));
    expect(ev.slots[0].clearance).toBe(Infinity);
    expect(grades(bath('_ _ _ _', 'left'), ev)).toEqual(['S:not-wall', 'S:not-wall', 'S:not-wall', 'C:perfect']);
  });

  it('a divider makes the neighbouring urinal legal', () => {
    expect(grades(bath('_ N | _', 'right'))).toEqual(['A:adjacent', '-', 'C:perfect']);
  });

  it('talker ignores dividers, splasher does not', () => {
    expect(grades(bath('_ T | _ | _ | _', 'right'))).toEqual(['D:talker', '-', 'D:talker', 'D:talker', 'C:perfect']);
    expect(grades(bath('_ P | _ | _ | _', 'right'))).toEqual(['D:splasher', '-', 'D:splasher', 'S:too-close', 'C:perfect']);
  });

  it('drunk leaning right: 3 that way, 1 the other', () => {
    const b = bath('_ _ _ D> _ _ _', 'right');
    expect(zoneCovers(b, 3)).toEqual([2, 4, 5, 6]);
    expect(grades(b)).toEqual(['C:perfect', 'S:too-close', 'D:drunk', '-', 'D:drunk', 'D:drunk', 'D:drunk']);
  });

  it('drunk leaning left: mirrored', () => {
    const b = bath('_ _ _ D< _ _ _', 'left');
    expect(zoneCovers(b, 3)).toEqual([0, 1, 2, 4]);
    expect(grades(b)).toEqual(['D:drunk', 'D:drunk', 'D:drunk', '-', 'D:drunk', 'S:too-close', 'C:perfect']);
  });

  it('boss: radius 3', () => {
    const b = bath('_ _ _ _ B _ _ _ _', 'left');
    expect(zoneCovers(b, 4)).toEqual([1, 2, 3, 5, 6, 7]);
    expect(grades(b)).toEqual(['S:not-wall', 'D:boss', 'D:boss', 'D:boss', '-', 'D:boss', 'D:boss', 'D:boss', 'C:perfect']);
  });

  it('stall-forced when every urinal violates', () => {
    const b = bath('S _ _ B _', 'left');
    const ev = evaluate(b);
    expect(grades(b, ev)).toEqual(['C:stall-forced', 'D:boss', 'D:boss', '-', 'D:boss']);
    expect(ev.slots[0]).toMatchObject({ tier: 2, violations: 0, clearance: Infinity, violatedBy: [] });
  });

  it('stall-coward when a clean urinal exists', () => {
    expect(grades(bath('_ _ _ N _ S', 'left'))).toEqual(['C:perfect', 'S:too-close', 'A:adjacent', '-', 'A:adjacent', 'S:stall-coward']);
  });

  it('low-urinal: a clean normal urinal beats a roomier low one', () => {
    expect(grades(bath('L _ _ N', 'right'))).toEqual(['S:low-urinal', 'C:perfect', 'A:adjacent', '-']);
  });

  it('a low/puddle urinal is perfect when it is the best clean spot', () => {
    expect(grades(bath('W _ N', 'right'))).toEqual(['C:perfect', 'A:adjacent', '-']);
  });

  it('broken urinals and occupied stalls are not pickable; a guy in a stall has no zone', () => {
    const b = bath('X _ _ $ _', 'left');
    const ev = evaluate(b);
    expect(ev.slots[0].pickable).toBe(false);
    expect(ev.slots[3].pickable).toBe(false);
    expect(ev.slots[4].clearance).toBe(Infinity);
    expect(zoneCovers(b, 3)).toEqual([]);
    expect(ev.greens).toEqual([4]);
  });

  it('not-wall: same clearance, but the wall spot was free', () => {
    expect(grades(bath('N _ _ _ N _ _', 'left'))).toEqual(['-', 'A:adjacent', 'S:not-wall', 'A:adjacent', '-', 'A:adjacent', 'C:perfect']);
  });

  it('door-side: same everything, just nearer the door than the answer', () => {
    const ev = evaluate(bath('N _ _ _ _ _ _ N', 'left'));
    expect(ev.greens).toEqual([4]);
    expect(ev.slots[3]).toMatchObject({ grade: 'straw', reason: 'door-side' });
  });

  it('near-door: only for the slot actually at the door', () => {
    // The wall spot is taken, so the door end vs. the middle comes down to the door.
    const ev = evaluate(bath('_ _ N _ _ _ N', 'left'));
    expect(ev.greens).toEqual([4]);
    expect(ev.slots[0]).toMatchObject({ grade: 'straw', reason: 'near-door' });
  });

  it('when every spot breaks the code, crowding a quirk guy is worse than a normal guy (playtest, daily #1 r5)', () => {
    const b = parseLayout('_ _ B N _ | N | N _', 'left');
    expect(grades(b)).toEqual(['D:boss', 'D:boss', '-', '-', 'D:boss', '-', '-', 'C:only-option']);
  });

  it('stuck in a FaceTime frame: farther in the background is better (playtest, practice KWDX32)', () => {
    const ev = evaluate(parseLayout('_ N P _ F< _ _ _', 'right'));
    expect(ev.greens).toEqual([7]);
    expect(ev.slots[5].grade).not.toBe('clear');
  });

  it('only-option: closer than the answer is See a Doctor; equal but losing on the wall is Lemonade', () => {
    expect(grades(bath('_ _ B _ _', 'right'))).toEqual(['C:only-option', 'D:boss', '-', 'D:boss', 'S:not-wall']);
  });

  it('fewer violations wins among violating urinals; more is red', () => {
    const b = bath('_ N _ N', 'right'); // slot 0 violates N@1 only; slot 2 violates both
    expect(grades(b)).toEqual(['C:only-option', '-', 'D:adjacent', '-']);
    expect(evaluate(b).slots[2].violatedBy).toEqual([1, 3]);
  });

  it('red names the tightest violator; ties go to the bigger radius', () => {
    // slot 2: talker@1 clearance -1, normal@3 clearance 0 -> talker
    expect(culpritOf(bath('_ T _ N _ _ _ _'), 2)).toBe(1);
    // slot 2: splasher@0 clearance 0, normal@3 clearance 0 -> splasher (radius 2)
    expect(culpritOf(bath('P _ _ N _ _ _ _'), 2)).toBe(0);
    expect(grades(bath('P _ _ N _ _ _ _', 'left'))[2]).toBe('D:splasher');
    expect(culpritOf(bath('_ _ _ _ _ _ _ N'), 0)).toBeNull();
  });

  it('amber vs doctor', () => {
    // one normal neighbour -> amber
    const one = evaluate(bath('_ _ _ _ N _', 'left'));
    expect(one.slots[3]).toMatchObject({ grade: 'amber', reason: 'adjacent', violatedBy: [4] });
    // a boss's zone -> doctor, even at distance 3
    const boss = evaluate(bath('_ _ _ _ _ _ B', 'right'));
    expect(boss.slots[3]).toMatchObject({ grade: 'doctor', reason: 'boss', violatedBy: [6] });
    // between two normal guys -> doctor (2 violations)
    const two = evaluate(bath('_ _ _ N _ N', 'right'));
    expect(two.slots[4]).toMatchObject({ grade: 'doctor', reason: 'adjacent', violatedBy: [3, 5] });
    expect(two.slots[2]).toMatchObject({ grade: 'amber' });
    // when the best already violates once, any worse pick has 2+ -> doctor
    expect(grades(bath('_ N _ N', 'right'))[2]).toBe('D:adjacent');
  });

  it('exactly one clear whenever something is pickable', () => {
    for (const s of ['_ _ _', 'N _ _ N', 'S _ B _ S', '_ | _ | _', 'L W L', 'S S N']) {
      for (const door of ['left', 'right'] as const) expect(evaluate(bath(s, door)).greens).toHaveLength(1);
    }
    expect(evaluate(bath('N X N')).greens).toEqual([]);
  });
});
