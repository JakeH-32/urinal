// The hydration chart: display meta for each Grade. Shared by scene, UI and share text.
import type { Grade } from './types';

/** Best → worst. */
export const GRADE_ORDER: readonly Grade[] = ['clear', 'straw', 'amber', 'doctor'];

export interface GradeMeta {
  label: string;
  /** Share-grid square. */
  emoji: string;
  /** Tile fill and readable text color on it. */
  color: string;
  ink: string;
  /** One-line legend text. */
  blurb: string;
}

export const GRADES: Record<Grade, GradeMeta> = {
  clear: { label: 'Clear', emoji: '⬜', color: '#eef8fb', ink: '#1d3557', blurb: 'The urinal code’s answer. Hydrated.' },
  straw: { label: 'Lemonade', emoji: '🟨', color: '#f2df6b', ink: '#3d3200', blurb: 'Code yellow. Legal, not the best spot.' },
  amber: { label: 'Apple Juice', emoji: '🟧', color: '#e39b17', ink: '#2b1a00', blurb: 'Broke the urinal code.' },
  doctor: { label: 'See a Doctor', emoji: '🟫', color: '#8a4b0f', ink: '#fff4e0', blurb: 'Broke the urinal code badly.' },
};

export const isClear = (g: Grade) => g === 'clear';
