// First visit only: three easy rooms (easy, easy, medium) before the first daily. Never scored or
// sent to crowd stats; finishing or skipping it sets save.warmupDone. It teaches instead of
// punishing: a miss hides the ✓ and offers Try again until you find the spot. The tile keeps your
// first try.
import { useMemo, useState } from 'react';
import type { RoundResult } from '../types';
import { warmupRounds } from '../engine/generate';
import { sfx } from '../audio/sfx';
import { Button } from '../ui/Button';
import { TileRow } from '../ui/Tiles';
import { PerchPuck } from '../ui/Puck';
import { useReducedMotion } from '../ui/hooks';
import { RoundPlayer } from './RoundPlayer';

export function Warmup({ number, onDone }: { number: number; onDone(): void }) {
  const reducedMotion = useReducedMotion();
  const rounds = useMemo(() => warmupRounds(), []);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [finished, setFinished] = useState(false);

  if (finished) {
    return (
      <section className="card warmup-done center">
        <PerchPuck mood="approves" size={64} inside />
        <TileRow results={results} total={rounds.length} />
        <h2 className="page-title">Warmed up.</h2>
        <p>That was the easy part. Today’s Urinal is five bathrooms, and they get harder.</p>
        <Button variant="primary" size="lg" onClick={onDone}>
          Start Urinal #{number}
        </Button>
      </section>
    );
  }

  const round = rounds[index];
  const last = index >= rounds.length - 1;
  const onGraded = (r: RoundResult) => setResults((rs) => (rs.some((x) => x.roundId === r.roundId) ? rs : [...rs, r]));
  const onNext = () => {
    if (last) {
      sfx.play('flush');
      setFinished(true);
      window.scrollTo(0, 0);
    } else {
      sfx.play('click');
      setIndex((i) => i + 1);
      setAttempt(0);
    }
  };

  const header = (
    <header className="round-head">
      <TileRow results={results} total={rounds.length} activeIndex={index} flipIndex={index} numbered />
      <p className="round-meta">
        <span className="round-count">
          Warm-up · Room {index + 1} of {rounds.length}
        </span>
        <span className="round-venue">{round.venue}</span>
      </p>
      <Button variant="ghost" size="sm" className="warmup-skip" onClick={onDone}>
        Skip warm-up
      </Button>
    </header>
  );

  return (
    <RoundPlayer
      key={`${round.id}-${attempt}`}
      round={round}
      reducedMotion={reducedMotion}
      onGraded={onGraded}
      onNext={onNext}
      nextLabel={last ? 'Done' : 'Next bathroom'}
      header={header}
      onRetry={() => setAttempt((a) => a + 1)}
    />
  );
}
