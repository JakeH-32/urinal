// Today's six bathrooms. Every result is saved the moment it's revealed, so a reload resumes mid-day.
import { useEffect, useMemo, useState } from 'react';
import type { RoundResult } from '../types';
import { dailyRounds } from '../engine/generate';
import { dailyNumber } from '../engine/daily';
import { sfx } from '../audio/sfx';
import { hydrationPoints, recordFinish, recordPick } from '../net/community';
import { useDayCrowd } from '../net/useCrowd';
import { useSave } from '../state/SaveContext';
import { recordRound, toDateKey } from '../state/dailyStreak';
import { ROUNDS_PER_DAY } from '../state/storage';
import { LinkButton } from '../ui/Button';
import { TileRow } from '../ui/Tiles';
import { useReducedMotion } from '../ui/hooks';
import { DailyResults } from './DailyResults';
import { RoundPlayer } from './RoundPlayer';

const clearsOf = (rs: readonly RoundResult[]) => rs.filter((r) => r.grade === 'clear').length;

export function Daily() {
  const { save, update } = useSave();
  const reducedMotion = useReducedMotion();
  // Fixed for the life of this screen: a daily started at 23:59 finishes as that day's daily.
  const [todayKey] = useState(() => toDateKey(new Date()));
  const rounds = useMemo(() => dailyRounds(todayKey), [todayKey]);
  const number = useMemo(() => dailyNumber(todayKey), [todayKey]);

  const record = save.daily.byDate[todayKey];
  const results = record?.results ?? [];

  // Crowd stats (all no-ops until the backend is configured). On open, re-send anything from today that a
  // dead network dropped, or that was played before stats existed; the net layer skips what this device
  // already sent. Runs once per screen: new picks are sent from onGraded.
  useEffect(() => {
    const done = record?.results ?? [];
    done.forEach((res, i) => {
      const r = rounds.findIndex((x) => x.id === res.roundId);
      recordPick(number, (r >= 0 ? r : i) + 1, res.pick, res.grade);
    });
    if (done.length >= ROUNDS_PER_DAY) recordFinish(number, hydrationPoints(done), clearsOf(done));
  }, [number]);
  // Refetches after every graded round, so the numbers include your own pick.
  const dayCrowd = useDayCrowd(number, results.length);

  const [view, setView] = useState<'play' | 'results'>(() => (record?.finished ? 'results' : 'play'));
  const [index, setIndex] = useState(() => Math.min(results.length, ROUNDS_PER_DAY - 1));

  if (view === 'results' && record) {
    return (
      <>
        <DailyResults record={record} todayKey={todayKey} rounds={rounds} crowd={dayCrowd} />
        <div className="row row--center">
          <LinkButton href="#/endless" variant="default">
            Endless
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

  const onGraded = (r: RoundResult) => {
    update((s) => recordRound(s, todayKey, number, r));
    recordPick(number, index + 1, r.pick, r.grade);
    const all = results.some((x) => x.roundId === r.roundId) ? results : [...results, r];
    if (all.length >= ROUNDS_PER_DAY) recordFinish(number, hydrationPoints(all), clearsOf(all));
  };
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
      crowd={dayCrowd?.rounds[index] ?? null}
    />
  );
}
