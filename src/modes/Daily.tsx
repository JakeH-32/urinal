// Today's five bathrooms. Every result is saved the moment it's revealed, so a reload resumes mid-day.
import { useEffect, useMemo, useState } from 'react';
import type { RoundResult } from '../types';
import { dailyRounds } from '../engine/generate';
import { dailyNumber } from '../engine/daily';
import { sfx } from '../audio/sfx';
import { hydrationPoints, pickableOnly, recordFinish, recordPick } from '../net/community';
import { useDayCrowd } from '../net/useCrowd';
import { useSave } from '../state/SaveContext';
import { recordRound, toDateKey } from '../state/dailyStreak';
import { ROUNDS_PER_DAY } from '../state/storage';
import { activeChallenge, adoptChallenge } from '../state/challengeStore';
import { Button, LinkButton } from '../ui/Button';
import { TileRow } from '../ui/Tiles';
import { useReducedMotion } from '../ui/hooks';
import { DailyResults } from './DailyResults';
import { RoomReview } from './RoomReview';
import { DayReplay } from './DayReplay';
import { RoundPlayer } from './RoundPlayer';
import { Warmup } from './Warmup';
import { ChallengeLine, StaleChallengeLine, challengeClears } from './Versus';

const clearsOf = (rs: readonly RoundResult[]) => rs.filter((r) => r.grade === 'clear').length;

export function Daily() {
  const { save, update } = useSave();
  const reducedMotion = useReducedMotion();
  // Fixed for the life of this screen: a daily started at 23:59 finishes as that day's daily.
  // Dev only: ?day=YYYY-MM-DD plays that date's daily (for playtesting future days).
  const [todayKey] = useState(() => (import.meta.env.DEV && new URLSearchParams(location.search).get('day')) || toDateKey(new Date()));
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
  // A played tile tapped mid-day: that room again, read-only.
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);

  // A challenge link (?vs=...): a friend's picks for today's rooms. Saved, so a reload without the query keeps it.
  const [vs] = useState(() => adoptChallenge(location.search, number));
  // Their clears in today's rooms; null when there's no challenge or their picks don't fit these rooms.
  const vsClears = useMemo(() => challengeClears(rounds, vs.challenge), [rounds, vs]);
  // Once it's saved (or was for another day), take it out of the address bar so a copied address is clean.
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (!params.has('vs') || (vs.staleNumber === undefined && !activeChallenge(number))) return;
      params.delete('vs');
      const query = params.toString();
      history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    } catch {
      /* the link stays as it is */
    }
  }, []);

  // First visit ever: three easy rooms before the first daily. Arriving on a challenge skips them.
  if (!save.warmupDone && vsClears === null && results.length === 0) return <Warmup number={number} onDone={() => update((s) => ({ ...s, warmupDone: true }))} />;

  if (view === 'results' && record) {
    return (
      <>
        {replaying && <DayReplay rounds={rounds} results={record.results} number={number} reducedMotion={reducedMotion} onClose={() => setReplaying(false)} />}
        <DailyResults record={record} todayKey={todayKey} rounds={rounds} crowd={dayCrowd} />
        <div className="row row--center">
          <Button variant="default" onClick={() => setReplaying(true)}>
            ▶ Replay
          </Button>
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
    update((s) => {
      const next = recordRound(s, todayKey, number, r);
      // A finished daily counts as warmed up (challenge visitors skip the warm-up; they never get it later).
      return next.daily.byDate[todayKey]?.finished && !next.warmupDone ? { ...next, warmupDone: true } : next;
    });
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
      {vsClears !== null ? (
        <ChallengeLine name={vs.challenge?.name} clears={vsClears} />
      ) : vs.staleNumber !== undefined ? (
        <StaleChallengeLine number={vs.staleNumber} />
      ) : null}
      <TileRow results={results} activeIndex={index} flipIndex={index} numbered onSelect={setReviewing} />
      <p className="round-meta">
        <span className="round-count">
          Urinal #{number}
        </span>
        <span className="round-venue">{round.venue}</span>
      </p>
    </header>
  );

  const reviewRound = reviewing === null ? undefined : rounds.find((r) => r.id === results[reviewing]?.roundId);
  return (
    <>
    {reviewRound && reviewing !== null && (
      <RoomReview round={reviewRound} result={results[reviewing]} title={`Urinal #${number} · Round ${reviewing + 1}`} onClose={() => setReviewing(null)} />
    )}
    <RoundPlayer
      key={round.id}
      round={round}
      reducedMotion={reducedMotion}
      onGraded={onGraded}
      onNext={onNext}
      nextLabel={last ? 'See results' : 'Next bathroom'}
      header={header}
      crowd={pickableOnly(dayCrowd?.rounds[index], round.bathroom)}
    />
    </>
  );
}
