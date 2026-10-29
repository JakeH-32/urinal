// One bathroom: pick -> walk in -> grade -> verdict -> Next. Shared by Daily and Practice.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Round, RoundResult } from '../types';
import { BathroomScene } from '../scene';
import { evaluate } from '../engine/code';
import { explainPick } from '../engine/explain';
import { sfx } from '../audio/sfx';
import { Button } from '../ui/Button';
import { GradeUrinal } from '../ui/GradeUrinal';
import { resultFromEvaluation, verdictLine, violatorName } from './roundLogic';

export interface RoundPlayerProps {
  round: Round;
  reducedMotion: boolean;
  /** Fires once, when the grade is revealed. Persist here. */
  onGraded(result: RoundResult): void;
  onNext(): void;
  nextLabel: string;
  /** Rendered above the scene (tiles, round counter, venue...). */
  header?: ReactNode;
  /** Extra controls next to the Next button (e.g. share this round). */
  extra?: ReactNode;
}

/** If the scene never reports the walk finishing, reveal anyway after this long. */
const WALK_FALLBACK_MS = 5000;
const STEP_MS = 300;
const MAX_STEPS = 10;

export function RoundPlayer({ round, reducedMotion, onGraded, onNext, nextLabel, header, extra }: RoundPlayerProps) {
  // Pure and cheap. Computed up front so a broken engine fails loudly into the ErrorBoundary.
  const evaluation = useMemo(() => evaluate(round.bathroom), [round]);
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<RoundResult | null>(null);
  const graded = useRef(false);
  const stepTimer = useRef<number | undefined>(undefined);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Latest callbacks, so timers never call stale props.
  const onGradedRef = useRef(onGraded);
  onGradedRef.current = onGraded;

  const stopTimers = () => {
    window.clearInterval(stepTimer.current);
    window.clearTimeout(fallbackTimer.current);
  };
  useEffect(() => stopTimers, []);

  const reveal = (pick: number) => {
    if (graded.current) return;
    graded.current = true;
    stopTimers();
    const r = resultFromEvaluation(round.id, pick, evaluation);
    setResult(r);
    sfx.play(r.grade);
    if (r.reason === 'gassy') sfx.play('fart');
    onGradedRef.current(r);
  };
  const revealRef = useRef(reveal);
  revealRef.current = reveal;

  const onPick = (i: number) => {
    if (picked !== undefined || graded.current) return;
    const slot = round.bathroom.slots[i];
    if (!slot || slot.occupant || slot.flag === 'broken') return;
    setPicked(i);
    sfx.play('step');
    if (!reducedMotion) {
      let steps = 1;
      stepTimer.current = window.setInterval(() => {
        if (steps++ >= MAX_STEPS) window.clearInterval(stepTimer.current);
        else sfx.play('step');
      }, STEP_MS);
    }
    fallbackTimer.current = window.setTimeout(() => revealRef.current(i), reducedMotion ? 400 : WALK_FALLBACK_MS);
  };

  const onWalkDone = () => {
    if (picked !== undefined) revealRef.current(picked);
  };

  useEffect(() => {
    if (result) nextRef.current?.focus({ preventScroll: true });
  }, [result]);

  const line = result ? verdictLine(round.id, result.reason, violatorName(round.bathroom, evaluation, result.pick)) : '';
  const why = result ? explainPick(round.bathroom, evaluation, result.pick) : null;

  return (
    <div className="round">
      {header}
      {round.premise && <p className="round-premise">{round.premise}</p>}
      <div className={`scene-frame${picked === undefined ? ' is-picking' : ''}`}>
        <BathroomScene
          bathroom={round.bathroom}
          onPick={onPick}
          disabled={picked !== undefined}
          picked={picked}
          evaluation={result ? evaluation : undefined}
          reducedMotion={reducedMotion}
          onWalkDone={onWalkDone}
        />
      </div>
      <div className="round-foot" aria-live="polite">
        {!result ? (
          <p className="round-prompt">{picked === undefined ? 'Tap a spot.' : 'Walking in…'}</p>
        ) : (
          <div className={`verdict verdict--${result.grade}`}>
            <div className="verdict-main">
              <GradeUrinal grade={result.grade} animate={!reducedMotion} />
              {line && <p className="verdict-line">{line}</p>}
            </div>
            {why && <p className="verdict-why">{why}</p>}
            <div className="row">
              <Button ref={nextRef} variant="primary" size="lg" onClick={onNext} sound={false}>
                {nextLabel}
              </Button>
              {extra}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
