// Cosmetic palettes for guys. Indices come from Guy.look (seeded); out-of-range values wrap.
import type { Guy, Quirk } from '../types';

export interface QuirkStyle {
  /** Strong chip colour (also the quirk guy's outfit accent). */
  color: string;
  /** Readable text colour on `color`. */
  ink: string;
  /** Short chip label, upper case. Empty for plain guys (no chip). */
  tag: string;
  emoji: string;
}

/**
 * Per-quirk identity: the chip above each quirk guy's head in the scene.
 */
export const QUIRK_STYLE: Record<Quirk, QuirkStyle> = {
  normal: { color: '#7b8794', ink: '#ffffff', tag: '', emoji: '🧍' },
  talker: { color: '#8e44ec', ink: '#ffffff', tag: 'TALKER', emoji: '🗣️' },
  splasher: { color: '#1683e0', ink: '#ffffff', tag: 'SPLASHER', emoji: '💦' },
  boss: { color: '#c62828', ink: '#ffffff', tag: 'BOSS', emoji: '👔' },
  drunk: { color: '#ef7d00', ink: '#1d1300', tag: 'DRUNK', emoji: '🍺' },
  facetime: { color: '#0f9d8a', ink: '#ffffff', tag: 'FACETIME', emoji: '📱' },
  gassy: { color: '#6f8418', ink: '#ffffff', tag: 'GASSY', emoji: '💨' },
  inlaw: { color: '#86603f', ink: '#ffffff', tag: 'IN-LAW', emoji: '👴' },
  pastor: { color: '#25262d', ink: '#ffffff', tag: 'PASTOR', emoji: '⛪' },
  peeper: { color: '#c72683', ink: '#ffffff', tag: 'PEEPER', emoji: '👀' },
  pilot: { color: '#1b3a73', ink: '#ffffff', tag: 'PILOT', emoji: '✈️' },
  tourist: { color: '#237a35', ink: '#ffffff', tag: 'HIKER', emoji: '🎒' },
  crypto: { color: '#e5b80b', ink: '#2a1f00', tag: 'CRYPTO', emoji: '🪙' },
  finance: { color: '#8ec5ee', ink: '#0f2a44', tag: 'FINANCE', emoji: '📞' },
};

/** Just the chip colours, for legends and UI. */
export const QUIRK_COLORS: Record<Quirk, string> = {
  normal: QUIRK_STYLE.normal.color,
  talker: QUIRK_STYLE.talker.color,
  splasher: QUIRK_STYLE.splasher.color,
  boss: QUIRK_STYLE.boss.color,
  drunk: QUIRK_STYLE.drunk.color,
  facetime: QUIRK_STYLE.facetime.color,
  gassy: QUIRK_STYLE.gassy.color,
  inlaw: QUIRK_STYLE.inlaw.color,
  pastor: QUIRK_STYLE.pastor.color,
  peeper: QUIRK_STYLE.peeper.color,
  pilot: QUIRK_STYLE.pilot.color,
  tourist: QUIRK_STYLE.tourist.color,
  crypto: QUIRK_STYLE.crypto.color,
  finance: QUIRK_STYLE.finance.color,
};

export type HairStyle = 'crop' | 'buzz' | 'curly' | 'swoop' | 'long' | 'bun' | 'slick' | 'fringe';

/** look.shirt 0..7. Muted on purpose so quirk guys (and yellow "you") pop. */
export const SHIRTS = ['#8d9aa8', '#a39a8e', '#8fa293', '#b0b3b8', '#6b717b', '#9c95a8', '#b5a48f', '#d3d0c8'] as const;
/** look.pants 0..4. */
export const PANTS = ['#3b5b8c', '#c2a878', '#2a2a30', '#6b6f78', '#6e4a33'] as const;
/** look.hair 0..5: a style + colour pair each. */
export const HAIRS: readonly { style: HairStyle; color: string }[] = [
  { style: 'crop', color: '#2b1d14' },
  { style: 'swoop', color: '#d9b25a' },
  { style: 'curly', color: '#1a1a1a' },
  { style: 'long', color: '#8a3b1e' },
  { style: 'buzz', color: '#4a3a2c' },
  { style: 'bun', color: '#5a3a22' },
];
/** look.skin 0..4. */
export const SKINS = ['#f3d3b5', '#e6b48f', '#c98d62', '#9a6440', '#6b4129'] as const;

export const SHOE = '#2a2523';

export interface ResolvedLook {
  shirt: string;
  shirtShade: string;
  /** Arm colour when the sleeves aren't the torso's (the in-law's vest over a shirt). Default shirtShade. */
  sleeve?: string;
  pants: string;
  hair: { style: HairStyle; color: string } | null;
  skin: string;
  height: number;
}

function wrap(i: number, n: number): number {
  const k = Math.trunc(Number.isFinite(i) ? i : 0) % n;
  return k < 0 ? k + n : k;
}

/** Darken a #rrggbb colour by `amt` (0..1). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amt))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Boss outfit: charcoal suit, slicked grey hair (or bald). */
export const SUIT = '#2e3442';
/** Father-in-law: sweater vest (his chip colour) over a pale blue oxford, khakis, grey horseshoe. */
export const OXFORD = '#c9dcef';
/** Pilot: white uniform shirt, navy trousers and cap, gold braid on the epaulettes and cap band. */
export const PILOT_SHIRT = '#f6f6f2';
export const PILOT_NAVY = '#1c2840';
export const PILOT_GOLD = '#e0b43c';
/** Backpack tourist: trail-green shell (his chip colour), zip-off khaki pants, tan bucket hat, brown boots. */
export const TREK_PANTS = '#9a917a';
export const TREK_HAT = '#cdbb8c';
export const TREK_BOOT = '#5a3b22';
/** His gear, parked in the urinals beside him: a red-orange pack and blue trekking poles. */
export const PACK_RED = '#d4532a';
export const PACK_LID = '#3a3f47';
export const POLE_BLUE = '#3b6fb6';
/** Crypto bro: charcoal hoodie (hood down), a gold coin on the back, a gold chain. */
export const CRYPTO_HOODIE = '#3a3d45';
export const CRYPTO_GOLD = QUIRK_STYLE.crypto.color;
/** Finance bro: navy fleece vest over a light-blue button-down (his chip colour), grey chinos. */
export const FLEECE_VEST = '#2c3a52';
export const BUTTON_DOWN = '#a9d0f0';

export function resolveLook(look: Guy['look'], quirk: Quirk = 'normal'): ResolvedLook {
  let shirt: string = SHIRTS[wrap(look.shirt, SHIRTS.length)];
  let hair = look.bald ? null : HAIRS[wrap(look.hair, HAIRS.length)];
  let pants: string = PANTS[wrap(look.pants, PANTS.length)];
  let sleeve: string | undefined;
  if (quirk === 'talker' || quirk === 'splasher' || quirk === 'drunk' || quirk === 'facetime' || quirk === 'gassy' || quirk === 'peeper')
    shirt = QUIRK_STYLE[quirk].color;
  if (quirk === 'boss') {
    shirt = SUIT;
    pants = '#262b37';
    hair = look.bald ? null : { style: 'slick', color: '#a9afb8' };
  }
  if (quirk === 'inlaw') {
    // Always the horseshoe (it's what reads "older" from behind); grey or white.
    shirt = QUIRK_STYLE.inlaw.color;
    sleeve = shade(OXFORD, 0.08);
    pants = PANTS[1];
    hair = { style: 'fringe', color: wrap(look.hair, 2) ? '#e4e2dc' : '#b9bdc3' };
  }
  if (quirk === 'pastor') {
    shirt = QUIRK_STYLE.pastor.color;
    pants = PANTS[2];
    // Short hair only: anything long would hide the collar band.
    if (hair && hair.style !== 'crop' && hair.style !== 'buzz' && hair.style !== 'swoop') hair = { style: 'crop', color: hair.color };
  }
  if (quirk === 'pilot') {
    // White uniform shirt, navy trousers; short hair (or long at the back) so the cap sits flat.
    shirt = PILOT_SHIRT;
    sleeve = shade(PILOT_SHIRT, 0.09);
    pants = PILOT_NAVY;
    if (hair && hair.style !== 'crop' && hair.style !== 'buzz' && hair.style !== 'long') hair = { style: 'crop', color: hair.color };
  }
  if (quirk === 'tourist') {
    // Hair stays short under the bucket hat.
    shirt = QUIRK_STYLE.tourist.color;
    pants = TREK_PANTS;
    if (hair && hair.style !== 'crop' && hair.style !== 'buzz' && hair.style !== 'curly') hair = { style: 'crop', color: hair.color };
  }
  if (quirk === 'crypto') {
    shirt = CRYPTO_HOODIE;
    pants = PANTS[2];
  }
  if (quirk === 'finance') {
    // The vest is the torso; the button-down shows on the arms. Short, styled hair.
    shirt = FLEECE_VEST;
    sleeve = BUTTON_DOWN;
    pants = PANTS[3];
    if (hair && hair.style !== 'crop' && hair.style !== 'swoop' && hair.style !== 'buzz') hair = { style: 'swoop', color: hair.color };
  }
  return {
    shirt,
    shirtShade: shade(shirt, 0.18),
    sleeve,
    pants,
    hair,
    skin: SKINS[wrap(look.skin, SKINS.length)],
    height: wrap(look.height, 3),
  };
}

/** The player: bright yellow hoodie. */
export const YOU_LOOK: ResolvedLook = {
  shirt: '#ffd23f',
  shirtShade: shade('#ffd23f', 0.16),
  pants: '#2f3b52',
  hair: { style: 'crop', color: '#3a2618' },
  skin: '#e6b48f',
  height: 1,
};
