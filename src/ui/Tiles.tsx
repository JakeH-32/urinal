import type { CSSProperties } from 'react';
import type { Grade, RoundResult } from '../types';
import { GRADES } from '../grades';

/** Small glyph drawn on each tile so grades never rely on color alone. */
export const GRADE_GLYPH: Record<Grade, string> = { clear: '✓', straw: '·', amber: '!', doctor: '✚' };

/** Inline colors for a grade swatch (fill + ink from src/grades.ts). */
export function gradeStyle(grade: Grade): CSSProperties {
  return { ['--g-fill' as string]: GRADES[grade].color, ['--g-ink' as string]: GRADES[grade].ink };
}

export interface TileProps {
  grade?: Grade;
  /** Shown in an empty tile (e.g. the round number). */
  label?: string;
  active?: boolean;
  /** Play the flip-in animation when the tile mounts with a grade. */
  flip?: boolean;
  size?: 'sm' | 'md';
}

export function Tile({ grade, label, active, flip, size = 'md' }: TileProps) {
  const cls = ['tile', `tile--${size}`, grade ? `tile--${grade}` : 'tile--empty', active ? 'is-active' : '', flip && grade ? 'tile--flip' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span
      className={cls}
      style={grade ? gradeStyle(grade) : undefined}
      role="img"
      aria-label={grade ? GRADES[grade].label : label ? `Round ${label}, not played` : 'Not played'}
    >
      <span aria-hidden="true">{grade ? GRADE_GLYPH[grade] : label}</span>
    </span>
  );
}

export interface TileRowProps {
  results: readonly RoundResult[];
  /** Total slots (6 for a daily). */
  total?: number;
  /** Index of the round in play (outlined). */
  activeIndex?: number;
  /** Index whose tile should flip in. */
  flipIndex?: number;
  numbered?: boolean;
  size?: 'sm' | 'md';
}

export function TileRow({ results, total = 6, activeIndex, flipIndex, numbered, size = 'md' }: TileRowProps) {
  return (
    <div className={`tile-row tile-row--${size}`}>
      {Array.from({ length: total }, (_, i) => {
        const grade = results[i]?.grade;
        return (
          <Tile
            key={`${i}-${grade ?? 'empty'}`}
            grade={grade}
            label={numbered ? String(i + 1) : undefined}
            active={i === activeIndex && !grade}
            flip={i === flipIndex}
            size={size}
          />
        );
      })}
    </div>
  );
}
