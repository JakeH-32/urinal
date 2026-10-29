// Endless practice bathrooms. Each has a code (#/practice/CODE) that rebuilds exactly that room.
import { useEffect, useMemo, useState } from 'react';
import type { Grade, RoundResult } from '../types';
import { practiceRound } from '../engine/generate';
import { decodePracticeCode, encodePracticeCode, randomSeed } from '../engine/rng';
import { routeUrl } from '../router';
import { useSave } from '../state/SaveContext';
import { recordPractice } from '../state/storage';
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
  const [seed, setSeed] = useState(() => decoded ?? randomSeed());
  const [run, setRun] = useState(0);
  const [history, setHistory] = useState<Grade[]>([]);

  useEffect(() => {
    if (code && decoded === null) toast(`“${code}” isn’t a room code. Here’s a random bathroom.`, { tone: 'danger' });
  }, [code, decoded, toast]);

  const round = useMemo(() => practiceRound(seed), [seed]);
  const roomCode = useMemo(() => encodePracticeCode(seed), [seed]);

  const onGraded = (r: RoundResult) => {
    const newRun = nextRun(run, r.grade);
    setRun(newRun);
    setHistory((h) => [...h, r.grade].slice(-12));
    update((s) => recordPractice(s, r.grade, newRun));
  };

  const onNext = () => setSeed(randomSeed());

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
