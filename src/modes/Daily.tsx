// Today's six bathrooms. Every result is saved the moment it's revealed, so a reload resumes mid-day.
import { useMemo, useState } from 'react';
import type { RoundResult } from '../types';
import { dailyRounds } from '../engine/generate';
import { dailyNumber } from '../engine/daily';
import { sfx } from '../audio/sfx';
import { useSave } from '../state/SaveContext';
import { recordRound, toDateKey } from '../state/dailyStreak';
import { ROUNDS_PER_DAY } from '../state/storage';
import { LinkButton } from '../ui/Button';
import { TileRow } from '../ui/Tiles';
import { useReducedMotion } from '../ui/hooks';
import { DailyResults } from './DailyResults';
import { RoundPlayer } from './RoundPlayer';

export function Daily() {
  const { save, update } = useSave();
  const reducedMotion = useReducedMotion();
  // Fixed for the life of this screen: a daily started at 23:59 finishes as that day's daily.
  const [todayKey] = useState(() => toDateKey(new Date()));
  const rounds = useMemo(() => dailyRounds(todayKey), [todayKey]);
  const number = useMemo(() => dailyNumber(todayKey), [todayKey]);

  const record = save.daily.byDate[todayKey];
  const results = record?.results ?? [];

  const [view, setView] = useState<'play' | 'results'>(() => (record?.finished ? 'results' : 'play'));
  const [index, setIndex] = useState(() => Math.min(results.length, ROUNDS_PER_DAY - 1));

  if (view === 'results' && record) {
    return (
      <>
        <DailyResults record={record} todayKey={todayKey} rounds={rounds} />
        <div className="row row--center">
          <LinkButton href="#/practice" variant="default">
            Practice
          </LinkButton>
          <LinkButton href="#/stats" variant="ghost">
            Stats
          </LinkButton>
        </div>
      </>
    );
  }

  const round = rounds[index];
  if (!round) return <p className="center muted">No bathroom for round {index + 1}.</p>;

  const onGraded = (r: RoundResult) => update((s) => recordRound(s, todayKey, number, r));
  const last = index >= ROUNDS_PER_DAY - 1;
  const onNext = () => {
    if (last) {
      sfx.play('flush');
      setView('results');
      window.scrollTo(0, 0);
    } else {
      sfx.play('click');
      setIndex((i) => i + 1);
    }
  };

  const header = (
    <header className="round-head">
      <TileRow results={results} activeIndex={index} flipIndex={index} numbered />
      <p className="round-meta">
        <span className="round-count">
          Urinal #{number} · Round {index + 1} of {ROUNDS_PER_DAY}
        </span>
        <span className="round-venue">{round.venue}</span>
      </p>
    </header>
  );

  return (
    <RoundPlayer
      key={round.id}
      round={round}
      reducedMotion={reducedMotion}
      onGraded={onGraded}
      onNext={onNext}
      nextLabel={last ? 'See results' : 'Next bathroom'}
      header={header}
    />
  );
}
