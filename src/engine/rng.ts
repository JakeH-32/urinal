import type { Rng } from '../types';

/** cyrb53 string hash -> 53-bit number (we usually mask it down). */
export function hashString(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Seeds that fit in a 6-char share code (30 bits). */
export const SEED_MASK = 0x3fffffff;

/** Derive a 30-bit seed from any string. */
export function seedFrom(str: string): number {
  return hashString(str) & SEED_MASK;
}

/** Random 30-bit seed (non-deterministic). */
export function randomSeed(): number {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] & SEED_MASK;
  }
  return Math.floor(Math.random() * SEED_MASK);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a seeded RNG. Same seed -> same sequence, forever. */
export function createRng(seed: number | string): Rng {
  const numeric = typeof seed === 'string' ? hashString(seed) : seed;
  const next = mulberry32(numeric >>> 0);
  const rng: Rng = {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick on empty array');
      return items[Math.floor(next() * items.length)];
    },
    weighted(items, weight) {
      if (items.length === 0) throw new Error('rng.weighted on empty array');
      let total = 0;
      for (const item of items) total += Math.max(0, weight(item));
      if (total <= 0) return rng.pick(items);
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, weight(item));
        if (roll < 0) return item;
      }
      return items[items.length - 1];
    },
    chance(p) {
      return next() < p;
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    fork(label) {
      return createRng(hashString(label, numeric >>> 0));
    },
  };
  return rng;
}

// ---------------------------------------------------------------------------
// Practice codes: 6 Crockford base32 chars, e.g. "K7Q2XM" (30-bit seed)
// ---------------------------------------------------------------------------

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: no I L O U

export function encodePracticeCode(seed: number): string {
  let n = seed & SEED_MASK;
  let s = '';
  for (let i = 0; i < 6; i++) {
    s = ALPHABET[n & 31] + s;
    n >>>= 5;
  }
  return s;
}

/** Accepts lowercase, an optional "p-" prefix, and the Crockford aliases O->0, I/L->1. */
export function decodePracticeCode(code: string): number | null {
  let c = code.trim().toUpperCase();
  if (c.startsWith('P-')) c = c.slice(2);
  if (c.length !== 6) return null;
  c = c.replace(/O/g, '0').replace(/[IL]/g, '1');
  let n = 0;
  for (const ch of c) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    n = n * 32 + v;
  }
  return n & SEED_MASK;
}
