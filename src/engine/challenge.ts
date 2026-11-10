// Challenge links ("you vs Jake"): a finished daily's picks ride in the URL, so a friend plays the same
// five rooms and then sees both sets of grades side by side. No backend. Pure functions only.
//
// Format: <daily number>-<five slot digits>[-<name>], e.g. "13-47215-Jake". The name is percent-encoded.
import type { DailyRecord, Round, RoundResult } from '../types';
import { ROUNDS_PER_DAY } from '../state/storage';
import { resultFromEvaluation } from '../modes/roundLogic';
import { evaluate } from './code';

export interface Challenge {
  /** Urinal #N the picks belong to. */
  number: number;
  /** One slot index (0..9) per round, in round order. */
  picks: number[];
  /** The challenger's display name: already cleaned, never empty when present. */
  name?: string;
}

export const CHALLENGE_NAME_MAX = 12;
export const CHALLENGE_PARAM = 'vs';
/** Far beyond any real daily number (that's 270 years of Urinals). */
const MAX_NUMBER = 99_999;
/** Longest string worth looking at: number + picks + a 12-character name, fully percent-encoded. */
const MAX_ENCODED = 240;

/** A display name from anywhere (a text field, a URL): one line, no control characters, at most 12 characters. */
export function cleanChallengeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  try {
    const flat = raw.replace(/[\p{C}\p{Z}]+/gu, ' ').trim();
    return [...flat].slice(0, CHALLENGE_NAME_MAX).join('').trim();
  } catch {
    return '';
  }
}

const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_NUMBER;
const validPicks = (p: unknown): p is number[] =>
  Array.isArray(p) && p.length === ROUNDS_PER_DAY && p.every((x) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 9);

/** The URL-safe payload, or null when the number or picks can't be carried (not five picks, a slot past 9...). */
export function encodeChallenge(c: { number: number; picks: readonly number[]; name?: string }): string | null {
  const picks = [...c.picks];
  if (!validNumber(c.number) || !validPicks(picks)) return null;
  const base = `${c.number}-${picks.join('')}`;
  const name = cleanChallengeName(c.name);
  if (!name) return base;
  try {
    // encodeURIComponent leaves !'()* alone; chat apps cut links at some of those.
    return `${base}-${encodeURIComponent(name).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`)}`;
  } catch {
    return base;
  }
}

const SHAPE = new RegExp(`^(\\d{1,5})-(\\d{${ROUNDS_PER_DAY}})(?:-(.*))?$`, 's');

/** Reads a payload from encodeChallenge (still percent-encoded). Anything else gives null. Never throws. */
export function decodeChallenge(str: unknown): Challenge | null {
  if (typeof str !== 'string' || str.length === 0 || str.length > MAX_ENCODED) return null;
  const m = SHAPE.exec(str);
  if (!m) return null;
  const number = Number(m[1]);
  if (!validNumber(number)) return null;
  const picks = [...m[2]].map(Number);
  let name = '';
  if (m[3]) {
    try {
      name = cleanChallengeName(decodeURIComponent(m[3]));
    } catch {
      name = '';
    }
  }
  return name ? { number, picks, name } : { number, picks };
}

/**
 * The link to share for a finished daily. The router is hash-based, so the payload is a query
 * parameter ahead of the hash. A record that can't be carried gives the plain daily link.
 */
export function challengeUrl(record: DailyRecord, name?: string, base = 'https://urinal.app/'): string {
  const code = record.finished ? encodeChallenge({ number: record.number, picks: record.results.map((r) => r.pick), name }) : null;
  return code ? `${base}?${CHALLENGE_PARAM}=${code}#/daily` : `${base}#/daily`;
}

/** The challenge in a location.search string ("?vs=13-47215-Jake"), or null. */
export function readChallenge(search: unknown): Challenge | null {
  if (typeof search !== 'string') return null;
  const m = new RegExp(`[?&]${CHALLENGE_PARAM}=([^&#]*)`).exec(search);
  return m ? decodeChallenge(m[1]) : null;
}

/**
 * The challenger's results in today's rooms, graded exactly as a played pick is. Null when any pick
 * isn't a spot you could take in its room (occupied, broken, out of range): the rooms don't match.
 */
export function challengeResults(rounds: readonly Round[], picks: readonly number[]): RoundResult[] | null {
  if (rounds.length < ROUNDS_PER_DAY || picks.length !== ROUNDS_PER_DAY) return null;
  try {
    const out: RoundResult[] = [];
    for (let i = 0; i < ROUNDS_PER_DAY; i++) {
      const round = rounds[i];
      const pick = picks[i];
      const ev = evaluate(round.bathroom);
      const slot = ev.slots.find((s) => s.index === pick);
      if (!Number.isInteger(pick) || !slot?.pickable || !slot.grade) return null;
      out.push(resultFromEvaluation(round.id, pick, ev));
    }
    return out;
  } catch {
    return null;
  }
}
