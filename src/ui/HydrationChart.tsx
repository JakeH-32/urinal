// The hydration chart: Clear at the top, See a Doctor at the bottom. Krillion-style category legend.
import type { Grade } from '../types';
import { GRADES, GRADE_ORDER } from '../grades';
import { GRADE_GLYPH, gradeStyle } from './Tiles';
import { GradeUrinal } from './GradeUrinal';

export interface HydrationChartProps {
  /** Compact: one line per grade, no blurbs. */
  compact?: boolean;
  /** Optional count shown at the right of each row (e.g. today's picks per grade). */
  counts?: Record<Grade, number>;
  title?: string;
  /** Draw a small grade urinal in place of each swatch. */
  art?: boolean;
}

export function HydrationChart({ compact, counts, title = 'Hydration chart', art }: HydrationChartProps) {
  return (
    <figure className={`hydration${compact ? ' hydration--compact' : ''}${art ? ' hydration--art' : ''}`}>
      <figcaption className="hydration-title">{title}</figcaption>
      <ol className="hydration-list">
        {GRADE_ORDER.map((g) => (
          <li key={g} className={`hydration-row hydration-row--${g}`} style={gradeStyle(g)}>
            {art ? (
              <span className="hydration-art" aria-hidden="true">
                <GradeUrinal grade={g} size={34} label={false} animate={false} />
              </span>
            ) : (
              <span className="hydration-swatch" aria-hidden="true">
                {GRADE_GLYPH[g]}
              </span>
            )}
            <span className="hydration-text">
              <span className="hydration-label">{GRADES[g].label}</span>
              {!compact && <span className="hydration-blurb">{GRADES[g].blurb}</span>}
            </span>
            {counts && <span className="hydration-count">×{counts[g]}</span>}
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** One horizontal bar split by grade, for lifetime counts. */
export function HydrationBar({ counts }: { counts: Record<Grade, number> }) {
  const total = GRADE_ORDER.reduce((n, g) => n + counts[g], 0);
  if (total === 0) return <p className="muted small">No picks yet.</p>;
  return (
    <div className="hbar-wrap">
      <div className="hbar" role="img" aria-label={GRADE_ORDER.map((g) => `${GRADES[g].label}: ${counts[g]}`).join(', ')}>
        {GRADE_ORDER.filter((g) => counts[g] > 0).map((g) => (
          <span key={g} className="hbar-seg" style={{ ...gradeStyle(g), flexGrow: counts[g] }} />
        ))}
      </div>
      <ul className="hbar-legend">
        {GRADE_ORDER.map((g) => (
          <li key={g}>
            <span className="hbar-dot" style={gradeStyle(g)} aria-hidden="true" />
            {GRADES[g].label} <strong>{counts[g]}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
