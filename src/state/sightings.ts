// Sightings: rare characters and rooms, collected the first time you see one. Pure; no React.
import type { Round, SaveData } from '../types';
import { LEGENDARY_ROOMS, type LegendId } from '../content/legendary';

export type SightingId = 'rookie' | 'sumo' | 'stallboss' | 'triplets' | 'empty' | 'doppel' | 'bigfoot' | LegendId;

export interface Sighting {
  id: SightingId;
  label: string;
  emoji: string;
  rarity: 'rare' | 'very rare' | 'legendary';
}

/** Display order, commonest first. */
export const SIGHTINGS: readonly Sighting[] = [
  { id: 'rookie', label: 'The Rookie', emoji: '🐣', rarity: 'rare' },
  { id: 'sumo', label: 'The Sumo Wrestler', emoji: '🍙', rarity: 'rare' },
  { id: 'stallboss', label: 'The Boss, Hiding', emoji: '🚪', rarity: 'rare' },
  { id: 'triplets', label: 'Triplets', emoji: '👯', rarity: 'rare' },
  { id: 'empty', label: 'The Empty Room', emoji: '🦗', rarity: 'rare' },
  { id: 'doppel', label: 'Your Doppelgänger', emoji: '🪞', rarity: 'very rare' },
  { id: 'bigfoot', label: 'Bigfoot', emoji: '🦶', rarity: 'very rare' },
  { id: 'legend-team', label: 'The Starting Five', emoji: '🏀', rarity: 'legendary' },
  { id: 'legend-bigfoot', label: 'The Bigfoot Family', emoji: '🌲', rarity: 'legendary' },
  { id: 'legend-sumo', label: 'The Sumo Sandwich', emoji: '🥪', rarity: 'legendary' },
  { id: 'legend-mirror', label: 'The Hall of Mirrors', emoji: '🎭', rarity: 'legendary' },
  { id: 'legend-wolves', label: 'The Wolf Pack', emoji: '🐺', rarity: 'legendary' },
  { id: 'legend-triplets', label: 'Double Triplets', emoji: '👯', rarity: 'legendary' },
  { id: 'legend-chili', label: 'The Chili Judges', emoji: '🌶️', rarity: 'legendary' },
];

export const SIGHTING_IDS: readonly SightingId[] = SIGHTINGS.map((s) => s.id);

export function isSightingId(v: unknown): v is SightingId {
  return typeof v === 'string' && (SIGHTING_IDS as readonly string[]).includes(v);
}

export function sightingById(id: SightingId): Sighting {
  return SIGHTINGS.find((s) => s.id === id) as Sighting;
}

/** Every sighting in this room, in SIGHTINGS order. */
export function sightingsIn(round: Round): SightingId[] {
  const guys = round.bathroom.slots.flatMap((s) => (s.occupant ? [s.occupant] : []));
  const found = new Set<SightingId>();
  if (guys.length === 0) found.add('empty');
  const legend = LEGENDARY_ROOMS.find((r) => r.id === round.legend);
  if (legend) found.add(legend.id);
  const twins = new Map<number, number>();
  for (const g of guys) {
    if (g.quirk === 'rookie' || g.quirk === 'sumo' || g.quirk === 'doppel' || g.quirk === 'bigfoot') found.add(g.quirk);
    if (g.quirk === 'twin' && g.group !== undefined) twins.set(g.group, (twins.get(g.group) ?? 0) + 1);
  }
  if ([...twins.values()].some((n) => n >= 3)) found.add('triplets');
  if (round.bathroom.slots.some((s) => s.kind === 'stall' && s.occupant?.quirk === 'boss')) found.add('stallboss');
  return SIGHTING_IDS.filter((id) => found.has(id));
}

const RARITY_RANK: Record<Sighting['rarity'], number> = { legendary: 0, 'very rare': 1, rare: 2 };

/** Every sighting across a day's rooms, once each, rarest first (ties in SIGHTINGS order). */
export function daySightings(rounds: readonly Round[]): Sighting[] {
  const found = new Set<SightingId>(rounds.flatMap((r) => sightingsIn(r)));
  return SIGHTINGS.filter((s) => found.has(s.id)).sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);
}

/** Add any new ids to the save. Returns the same save object when nothing is new. */
export function withSightings(save: SaveData, ids: readonly SightingId[]): { save: SaveData; added: SightingId[] } {
  const have = new Set(save.sightings ?? []);
  const added: SightingId[] = [];
  for (const id of ids) {
    if (!have.has(id)) {
      have.add(id);
      added.push(id);
    }
  }
  if (added.length === 0) return { save, added };
  return { save: { ...save, sightings: [...(save.sightings ?? []), ...added] }, added };
}
