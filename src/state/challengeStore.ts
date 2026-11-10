// Challenge links, on this device: the challenge being played today, and the player's own display
// name for the links they send. Each has its own localStorage key so the save format (storage.ts)
// doesn't change. Every access is wrapped: with storage blocked the game still plays.
import { useSyncExternalStore } from 'react';
import { cleanChallengeName, decodeChallenge, encodeChallenge, readChallenge, type Challenge } from '../engine/challenge';
import { getDefaultStorage } from './storage';

export const VS_STORAGE_KEY = 'urinal:vs';
export const NAME_STORAGE_KEY = 'urinal:name';

/** Remember a challenge (stored as its own link payload, so reading it back re-validates it). */
export function saveActiveChallenge(c: Challenge, storage: Storage | null = getDefaultStorage()): void {
  try {
    const code = encodeChallenge(c);
    if (code) storage?.setItem(VS_STORAGE_KEY, code);
  } catch {
    /* blocked: the challenge lasts as long as the link stays in the address bar */
  }
}

/** The stored challenge if it's for Urinal #todayNumber, else null. Yesterday's is ignored. */
export function activeChallenge(todayNumber: number, storage: Storage | null = getDefaultStorage()): Challenge | null {
  try {
    const c = decodeChallenge(storage?.getItem(VS_STORAGE_KEY));
    return c && c.number === todayNumber ? c : null;
  } catch {
    return null;
  }
}

export interface AdoptedChallenge {
  /** The challenge to play against today, from the link or from an earlier visit today. */
  challenge: Challenge | null;
  /** Set when the link carried a challenge for a different day: that day's number. */
  staleNumber?: number;
}

/**
 * Call when the daily opens, with location.search. A link for today becomes the active challenge
 * (and is saved, so a reload without the query string keeps it). A link for another day is reported
 * as stale and changes nothing.
 */
export function adoptChallenge(search: string, todayNumber: number, storage: Storage | null = getDefaultStorage()): AdoptedChallenge {
  const linked = readChallenge(search);
  if (linked && linked.number === todayNumber) {
    saveActiveChallenge(linked, storage);
    return { challenge: linked };
  }
  const challenge = activeChallenge(todayNumber, storage);
  return linked ? { challenge, staleNumber: linked.number } : { challenge };
}

// ---------------------------------------------------------------------------
// The player's own name on the links they send
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

/** '' when none is set. */
export function getChallengeName(storage: Storage | null = getDefaultStorage()): string {
  try {
    return cleanChallengeName(storage?.getItem(NAME_STORAGE_KEY));
  } catch {
    return '';
  }
}

export function setChallengeName(name: string, storage: Storage | null = getDefaultStorage()): void {
  try {
    const clean = cleanChallengeName(name);
    if (clean) storage?.setItem(NAME_STORAGE_KEY, clean);
    else storage?.removeItem(NAME_STORAGE_KEY);
  } catch {
    /* blocked */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === NAME_STORAGE_KEY || e.key === null) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** The saved name ('' when none), kept in sync across components and tabs. */
export function useChallengeName(): string {
  return useSyncExternalStore(
    subscribe,
    () => getChallengeName(),
    () => '',
  );
}
