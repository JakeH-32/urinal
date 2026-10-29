// Endless practice bathrooms. Each has a code (#/endless/CODE) that rebuilds exactly that room.
// The room in progress, the run and recent grades are saved, so leaving or reloading never rerolls
// an unplayed room or resets the run. A graded room deals a fresh one when you come back.
import { useEffect, useMemo, useState } from 'react';
import type { Grade, RoundResult } from '../types';
import { practiceRound } from '../engine/generate';
import { decodePracticeCode, encodePracticeCode, randomSeed } from '../engine/rng';
import { navigate, routeUrl } from '../router';
import { useSave } from '../state/SaveContext';
import { recordPractice, withPracticeCurrent } from '../state/storage';
import { ShareButton } from '../ui/ShareButton';
import { useToast } from '../ui/Toast';
import { useReducedMotion } from '../ui/hooks';
import { RoundPlayer } from './RoundPlayer';
import { GRADES } from '../grades';
import { nextRun } from './roundLogic';

export function Practice({ code }: { code?: string }) {
  const { save, update } = useSave();
  const reducedMotion = useReducedMotion();
  const toast = useToast();

  const decoded = useMemo(() => (code ? decodePracticeCode(code) : null), [code]);
  // Read once on mount: a shared code wins, else the saved unplayed room, else a new one.
  const [saved] = useState(() => save.practice.current);
  const [seed, setSeed] = useState(() => decoded ?? (saved && !saved.done ? saved.seed : randomSeed()));
  const [run, setRun] = useState(() => saved?.run ?? 0);
  const [history, setHistory] = useState<Grade[]>(() => saved?.history ?? []);

  // Save the room as soon as it's dealt.
  useEffect(() => {
    update((s) => withPracticeCurrent(s, { seed, run, history, done: false }));
    // Only when the room changes; run and history are saved with each grade.
  }, [seed, update]);

  useEffect(() => {
    if (code && decoded === null) toast(`“${code}” isn’t a room code. Here’s a random bathroom.`, { tone: 'danger' });
  }, [code, decoded, toast]);

  const round = useMemo(() => practiceRound(seed), [seed]);
  const roomCode = useMemo(() => encodePracticeCode(seed), [seed]);

  const onGraded = (r: RoundResult) => {
    const newRun = nextRun(run, r.grade);
    const newHistory = [...history, r.grade].slice(-12);
    setRun(newRun);
    setHistory(newHistory);
    update((s) => withPracticeCurrent(recordPractice(s, r.grade, newRun), { seed, run: newRun, history: newHistory, done: true }));
  };

  const onNext = () => {
    const next = randomSeed();
    // Drop a shared room's code from the address so a reload doesn't deal that room again.
    if (code) {
      update((s) => withPracticeCurrent(s, { seed: next, run, history, done: false }));
      navigate({ name: 'practice' }, { replace: true });
    } else setSeed(next);
  };

  const header = (
    <header className="round-head">
      <div className="practice-stats">
        <span>
          Run <strong>{run}</strong>
        </span>
        <span>
          Best <strong>{save.practice.bestRun}</strong>
        </span>
        <span className="practice-history" aria-label="Recent results">
          {history.map((g) => GRADES[g].emoji).join('')}
        </span>
      </div>
      <p className="round-meta">
        <span className="round-count">
          Endless · Level {round.difficulty} · <span className="code">{roomCode}</span>
        </span>
        <span className="round-venue">{round.venue}</span>
      </p>
    </header>
  );

  return (
    <RoundPlayer
      key={`${seed}`}
      round={round}
      reducedMotion={reducedMotion}
      onGraded={onGraded}
      onNext={onNext}
      nextLabel="Next bathroom"
      header={header}
      extra={
        <ShareButton
          text={`Urinal room ${roomCode}. Find the right one.`}
          url={routeUrl({ name: 'practice', code: roomCode })}
          label="Share room"
        />
      }
    />
  );
}
