// Crowd-stats consent: may this device send its picks (with a random device id) to the crowd stats?
// Kept under its own localStorage key so the save format (storage.ts) doesn't change.
//
// Default when the player hasn't chosen: ON, except in time zones in the EEA, UK and Switzerland
// (ePrivacy / GDPR: storing an identifier on the device and sending it needs consent there), where
// it stays OFF until they turn it on in Settings. The time zone is only a heuristic for the
// default; nothing about it is stored or sent. Unknown time zone = OFF.
//
// Wiring for src/net/community.ts: recordPick/recordFinish return early unless
// crowdSharingAllowed(), and nothing creates the device id while it's false.
import { useSyncExternalStore } from 'react';
import { getDefaultStorage } from './storage';

export const SHARE_STORAGE_KEY = 'urinal:share:v1';
/** Same value as CROWD_STORAGE_KEY in src/net/community.ts (not imported, to avoid an import cycle; a test checks it). */
export const CROWD_DEVICE_KEY = 'urinal:crowd:v1';

// EEA + UK + Switzerland, by IANA zone. Every "Europe/" zone counts (that also catches a few
// non-EEA countries, which only means sharing starts off there too), plus EU territories elsewhere.
const CONSENT_ZONES = new Set([
  'Atlantic/Azores',
  'Atlantic/Canary',
  'Atlantic/Madeira',
  'Atlantic/Reykjavik',
  'Atlantic/Faroe',
  'Atlantic/Faeroe',
  'Arctic/Longyearbyen',
  'Asia/Nicosia',
  'Asia/Famagusta',
  'Africa/Ceuta',
  'America/Cayenne',
  'America/Guadeloupe',
  'America/Martinique',
  'America/Marigot',
  'America/St_Barthelemy',
  'Indian/Reunion',
  'Indian/Mayotte',
  'GB',
  'GB-Eire',
  'Eire',
  'Iceland',
  'Poland',
  'Portugal',
  'WET',
  'CET',
  'MET',
  'EET',
]);

/** The browser's IANA time zone, or '' if unavailable. */
export function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

/** True when the time zone suggests the EEA, UK or Switzerland (or is unknown). */
export function inConsentRegion(timeZone: string): boolean {
  if (!timeZone) return true;
  return timeZone.startsWith('Europe/') || CONSENT_ZONES.has(timeZone);
}

export interface CrowdSharing {
  on: boolean;
  /** false = nobody has chosen yet; `on` is the regional default. */
  chosen: boolean;
}

export function getCrowdSharing(storage: Storage | null = getDefaultStorage(), timeZone: string = currentTimeZone()): CrowdSharing {
  try {
    const v = storage?.getItem(SHARE_STORAGE_KEY);
    if (v === '1') return { on: true, chosen: true };
    if (v === '0') return { on: false, chosen: true };
  } catch {
    /* blocked */
  }
  return { on: !inConsentRegion(timeZone), chosen: false };
}

/** Use this before sending anything to the crowd stats. Never throws. */
export function crowdSharingAllowed(): boolean {
  try {
    return getCrowdSharing().on;
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();

/** Save the choice. Turning it off also deletes this device's crowd id. */
export function setCrowdSharing(on: boolean, storage: Storage | null = getDefaultStorage()): void {
  try {
    storage?.setItem(SHARE_STORAGE_KEY, on ? '1' : '0');
    if (!on) storage?.removeItem(CROWD_DEVICE_KEY);
  } catch {
    /* blocked: nothing is stored, and the default applies next visit */
  }
  listeners.forEach((fn) => fn());
}

/** The random crowd-stats id stored on this device, or null if there isn't one. */
export function readCrowdDeviceId(storage: Storage | null = getDefaultStorage()): string | null {
  try {
    const raw = storage?.getItem(CROWD_DEVICE_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    const id = typeof v === 'object' && v !== null ? (v as { device?: unknown }).device : undefined;
    return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SHARE_STORAGE_KEY || e.key === null) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

const snapshot = () => {
  const s = getCrowdSharing();
  return (s.on ? 1 : 0) + (s.chosen ? 2 : 0);
};

/** The current choice, kept in sync across components and tabs. */
export function useCrowdSharing(): CrowdSharing {
  const n = useSyncExternalStore(subscribe, snapshot, () => 0);
  return { on: (n & 1) === 1, chosen: (n & 2) === 2 };
}
