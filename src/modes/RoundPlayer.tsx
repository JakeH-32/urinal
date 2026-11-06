// One bathroom: pick -> walk in -> grade -> verdict -> Next. Shared by Daily and Practice.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Round, RoundResult } from '../types';
import { BathroomScene } from '../scene';
import { evaluate } from '../engine/code';
import { explainPick } from '../engine/explain';
import { sfx } from '../audio/sfx';
import { Button } from '../ui/Button';
import { GradeUrinal } from '../ui/GradeUrinal';
import { crowdPercents, type RoundCrowd } from '../net/community';
import { RoundCrowdLine } from '../ui/Crowd';
import { PerchPuck, puckForGrade } from '../ui/Puck';
import { resultFromEvaluation, verdictFor } from './roundLogic';
import { useSave } from '../state/SaveContext';
import { useToast } from '../ui/Toast';
import { sightingById, sightingsIn, withSightings, type SightingId } from '../state/sightings';

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
  /** How everyone else picked this round (daily only; null until loaded or when stats are off). */
  crowd?: RoundCrowd | null;
  /**
   * Warm-up: a miss keeps the ✓ hidden and offers Try again instead of Next, so you find the spot
   * yourself. Learning by doing, never a formula.
   */
  onRetry?: () => void;
}

/** Puck's size on the scene frame. */
const PUCK_SIZE = 65;

/** Next ignores taps this soon after it appears, so a fast double tap can't skip the verdict. */
const NEXT_GUARD_MS = 400;

/** If the scene never reports the walk finishing, reveal anyway after this long. */
const WALK_FALLBACK_MS = 5000;
const STEP_MS = 300;
const MAX_STEPS = 10;

export function RoundPlayer({ round, reducedMotion, onGraded, onNext, nextLabel, header, extra, crowd, onRetry }: RoundPlayerProps) {
  // Pure and cheap. Computed up front so a broken engine fails loudly into the ErrorBoundary.
  const evaluation = useMemo(() => evaluate(round.bathroom), [round]);
  // Rare characters and rooms: collect the first sighting of each, with a toast.
  const { update } = useSave();
  const toast = useToast();
  useEffect(() => {
    const ids = sightingsIn(round);
    if (ids.length === 0) return;
    let added: SightingId[] = [];
    update((s) => {
      const r = withSightings(s, ids);
      added = r.added;
      return r.save;
    });
    for (const id of added) {
      const sg = sightingById(id);
      toast(`${sg.emoji} New sighting: ${sg.label}`, { tone: 'success', durationMs: 4000 });
    }
  }, [round, update, toast]);
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<RoundResult | null>(null);
  const graded = useRef(false);
  const stepTimer = useRef<number | undefined>(undefined);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Puck sits on the bathroom's real top edge. The scene is often narrower than its row (and its height
  // changes with the screen), so measure where its frame actually is and keep him on it.
  const frameRef = useRef<HTMLDivElement>(null);
  const [perch, setPerch] = useState<{ right: number; top: number; pad: number } | null>(null);
  const padRef = useRef(0);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const scene = frame?.querySelector<HTMLElement>('.urinal-scene');
    if (!frame || !scene) return;
    const place = () => {
      const f = frame.getBoundingClientRect();
      const s = scene.getBoundingClientRect();
      const size = PUCK_SIZE;
      // Where the scene's top edge would be with no extra room pushed in above it.
      const sTop = s.top - padRef.current;
      // Sitting on the frame's top edge, legs over the wall. Never over the text above: try the right corner,
      // then the left. If the words cover both (a small room under a long title), push the room down just
      // far enough to clear the better corner; only if that's a lot, sink him into the frame instead.
      // The words themselves, line by line (a text block's own box spans the full width).
      const texts = [...(frame.parentElement?.querySelectorAll('.round-venue, .round-premise, .round-count') ?? [])].flatMap((t) => {
        const range = document.createRange();
        range.selectNodeContents(t);
        return [...range.getClientRects()];
      });
      const lift = size * 0.62;
      // How far the room must move down for Puck to clear every word at this corner.
      const needed = (x: number) =>
        Math.max(0, ...texts.filter((r) => !(r.right < x || r.left > x + size)).map((r) => Math.ceil(r.bottom - 2 - (sTop - lift + size * 0.1))));
      const corners = [s.right - 6 - size, s.left + 6].map((x) => ({ x, pad: needed(x) }));
      const best = corners.reduce((a, b) => (b.pad < a.pad ? b : a));
      const next =
        best.pad <= size * 0.6
          ? { right: Math.round(f.right - best.x - size), top: Math.round(sTop + best.pad - f.top - lift), pad: best.pad }
          : { right: Math.round(f.right - (s.right - 6)), top: Math.round(sTop - f.top - size * 0.3), pad: 0 };
      padRef.current = next.pad;
      setPerch(next);
    };
    place();
    // Re-check whenever the frame or the text above it changes size, and once the fonts arrive (the
    // fallback font is wider, so a title can look like it blocks a corner until the real one loads).
    const ro = new ResizeObserver(place);
    ro.observe(frame);
    ro.observe(scene);
    frame.parentElement?.querySelectorAll('.round-venue, .round-premise, .round-count').forEach((t) => ro.observe(t));
    let live = true;
    document.fonts?.ready.then(() => live && place()).catch(() => undefined);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [round]);
  const shownAt = useRef(0);

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
    if (!result) return;
    shownAt.current = performance.now();
    const next = nextRef.current;
    next?.focus({ preventScroll: true });
    // Short screens: bring Next into view so nobody has to scroll for it (no-op when it's visible).
    next?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [result, reducedMotion]);

  const line = result ? verdictFor(round.id, round.bathroom, evaluation, result) : '';
  const retry = !!onRetry && !!result && result.grade !== 'clear';
  // A retry keeps the answer hidden: no ✓ on the scene, and no why note that points at it.
  const shownEvaluation = result ? (retry ? { ...evaluation, greens: [] } : evaluation) : undefined;
  const rawWhy = result ? explainPick(round.bathroom, evaluation, result.pick) : null;
  const why = retry && rawWhy?.includes('✓') ? null : rawWhy;
  const act = () => {
    if (performance.now() - shownAt.current < NEXT_GUARD_MS) return;
    if (retry) onRetry?.();
    else onNext();
  };

  return (
    <div className="round">
      {header}
      {round.premise && <p className="round-premise">{round.premise}</p>}
      <div ref={frameRef} className={`scene-frame${picked === undefined ? ' is-picking' : ''}`} style={perch?.pad ? { paddingTop: perch.pad } : undefined}>
        <PerchPuck size={PUCK_SIZE} at={perch} mood={result ? (round.bathroom.slots[result.pick]?.flag === 'puddle' ? 'disgusted' : puckForGrade(result.grade)) : 'thinking'} />
        <BathroomScene
          bathroom={round.bathroom}
          onPick={onPick}
          disabled={picked !== undefined}
          picked={picked}
          evaluation={shownEvaluation}
          reducedMotion={reducedMotion}
          onWalkDone={onWalkDone}
          crowd={result ? crowdPercents(crowd ?? null, result.pick) : undefined}
        />
      </div>
      <div className="round-foot" aria-live="polite">
        {!result ? (
          <p className="round-prompt">{picked === undefined ? 'Tap a spot' : 'Walking in…'}</p>
        ) : (
          <div className={`verdict verdict--${result.grade}`}>
            <GradeUrinal grade={result.grade} size={80} animate={!reducedMotion} />
            <div className="verdict-text">
              {line && <p className="verdict-line">{line}</p>}
              {why && <p className="verdict-why">{why}</p>}
              {crowd && <RoundCrowdLine crowd={crowd} pick={result.pick} greens={evaluation.greens} />}
            </div>
            <div className="row verdict-actions">
              <Button ref={nextRef} variant="primary" size="lg" onClick={act} sound={false}>
                {retry ? 'Try again' : nextLabel}
              </Button>
              {extra}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
