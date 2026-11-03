// A played room, shown again from its tile: your pick, the ✓ spot and the zones you crossed. Read-only.
import { useEffect, useMemo, useRef } from 'react';
import type { Round, RoundResult } from '../types';
import { evaluate } from '../engine/code';
import { explainPick } from '../engine/explain';
import { GRADES } from '../grades';
import { BathroomScene } from '../scene';
import { Button } from '../ui/Button';
import { verdictLine, violatorName } from './roundLogic';

export function RoomReview({ round, result, title, onClose }: { round: Round; result: RoundResult; title: string; onClose(): void }) {
  const evaluation = useMemo(() => evaluate(round.bathroom), [round]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const line = verdictLine(round.id, result.reason, violatorName(round.bathroom, evaluation, result.pick));
  const why = explainPick(round.bathroom, evaluation, result.pick);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="review-overlay" onClick={onClose}>
      <section className="card review-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <p className="round-count">{title}</p>
        <h2 className="round-venue">{round.venue}</h2>
        {round.premise && <p className="round-premise">{round.premise}</p>}
        <BathroomScene bathroom={round.bathroom} picked={result.pick} evaluation={evaluation} disabled reducedMotion />
        <p className="review-dialog-grade">{GRADES[result.grade].label}</p>
        {line && <p className="verdict-line">{line}</p>}
        {why && <p className="verdict-why">{why}</p>}
        <Button ref={closeRef} onClick={onClose}>
          Close
        </Button>
      </section>
    </div>
  );
}
