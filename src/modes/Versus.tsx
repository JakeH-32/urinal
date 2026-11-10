// Challenge links: the line shown while you play one, the room-by-room comparison once you've
// finished, and the field for your own name on the links you send. Names arrive from a URL and are
// only ever rendered as text.
import { useMemo, useState } from 'react';
import type { Round, RoundResult } from '../types';
import { CHALLENGE_NAME_MAX, challengeResults, type Challenge } from '../engine/challenge';
import { GRADE_ORDER } from '../grades';
import { setChallengeName, useChallengeName } from '../state/challengeStore';
import { ROUNDS_PER_DAY } from '../state/storage';
import { Tile } from '../ui/Tiles';
import { clearsIn } from './roundLogic';
import './Versus.css';

/** How many clears the challenger got in these rooms, or null when their picks don't fit the rooms. */
export function challengeClears(rounds: readonly Round[], challenge: Challenge | null | undefined): number | null {
  if (!challenge) return null;
  const theirs = challengeResults(rounds, challenge.picks);
  return theirs ? clearsIn(theirs) : null;
}

/** One line above the room while a challenge is on. Their score only: never their picks or grades. */
export function ChallengeLine({ name, clears }: { name?: string; clears: number }) {
  return (
    <p className="vs-line">
      {name || 'Your friend'} got {clears}/{ROUNDS_PER_DAY}. {clears >= ROUNDS_PER_DAY ? 'Match that.' : 'Beat that.'}
    </p>
  );
}

/** One line for a link that was for another day. */
export function StaleChallengeLine({ number }: { number: number }) {
  return <p className="vs-line">That challenge was Urinal #{number}. Here’s today’s.</p>;
}

export interface VersusProps {
  /** Today's rounds. */
  rounds: readonly Round[];
  /** The player's finished results, in round order. */
  mine: readonly RoundResult[];
  challenge: Challenge;
}

const rank = (r: RoundResult) => GRADE_ORDER.indexOf(r.grade);

/** You vs the challenger, room by room. Renders nothing until you've finished, or when the rooms don't match. */
export function Versus({ rounds, mine, challenge }: VersusProps) {
  const theirs = useMemo(() => challengeResults(rounds, challenge.picks), [rounds, challenge]);
  if (!theirs || mine.length < ROUNDS_PER_DAY) return null;
  const them = challenge.name || 'your friend';
  const Them = challenge.name || 'Your friend';
  const a = clearsIn(mine.slice(0, ROUNDS_PER_DAY));
  const b = clearsIn(theirs);
  return (
    <section className="card vs" aria-label={`You against ${them}`}>
      <h2 className="vs-score">
        <span className="vs-side">You</span>
        <span className="vs-num">
          {a} – {b}
        </span>
        <span className="vs-side vs-side--them">{them}</span>
      </h2>
      <p className="vs-result">{a > b ? 'You win.' : a < b ? `${Them} wins.` : 'A draw.'}</p>
      <ol className="vs-rows">
        {theirs.map((their, i) => {
          const round = rounds[i];
          const my = mine.find((r) => r.roundId === their.roundId) ?? mine[i];
          const d = rank(my) - rank(their);
          return (
            <li key={their.roundId} className="vs-row">
              <span className="vs-room">
                <span className="vs-venue">
                  {i + 1}. {round?.venue ?? `Round ${i + 1}`}
                </span>
                {my.pick === their.pick && <span className="vs-same">Same spot</span>}
              </span>
              <span className={`vs-tile${d < 0 ? ' is-better' : ''}`}>
                <Tile grade={my.grade} size="sm" />
              </span>
              <span className="vs-mark" role="img" aria-label={d < 0 ? 'You did better' : d > 0 ? `${Them} did better` : 'Even'}>
                {d < 0 ? '◀' : d > 0 ? '▶' : '='}
              </span>
              <span className={`vs-tile${d > 0 ? ' is-better' : ''}`}>
                <Tile grade={their.grade} size="sm" />
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Optional: the name friends see on your challenge links. Saved on this device as you type. */
export function ChallengeNameField() {
  const saved = useChallengeName();
  // The text as typed (a trailing space must survive until the next letter); the store keeps the cleaned name.
  const [text, setText] = useState(saved);
  return (
    <label className="vs-name">
      <span className="vs-name-label">Name on your link</span>
      <input
        className="vs-name-input"
        type="text"
        value={text}
        maxLength={CHALLENGE_NAME_MAX}
        placeholder="Optional"
        autoComplete="nickname"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(e) => {
          const next = [...e.target.value].slice(0, CHALLENGE_NAME_MAX).join('');
          setText(next);
          setChallengeName(next);
        }}
      />
    </label>
  );
}
