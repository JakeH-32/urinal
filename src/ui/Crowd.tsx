// Crowd stats: how everyone else answered. Presentational only; data comes from useDayCrowd (src/net).
import type { ReactNode } from 'react';
import type { DayCrowd, RoundCrowd } from '../net/community';
import { daySummaryText, reviewCrowdText, roundCrowdText } from '../net/crowdText';
import './crowd.css';

/** Bold the numbers ("38%", "#7") so the line scans. */
function emphasize(text: string): ReactNode[] {
  return text.split(/(<1%|\d+%|#\d+)/).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));
}

/** One line under the round verdict, e.g. "38% of players picked this spot. Most went with #7 (60%)." */
export function RoundCrowdLine({ crowd, pick, greens }: { crowd: RoundCrowd; pick: number; greens: number[] }) {
  const text = roundCrowdText(crowd, pick, greens);
  if (!text) return null;
  return <p className="crowd-line">{emphasize(text)}</p>;
}

/** Results card: "Better hydrated than 72% of players today" plus a small player-count note. */
export function DayCrowdSummary({ crowd, points }: { crowd: DayCrowd; points: number }) {
  const { main, note } = daySummaryText(crowd, points);
  return (
    <div className="crowd-summary">
      <p className="crowd-summary-main">{emphasize(main)}</p>
      {note && <p className="crowd-summary-note">{note}</p>}
    </div>
  );
}

/** One review row: "You: #4 · Most: #7 (80%)". Nothing when there's no data for that round. */
export function ReviewCrowd({ crowd, pick }: { crowd: RoundCrowd | null; pick: number }) {
  if (!crowd) return null;
  const text = reviewCrowdText(crowd, pick);
  if (!text) return null;
  return <span className="crowd-review">{emphasize(text)}</span>;
}
