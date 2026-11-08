// The finished daily, played back: each room, then you walking in to your spot and the reveal, one after another.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Round, RoundResult } from '../types';
import { evaluate } from '../engine/code';
import { GRADES } from '../grades';
import { BathroomScene } from '../scene';
import { Button } from '../ui/Button';
import { verdictFor } from './roundLogic';

/** How long the empty room shows before you walk in. */
const LOOK_MS = 1100;
/** How long the reveal stays up before the next room. */
const HOLD_MS = 2600;

export function DayReplay({ rounds, results, number, reducedMotion, onClose }: { rounds: Round[]; results: RoundResult[]; number: number; reducedMotion: boolean; onClose(): void }) {
  // Played rooms in order, each with its result.
  const plays = useMemo(
    () => results.flatMap((r) => {
      const round = rounds.find((x) => x.id === r.roundId);
      return round ? [{ round, result: r }] : [];
    }),
    [rounds, results],
  );
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'look' | 'walk' | 'shown'>('look');
  const closeRef = useRef<HTMLButtonElement>(null);
  const play = plays[step];
  const done = step >= plays.length;
  const evaluation = useMemo(() => (play ? evaluate(play.round.bathroom) : undefined), [play]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // look -> walk (the scene reports when you arrive) -> shown -> next room.
  useEffect(() => {
    if (done) return;
    if (phase === 'look') {
      const t = window.setTimeout(() => setPhase('walk'), LOOK_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'shown') {
      const t = window.setTimeout(() => {
        setStep((s) => s + 1);
        setPhase('look');
      }, HOLD_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase, done]);

  const next = () => {
    setStep((s) => s + 1);
    setPhase('look');
  };
  const again = () => {
    setStep(0);
    setPhase('look');
  };

  return (
    <div className="review-overlay" onClick={onClose}>
      <section className="card review-dialog" role="dialog" aria-modal="true" aria-label={`Urinal #${number} replay`} onClick={(e) => e.stopPropagation()}>
        {done || !play || !evaluation ? (
          <>
            <p className="round-count">Urinal #{number} · Replay</p>
            <h2 className="round-venue">That’s the day.</h2>
            <div className="row row--center">
              <Button onClick={again}>Watch again</Button>
              <Button ref={closeRef} variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="round-count">
              Urinal #{number} · Round {step + 1} of {plays.length}
            </p>
            <h2 className="round-venue">{play.round.venue}</h2>
            {play.round.premise && <p className="round-premise">{play.round.premise}</p>}
            <BathroomScene
              key={play.round.id}
              bathroom={play.round.bathroom}
              picked={phase === 'look' ? undefined : play.result.pick}
              evaluation={phase === 'look' ? undefined : evaluation}
              disabled
              reducedMotion={reducedMotion}
              onWalkDone={() => setPhase((p) => (p === 'walk' ? 'shown' : p))}
            />
            <p className="review-dialog-grade" style={{ visibility: phase === 'shown' ? 'visible' : 'hidden' }}>
              {GRADES[play.result.grade].label}
            </p>
            <p className="verdict-line" style={{ visibility: phase === 'shown' ? 'visible' : 'hidden' }}>
              {verdictFor(play.round.id, play.round.bathroom, evaluation, play.result) || ' '}
            </p>
            <div className="row row--center">
              <Button ref={closeRef} variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button onClick={next}>{step + 1 < plays.length ? 'Skip' : 'Finish'}</Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
