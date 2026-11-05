// End-of-day card: score, rank, tiles, streak, share, countdown, and a review of the five rounds.
import { useEffect, useMemo, useState } from 'react';
import type { DailyRecord, Evaluation, Round } from '../types';
import { RESULT_TITLES } from '../content';
import { buildShareText } from '../engine/daily';
import { evaluate } from '../engine/code';
import { routeUrl } from '../router';
import { useSave } from '../state/SaveContext';
import { displayStreak, formatCountdown, msUntilNextDaily } from '../state/dailyStreak';
import { ROUNDS_PER_DAY } from '../state/storage';
import { ShareButton } from '../ui/ShareButton';
import { Tile, TileRow } from '../ui/Tiles';
import { useNow } from '../ui/hooks';
import { HydrationChart } from '../ui/HydrationChart';
import { hydrationPoints, pickableOnly, type DayCrowd } from '../net/community';
import { DayCrowdSummary, ReviewCrowd } from '../ui/Crowd';
import { RoomReview } from './RoomReview';
import { drawCardImage, drawStoryImage } from '../ui/storyImage';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { PerchPuck, puckForClears } from '../ui/Puck';
import { clearsIn, gradeCounts, verdictLine, violatorName } from './roundLogic';

export function NextCountdown({ label = 'Hold it. Next Urinal in' }: { label?: string }) {
  const now = useNow(1000);
  return (
    <p className="countdown">
      {label} <span className="countdown-time">{formatCountdown(msUntilNextDaily(new Date(now)))}</span>
    </p>
  );
}

/** Rank title by number of clears (0..5). */
export function rankTitle(clears: number): string {
  return RESULT_TITLES[Math.max(0, Math.min(RESULT_TITLES.length - 1, clears))] ?? '';
}

/**
 * A share picture, made ahead of time. Phones only open the share sheet straight after a tap, and drawing
 * the picture takes a moment, so it's made when the screen opens and the tap just shares it.
 */
function usePrebuiltImage(make: (() => Promise<Blob>) | null, name: string): File | null {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (!make) return;
    let live = true;
    // Let the page (and Puck) render first; he's copied into the picture.
    const t = window.setTimeout(() => {
      make()
        .then((blob) => live && setFile(new File([blob], name, { type: 'image/png' })))
        .catch(() => undefined);
    }, 300);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
    // Built once per record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return file;
}

const puckMarkup = () => document.querySelector('.results-card .puck, .puck')?.outerHTML ?? null;

/** Phones only: a story-sized image (score, tiles, rank, Puck) through the share sheet, e.g. to Instagram Stories. */
function StoryShare({ record, clears }: { record: DailyRecord; clears: number }) {
  const toast = useToast();
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const file = usePrebuiltImage(
    phone ? () => drawStoryImage(record, { clears, total: ROUNDS_PER_DAY, title: rankTitle(clears), puckSvg: puckMarkup(), site: 'urinal.app' }) : null,
    `urinal-${record.number}-story.png`,
  );
  if (!phone) return null;
  const onClick = async () => {
    if (!file) return;
    // Instagram only takes links from its Link sticker, so the link goes on the clipboard too. Not awaited:
    // the share sheet has to open while the tap still counts.
    navigator.clipboard?.writeText('https://urinal.app').catch(() => undefined);
    try {
      if (navigator.canShare?.({ files: [file] })) {
        // The link rides along: Instagram ignores it, Messages and other chats show it under the picture.
        await navigator.share({ files: [file], title: `Urinal #${record.number}`, text: 'https://urinal.app' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('Image saved. Post it from your photos.', { tone: 'success' });
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) toast('Couldn’t open the share sheet. Try again.', { tone: 'danger' });
    }
  };
  return (
    <Button variant="default" onClick={onClick} disabled={!file}>
      {file ? 'Share to story' : 'Making it…'}
    </Button>
  );
}

export function DailyShare({ record, variant = 'primary' }: { record: DailyRecord; variant?: 'primary' | 'default' }) {
  const text = useMemo(() => buildShareText(record, routeUrl({ name: 'daily' })), [record]);
  // A square card rides along with the text where the share sheet takes files (Messages shows it as a picture).
  const clears = clearsIn(record.results);
  const file = usePrebuiltImage(
    record.finished ? () => drawCardImage(record, { clears, total: ROUNDS_PER_DAY, title: rankTitle(clears), puckSvg: puckMarkup(), site: 'urinal.app' }) : null,
    `urinal-${record.number}.png`,
  );
  return <ShareButton text={text} title={`Urinal #${record.number}`} label="Share result" variant={variant} image={file ? () => Promise.resolve(file) : undefined} imageText="https://urinal.app" />;
}

export interface DailyResultsProps {
  record: DailyRecord;
  todayKey: string;
  /** The day's rounds, for the review list. Omit to skip the review. */
  rounds?: Round[];
  /** How everyone else did today (null until loaded or when stats are off). */
  crowd?: DayCrowd | null;
}

export function DailyResults({ record, todayKey, rounds, crowd }: DailyResultsProps) {
  const { save } = useSave();
  const clears = clearsIn(record.results);
  const streak = displayStreak(save.daily, todayKey);
  const [reviewing, setReviewing] = useState<number | null>(null);

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
      return {
        res,
        venue: round?.venue ?? `Round ${i + 1}`,
        line: verdictLine(res.roundId, res.reason, name),
      };
    });
  }, [record, rounds]);

  const reviewRes = reviewing === null ? undefined : record.results[reviewing];
  const reviewRound = reviewRes && rounds ? (rounds.find((r) => r.id === reviewRes.roundId) ?? rounds[reviewing ?? 0]) : undefined;
  return (
    <div className="results">
      {reviewRound && reviewRes && reviewing !== null && (
        <RoomReview round={reviewRound} result={reviewRes} title={`Urinal #${record.number} · Round ${reviewing + 1}`} onClose={() => setReviewing(null)} />
      )}
      <section className="card results-card">
        <PerchPuck mood={puckForClears(clears, ROUNDS_PER_DAY)} size={64} inside />
        <div className="results-main">
          <p className="results-kicker">Urinal #{record.number}</p>
          <p className="results-score">
            {clears}
            <span className="results-of">/{ROUNDS_PER_DAY}</span>
          </p>
          <p className="results-title">{rankTitle(clears)}</p>
          <TileRow results={record.results} onSelect={rounds ? setReviewing : undefined} />
          {crowd && <DayCrowdSummary crowd={crowd} points={hydrationPoints(record.results)} />}
          <div className="row row--center">
            <DailyShare record={record} />
            <StoryShare record={record} clears={clears} />
          </div>
          {record.dateKey === todayKey && <NextCountdown />}
        </div>
        <div className="results-side">
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
        </div>
      </section>

      {review.length > 0 && (
        <section className="card review">
          <h2 className="h3">The five bathrooms</h2>
          <ol className="review-list">
            {review.map(({ res, venue, line }, i) => (
              <li key={res.roundId} className="review-item">
                <Tile grade={res.grade} size="sm" onClick={() => setReviewing(i)} />
                <span className="review-text">
                  <span className="review-venue">
                    {i + 1}. {venue}
                  </span>
                  <span className="review-line">{line}</span>
                  <ReviewCrowd crowd={pickableOnly(crowd?.rounds[i], rounds?.[i]?.bathroom)} pick={res.pick} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
