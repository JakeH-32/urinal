// End-of-day card: score, rank, tiles, streak, share, countdown, and a review of the five rounds.
import { useMemo, useState } from 'react';
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

async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Phones only: a story-sized image (score, tiles, rank, Puck) through the share sheet, e.g. to Instagram Stories. */
function StoryShare({ record, clears }: { record: DailyRecord; clears: number }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (!phone) return null;
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    // Instagram only takes links from its Link sticker, so put the link on the clipboard first (while the tap still counts).
    const copied = await copyLink('https://urinal.app');
    try {
      const puckSvg = document.querySelector('.results-card .puck, .puck')?.outerHTML ?? null;
      const blob = await drawStoryImage(record, { clears, total: ROUNDS_PER_DAY, title: rankTitle(clears), puckSvg, site: 'urinal.app' });
      const file = new File([blob], `urinal-${record.number}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        if (copied) toast('urinal.app copied. Add a Link sticker and paste.', { tone: 'success' });
        // The link rides along: Instagram ignores it, Messages and other chats show it under the picture.
        await navigator.share({ files: [file], title: `Urinal #${record.number}`, text: 'https://urinal.app' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('Image saved. Post it from your photos.', { tone: 'success' });
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) toast('Couldn’t make the image.', { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="default" onClick={onClick} disabled={busy}>
      {busy ? 'Making it…' : 'Share to story'}
    </Button>
  );
}

export function DailyShare({ record, variant = 'primary' }: { record: DailyRecord; variant?: 'primary' | 'default' }) {
  const text = useMemo(() => buildShareText(record, routeUrl({ name: 'daily' })), [record]);
  // A square card rides along with the text where the share sheet takes files (Messages shows it as a picture).
  const image = async () => {
    const clears = clearsIn(record.results);
    const puckSvg = document.querySelector('.results-card .puck, .puck')?.outerHTML ?? null;
    const blob = await drawCardImage(record, { clears, total: ROUNDS_PER_DAY, title: rankTitle(clears), puckSvg, site: 'urinal.app' });
    return new File([blob], `urinal-${record.number}.png`, { type: 'image/png' });
  };
  return <ShareButton text={text} title={`Urinal #${record.number}`} label="Share result" variant={variant} image={record.finished ? image : undefined} />;
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
