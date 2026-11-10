import { describe, expect, it } from 'vitest';
import type { Guy, Quirk, Round, Slot } from '../types';
import { SIGHTINGS, daySightings, sightingsIn, withSightings } from './sightings';
import { defaultSave, migrate, resetProgress } from './storage';
import { emptyRound } from '../engine/generate';

function guy(quirk: Quirk, group?: number): Guy {
  return {
    quirk,
    ...(group !== undefined ? { group } : {}),
    name: 'x',
    blurb: 'x',
    look: { shirt: 0, pants: 0, hair: 0, skin: 0, height: 0, bald: false },
  };
}

function roundOf(occupants: (Guy | undefined)[]): Round {
  const slots: Slot[] = occupants.map((occupant) => ({ kind: 'urinal', ...(occupant ? { occupant } : {}) }));
  return {
    id: 't',
    seed: 1,
    difficulty: 2,
    venue: 'Test',
    bathroom: { slots, dividers: slots.slice(1).map(() => false), door: 'left' },
  };
}

describe('sightingsIn', () => {
  it('finds nothing in an ordinary room', () => {
    expect(sightingsIn(roundOf([guy('normal'), undefined, guy('talker'), undefined]))).toEqual([]);
  });

  it('spots the rookie, the doppelganger and bigfoot', () => {
    expect(sightingsIn(roundOf([guy('bigfoot'), undefined, guy('rookie'), undefined, guy('doppel')]))).toEqual([
      'rookie',
      'doppel',
      'bigfoot',
    ]);
  });

  it('counts three twins of one group as triplets, but not a pair', () => {
    expect(sightingsIn(roundOf([guy('twin', 2), guy('twin', 2), undefined, guy('normal')]))).toEqual([]);
    expect(sightingsIn(roundOf([guy('twin', 2), guy('twin', 2), guy('twin', 2), undefined]))).toEqual(['triplets']);
    // Two separate pairs are not triplets.
    expect(sightingsIn(roundOf([guy('twin', 1), guy('twin', 1), undefined, guy('twin', 4), guy('twin', 4)]))).toEqual([]);
  });

  it('calls a room with nobody in it the empty room', () => {
    expect(sightingsIn(roundOf([undefined, undefined, undefined]))).toEqual(['empty']);
    expect(sightingsIn(emptyRound(42, 'p-test'))).toEqual(['empty']);
  });

  it('every id is listed in SIGHTINGS once', () => {
    const ids = SIGHTINGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(['bigfoot', 'doppel', 'empty', 'legend-bigfoot', 'legend-chili', 'legend-mirror', 'legend-sumo', 'legend-team', 'legend-triplets', 'legend-wolves', 'rookie', 'stallboss', 'sumo', 'triplets']);
  });
});

describe('daySightings', () => {
  it('is empty for an ordinary day and for no rooms', () => {
    expect(daySightings([])).toEqual([]);
    expect(daySightings([roundOf([guy('normal'), undefined]), roundOf([guy('talker'), undefined])])).toEqual([]);
  });

  it('lists each sighting once, rarest first', () => {
    const day = [
      roundOf([guy('rookie'), undefined]),
      roundOf([guy('bigfoot'), undefined, guy('rookie')]),
      { ...roundOf([guy('sumo'), undefined, guy('sumo')]), legend: 'legend-sumo' as const },
      roundOf([guy('doppel'), undefined]),
      roundOf([undefined, undefined]),
    ];
    expect(daySightings(day).map((s) => s.id)).toEqual(['legend-sumo', 'doppel', 'bigfoot', 'rookie', 'sumo', 'empty']);
    expect(daySightings(day)[1]).toEqual({ id: 'doppel', label: 'Your Doppelgänger', emoji: '🪞', rarity: 'very rare' });
  });
});

describe('withSightings', () => {
  it('adds new ids and reports them', () => {
    const r = withSightings(defaultSave(), ['bigfoot']);
    expect(r.added).toEqual(['bigfoot']);
    expect(r.save.sightings).toEqual(['bigfoot']);
  });

  it('never duplicates, and returns the same save when nothing is new', () => {
    const once = withSightings(defaultSave(), ['rookie', 'rookie']).save;
    expect(once.sightings).toEqual(['rookie']);
    const again = withSightings(once, ['rookie']);
    expect(again.added).toEqual([]);
    expect(again.save).toBe(once);
    expect(withSightings(once, ['rookie', 'empty']).save.sightings).toEqual(['rookie', 'empty']);
  });

  it('works on a save without the field', () => {
    const { sightings: _drop, ...old } = defaultSave();
    expect(withSightings(old, ['empty']).save.sightings).toEqual(['empty']);
  });
});

describe('sightings in the save', () => {
  it('defaults to none', () => {
    expect(migrate({}).sightings).toEqual([]);
    expect(migrate({ version: 1, sightings: 'bigfoot' }).sightings).toEqual([]);
  });

  it('keeps only known ids, once each', () => {
    expect(migrate({ version: 1, sightings: ['bigfoot', 'nessie', 3, null, 'bigfoot', 'empty'] }).sightings).toEqual([
      'bigfoot',
      'empty',
    ]);
  });

  it('round-trips through JSON', () => {
    const s = withSightings(defaultSave(), ['triplets', 'doppel']).save;
    expect(migrate(JSON.stringify(s))).toEqual(s);
  });

  it('survives a progress reset', () => {
    const s = withSightings(defaultSave(), ['rookie']).save;
    expect(resetProgress(s).sightings).toEqual(['rookie']);
  });
});
