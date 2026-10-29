// End-of-day card: score, rank, tiles, streak, share, countdown, and a review of the six rounds.
import { useMemo } from 'react';
import type { DailyRecord, Evaluation, Round } from '../types';
import { RESULT_TITLES } from '../content';
import { buildShareText } from '../engine/daily';
import { evaluate } from '../engine/code';
import { routeUrl } from '../router';
import { useSave } from '../state/SaveContext';
import { displayStreak, formatCountdown, msUntilNextDaily } from '../state/dailyStreak';
import { ShareButton } from '../ui/ShareButton';
import { Tile, TileRow } from '../ui/Tiles';
import { useNow } from '../ui/hooks';
import { HydrationChart } from '../ui/HydrationChart';
import { clearsIn, gradeCounts, verdictLine, violatorName } from './roundLogic';

export function NextCountdown({ label = 'Next Urinal in' }: { label?: string }) {
  const now = useNow(1000);
  return (
    <p className="countdown">
      {label} <span className="countdown-time">{formatCountdown(msUntilNextDaily(new Date(now)))}</span>
    </p>
  );
}

/** Rank title by number of clears (0..6). */
export function rankTitle(clears: number): string {
  return RESULT_TITLES[Math.max(0, Math.min(RESULT_TITLES.length - 1, clears))] ?? '';
}

export function DailyShare({ record, variant = 'primary' }: { record: DailyRecord; variant?: 'primary' | 'default' }) {
  const text = useMemo(() => buildShareText(record, routeUrl({ name: 'daily' })), [record]);
  return <ShareButton text={text} title={`Urinal #${record.number}`} label="Share result" variant={variant} />;
}

export interface DailyResultsProps {
  record: DailyRecord;
  todayKey: string;
  /** The day's rounds, for the review list. Omit to skip the review. */
  rounds?: Round[];
}

export function DailyResults({ record, todayKey, rounds }: DailyResultsProps) {
  const { save } = useSave();
  const clears = clearsIn(record.results);
  const streak = displayStreak(save.daily, todayKey);

  const review = useMemo(() => {
    if (!rounds) return [];
    return record.results.map((res, i) => {
      const round = rounds.find((r) => r.id === res.roundId) ?? rounds[i];
      let ev: Evaluation | undefined;
      try {
        ev = round ? evaluate(round.bathroom) : undefined;
      } catch {
        ev = undefined;
      }
      const name = round ? violatorName(round.bathroom, ev, res.pick) : undefined;
      return { res, venue: round?.venue ?? `Round ${i + 1}`, line: verdictLine(res.roundId, res.reason, name) };
    });
  }, [record, rounds]);

  return (
    <div className="results">
      <section className="card results-card">
        <p className="results-kicker">Urinal #{record.number}</p>
        <p className="results-score">
          {clears}
          <span className="results-of">/6</span>
        </p>
        <p className="results-title">{rankTitle(clears)}</p>
        <TileRow results={record.results} />
        <HydrationChart compact art counts={gradeCounts(record.results)} title="Today" />
        <dl className="results-meta">
          <div>
            <dt>Streak</dt>
            <dd>
              {streak} {streak === 1 ? 'day' : 'days'}
            </dd>
          </div>
          <div>
            <dt>Best</dt>
            <dd>
              {save.daily.bestStreak} {save.daily.bestStreak === 1 ? 'day' : 'days'}
            </dd>
          </div>
        </dl>
        <div className="row row--center">
          <DailyShare record={record} />
        </div>
        {record.dateKey === todayKey && <NextCountdown />}
      </section>

      {review.length > 0 && (
        <section className="card review">
          <h2 className="h3">The six bathrooms</h2>
          <ol className="review-list">
            {review.map(({ res, venue, line }, i) => (
              <li key={res.roundId} className="review-item">
                <Tile grade={res.grade} size="sm" />
                <span className="review-text">
                  <span className="review-venue">
                    {i + 1}. {venue}
                  </span>
                  <span className="review-line">{line}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
