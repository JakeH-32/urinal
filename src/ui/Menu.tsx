import { useMemo } from 'react';
import { TAGLINES } from '../content';
import { dailyNumber } from '../engine/daily';
import { useSave } from '../state/SaveContext';
import { displayStreak, toDateKey } from '../state/dailyStreak';
import { DailyShare, NextCountdown, rankTitle } from '../modes/DailyResults';
import { clearsIn } from '../modes/roundLogic';
import { LinkButton } from './Button';
import { TileRow } from './Tiles';
import { useNow, useReducedMotion, useRotating } from './hooks';

export function Menu() {
  const { save } = useSave();
  const reducedMotion = useReducedMotion();
  const now = useNow(30_000);
  const todayKey = toDateKey(new Date(now));
  const number = useMemo(() => dailyNumber(todayKey), [todayKey]);
  const tagline = useRotating(TAGLINES, 6000, !reducedMotion);
  const record = save.daily.byDate[todayKey];
  const streak = displayStreak(save.daily, todayKey);
  const done = record?.results.length ?? 0;

  return (
    <div className="menu">
      <header className="hero">
        <h1 className="wordmark" aria-label="Urinal">
          {'URINAL'.split('').map((ch, i) => (
            <span key={i} className="wordmark-tile" aria-hidden="true">
              {ch}
            </span>
          ))}
        </h1>
        <p className="tagline" key={tagline}>
          {tagline}
        </p>
      </header>

      {record?.finished ? (
        <section className="card today">
          <p className="today-kicker">Urinal #{record.number}</p>
          <p className="today-score">
            {clearsIn(record.results)}/6 · {rankTitle(clearsIn(record.results))}
          </p>
          <TileRow results={record.results} />
          <NextCountdown />
          <div className="row row--center">
            <DailyShare record={record} />
            <LinkButton href="#/daily" variant="default">
              See results
            </LinkButton>
          </div>
        </section>
      ) : (
        <div className="menu-primary">
          <LinkButton href="#/daily" variant="primary" size="lg" block>
            {done > 0 ? `Resume Urinal #${number} (${done}/6)` : `Play Urinal #${number}`}
          </LinkButton>
          <p className="muted small center">Six bathrooms. Same six for everyone today.</p>
        </div>
      )}

      {streak > 0 && (
        <p className="streak center">
          Streak: <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'}
        </p>
      )}

      <nav className="menu-grid" aria-label="More">
        <LinkButton href="#/practice" block>
          Practice
        </LinkButton>
        <LinkButton href="#/how" block>
          How to play
        </LinkButton>
        <LinkButton href="#/stats" block>
          Stats
        </LinkButton>
        <LinkButton href="#/settings" block>
          Settings
        </LinkButton>
      </nav>
    </div>
  );
}
