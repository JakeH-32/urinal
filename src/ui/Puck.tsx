// Puck, the mascot: a pink urinal cake with a deadpan face, stubby arms and legs. Same ink-outline
// style as the scene. One expression per moment (see PuckMood). Pure SVG, no state.
import type { ReactElement } from 'react';
import type { Grade } from '../types';

export type PuckMood =
  | 'deadpan' // idle / hello
  | 'approves' // Clear
  | 'eyebrow' // Lemonade
  | 'wince' // Apple Juice
  | 'horrified' // See a Doctor
  | 'thinking' // warm-up
  | 'disgusted' // puddle
  | 'sleeping' // countdown
  | 'glare' // talker / boss
  | 'delighted'; // perfect day

const INK = '#1d2b44';
const PINK = '#e88aac';
const LIGHT = '#f6b3cb';
const DARK = '#d97399';
const TOP = 80;
const H = 96;
const CX = 156;
const BOT = TOP + H;
const FY = TOP + 76;
const L = 126;
const R = 186;
const AY = TOP + 70;

type Arm = 'down' | 'thumbs' | 'cheeks' | 'chin' | 'limp' | 'hips' | 'wave' | 'nose';

const POSE: Record<PuckMood, { eyes: string; mouth: string; arms: Arm; sit?: boolean; extra?: 'sleep' | 'sweat' | 'stink' }> = {
  deadpan: { eyes: 'deadpan', mouth: 'flat', arms: 'down' },
  // Hands on hips, not a thumbs-up: at small sizes a raised single digit reads as the wrong finger.
  approves: { eyes: 'content', mouth: 'smirk', arms: 'hips' },
  eyebrow: { eyes: 'brow', mouth: 'flat', arms: 'hips' },
  wince: { eyes: 'squeeze', mouth: 'zig', arms: 'down', extra: 'sweat' },
  horrified: { eyes: 'wide', mouth: 'O', arms: 'cheeks' },
  thinking: { eyes: 'side', mouth: 'side', arms: 'chin' },
  disgusted: { eyes: 'squint', mouth: 'wavy', arms: 'nose', extra: 'stink' },
  sleeping: { eyes: 'sleep', mouth: 'none', arms: 'limp', sit: true, extra: 'sleep' },
  glare: { eyes: 'glare', mouth: 'frown', arms: 'hips' },
  delighted: { eyes: 'sparkle', mouth: 'grin', arms: 'wave' },
};

const stroke = (w = 6) => ({ stroke: INK, strokeWidth: w, strokeLinecap: 'round' as const, fill: 'none' });

function Hand({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={11} fill={LIGHT} stroke={INK} strokeWidth={5} />;
}

/** Arms behind the body, and hands that reach in front of it (chin, nose) drawn after it. */
function arms(pose: Arm): { back: ReactElement; front?: ReactElement } {
  const s = stroke(7);
  const left = (
    <>
      <path d={`M62 ${AY} q-26 16 -26 44`} {...s} />
      <Hand x={36} y={AY + 48} />
    </>
  );
  switch (pose) {
    case 'thumbs':
      return {
        back: (
          <>
            {left}
            <path d={`M250 ${AY} q34 -6 40 -44`} {...s} />
            <Hand x={290} y={AY - 48} />
            <path d={`M290 ${AY - 60} v-14`} {...s} />
          </>
        ),
      };
    case 'cheeks':
      return {
        back: <path d={`M62 ${AY} q-30 -4 -10 34 M250 ${AY} q30 -4 10 34`} {...s} />,
        front: (
          <>
            <Hand x={58} y={AY + 36} />
            <Hand x={254} y={AY + 36} />
          </>
        ),
      };
    case 'hips':
      return {
        back: (
          <>
            <path d={`M62 ${AY} q-34 6 -6 34 M250 ${AY} q34 6 6 34`} {...s} />
            <Hand x={58} y={AY + 36} />
            <Hand x={254} y={AY + 36} />
          </>
        ),
      };
    case 'chin':
      return {
        back: left,
        front: (
          <>
            <path d={`M250 ${AY} q20 26 -50 36`} {...s} />
            <Hand x={196} y={AY + 34} />
          </>
        ),
      };
    case 'nose':
      return {
        back: left,
        front: (
          <>
            <path d={`M250 ${AY} q18 -24 -54 -16`} {...s} />
            <Hand x={192} y={AY - 18} />
          </>
        ),
      };
    case 'limp':
      return {
        back: (
          <>
            <path d={`M62 ${AY} q-20 30 -14 56 M250 ${AY} q20 30 14 56`} {...s} />
            <Hand x={48} y={AY + 60} />
            <Hand x={264} y={AY + 60} />
          </>
        ),
      };
    case 'wave':
      return {
        back: (
          <>
            {left}
            <path d={`M250 ${AY} q36 -10 34 -56`} {...s} />
            <Hand x={284} y={AY - 60} />
            <path d={`M300 ${AY - 78} q8 6 6 16 M306 ${AY - 60} q8 4 8 12`} {...stroke(3)} />
          </>
        ),
      };
    default:
      return {
        back: (
          <>
            {left}
            <path d={`M250 ${AY} q26 16 26 44`} {...s} />
            <Hand x={276} y={AY + 48} />
          </>
        ),
      };
  }
}

function Eyes({ kind }: { kind: string }) {
  const k = stroke();
  const dots = (
    <>
      <circle cx={L} cy={FY} r={7} fill={INK} />
      <circle cx={R} cy={FY} r={7} fill={INK} />
    </>
  );
  switch (kind) {
    case 'content':
      return <path d={`M${L - 12} ${FY + 2} q12 -12 24 0 M${R - 12} ${FY + 2} q12 -12 24 0`} {...k} />;
    case 'brow':
      return (
        <>
          {dots}
          <path d={`M${L - 12} ${FY - 6} H${L + 12} M${R - 12} ${FY - 22} q12 -8 24 0`} {...k} />
        </>
      );
    case 'squeeze':
      return <path d={`M${L - 12} ${FY - 8} L${L + 8} ${FY} L${L - 12} ${FY + 8} M${R + 12} ${FY - 8} L${R - 8} ${FY} L${R + 12} ${FY + 8}`} {...k} />;
    case 'wide':
      return (
        <>
          <circle cx={L} cy={FY} r={14} fill="#fff" stroke={INK} strokeWidth={5} />
          <circle cx={R} cy={FY} r={14} fill="#fff" stroke={INK} strokeWidth={5} />
          <circle cx={L} cy={FY} r={4} fill={INK} />
          <circle cx={R} cy={FY} r={4} fill={INK} />
          <path d={`M${L - 12} ${FY - 26} q12 -8 24 -2 M${R - 12} ${FY - 28} q12 -6 24 2`} {...k} />
        </>
      );
    case 'sleep':
      return <path d={`M${L - 12} ${FY} q12 8 24 0 M${R - 12} ${FY} q12 8 24 0`} {...k} />;
    case 'side':
      return (
        <>
          <circle cx={L + 6} cy={FY - 4} r={7} fill={INK} />
          <circle cx={R + 6} cy={FY - 4} r={7} fill={INK} />
          <path d={`M${L - 12} ${FY - 14} H${L + 12} M${R - 12} ${FY - 18} L${R + 12} ${FY - 14}`} {...k} />
        </>
      );
    case 'squint':
      return <path d={`M${L - 12} ${FY} H${L + 12} M${R - 12} ${FY} H${R + 12} M${L - 12} ${FY - 12} L${L + 12} ${FY - 6} M${R + 12} ${FY - 12} L${R - 12} ${FY - 6}`} {...k} />;
    case 'glare':
      return (
        <>
          <circle cx={L} cy={FY + 2} r={7} fill={INK} />
          <circle cx={R} cy={FY + 2} r={7} fill={INK} />
          <path d={`M${L - 12} ${FY - 14} L${L + 12} ${FY - 6} M${R + 12} ${FY - 14} L${R - 12} ${FY - 6}`} {...k} />
        </>
      );
    case 'sparkle': {
      const star = 'l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z';
      return <path d={`M${L} ${FY - 10} ${star} M${R} ${FY - 10} ${star}`} fill={INK} />;
    }
    default:
      return (
        <>
          {dots}
          <path d={`M${L - 12} ${FY - 6} H${L + 12} M${R - 12} ${FY - 6} H${R + 12}`} {...k} />
        </>
      );
  }
}

function Mouth({ kind }: { kind: string }) {
  const k = stroke();
  const my = FY + 28;
  switch (kind) {
    case 'smirk':
      return <path d={`M142 ${my} q16 6 30 -6`} {...k} />;
    case 'zig':
      return <path d={`M138 ${my} l8 -6 l8 6 l8 -6 l8 6`} {...k} />;
    case 'O':
      return <ellipse cx={156} cy={my + 2} rx={9} ry={12} fill={INK} />;
    case 'side':
      return <path d={`M148 ${my} H168 q6 0 8 -6`} {...k} />;
    case 'wavy':
      return (
        <>
          <path d={`M138 ${my} q6 -6 12 0 t12 0 t12 0`} {...k} />
          <path d={`M160 ${my + 2} q4 10 10 4`} fill="#e4577f" stroke={INK} strokeWidth={3} />
        </>
      );
    case 'frown':
      return <path d={`M142 ${my + 4} q14 -10 28 0`} {...k} />;
    case 'grin':
      return <path d={`M140 ${my - 4} q16 18 32 0z`} fill="#fff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
    case 'none':
      return null;
    default:
      return <path d={`M142 ${my} H170`} {...k} />;
  }
}

const HOLES: readonly (readonly [number, number])[] = [
  [-40, -8], [-12, -14], [16, -14], [44, -8], [-28, 8], [0, 4], [28, 8], [-56, 4], [56, 4],
];

/** Puck, the mascot. `size` is the rendered width in px. */
export function Puck({ mood = 'deadpan', size = 96, className, perched }: { mood?: PuckMood; size?: number; className?: string; perched?: boolean }) {
  const p = POSE[mood];
  const a = arms(p.arms);
  const y0 = BOT + 30;
  return (
    <svg className={['puck', className].filter(Boolean).join(' ')} viewBox="0 0 330 330" overflow="visible" width={size} height={size} aria-hidden="true">
      <g transform="translate(9,8)">
        {!perched && <ellipse cx={CX} cy={BOT + 80} rx={90} ry={10} fill={INK} opacity={0.12} />}
        <g className="puck-bob">
        {perched ? (
          // Sitting on an edge: legs hang straight down over the front and swing, one after the other.
          <>
            <g className="puck-leg puck-leg-l">
              <path d={`M126 ${y0 - 6} V${y0 + 92}`} {...stroke(8)} />
              <ellipse cx={132} cy={y0 + 96} rx={16} ry={9} fill={INK} />
            </g>
            <g className="puck-leg puck-leg-r">
              <path d={`M186 ${y0 - 6} V${y0 + 92}`} {...stroke(8)} />
              <ellipse cx={180} cy={y0 + 96} rx={16} ry={9} fill={INK} />
            </g>
          </>
        ) : p.sit ? (
          <>
            <path d={`M124 ${y0} q-6 14 -22 18 M188 ${y0} q6 14 22 18`} {...stroke(7)} />
            <ellipse cx={96} cy={y0 + 20} rx={12} ry={7} fill={INK} />
            <ellipse cx={216} cy={y0 + 20} rx={12} ry={7} fill={INK} />
          </>
        ) : (
          <>
            <path d={`M128 ${y0} V${y0 + 36} M184 ${y0} V${y0 + 36}`} {...stroke(7)} />
            <ellipse cx={122} cy={y0 + 40} rx={15} ry={8} fill={INK} />
            <ellipse cx={190} cy={y0 + 40} rx={15} ry={8} fill={INK} />
          </>
        )}
        {a.back}
        <path d={`M60 ${TOP} v${H} a96 34 0 0 0 192 0 v-${H}`} fill={PINK} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d={`M66 ${TOP + 8} v${H - 12} a90 30 0 0 0 26 22 v-${H - 2}z`} fill={DARK} opacity={0.5} />
        <ellipse cx={CX} cy={TOP} rx={96} ry={34} fill={LIGHT} stroke={INK} strokeWidth={6} />
        {HOLES.map(([dx, dy], k) => (
          <ellipse key={k} cx={CX + dx} cy={TOP + dy} rx={6} ry={3} fill="#d76f96" />
        ))}
        <g className="puck-eyes">
          <Eyes kind={p.eyes} />
        </g>
        <Mouth kind={p.mouth} />
        {a.front}
        {p.extra === 'sleep' && (
          <>
            <text x={236} y={TOP - 20} fontFamily="Arial" fontWeight={900} fontSize={30} fill={INK}>
              z
            </text>
            <text x={258} y={TOP - 44} fontFamily="Arial" fontWeight={900} fontSize={22} fill={INK}>
              z
            </text>
          </>
        )}
        {p.extra === 'sweat' && <path d={`M232 ${FY - 30} q8 12 0 18 q-8 -6 0 -18z`} fill="#9ed3f5" stroke={INK} strokeWidth={3} />}
        {p.extra === 'stink' && <path d={`M210 ${FY - 20} q8 -8 0 -16 q-8 -8 0 -16`} stroke="#6f8418" strokeWidth={4} fill="none" strokeLinecap="round" />}
        </g>
      </g>
    </svg>
  );
}

/** Puck's face for a day's score: delighted at perfect, horrified near zero. */
export function puckForClears(clears: number, total: number): PuckMood {
  if (clears >= total) return 'delighted';
  if (clears >= total - 1) return 'approves';
  if (clears >= Math.ceil(total / 2)) return 'eyebrow';
  if (clears >= 1) return 'wince';
  return 'horrified';
}

/** Puck's face for a single grade. */
export function puckForGrade(grade: Grade): PuckMood {
  return grade === 'clear' ? 'approves' : grade === 'straw' ? 'eyebrow' : grade === 'amber' ? 'wince' : 'horrified';
}

/** How Puck moves into a new face: a hop for most, a jolt back for See a Doctor, a nod for approval. */
function reaction(mood: PuckMood): string {
  if (mood === 'horrified' || mood === 'disgusted') return 'jolt';
  if (mood === 'approves' || mood === 'eyebrow') return 'nod';
  if (mood === 'sleeping') return 'droop';
  return 'hop';
}

/**
 * Puck perched on the top edge of whatever he's placed in (the parent needs position: relative):
 * idle bob and blinks, and a little hop / jolt / nod each time his face changes.
 */
export function PerchPuck({ mood, size = 64, inside, at }: { mood: PuckMood; size?: number; inside?: boolean; at?: { right: number; top: number } | null }) {
  return (
    <span key={mood} className={`puck-perch${inside ? ' puck-perch--inside' : ''} puck-react-${reaction(mood)}${mood === 'sleeping' ? ' is-asleep' : ''}`} style={{ ['--puck-size' as string]: `${size}px`, ...(at ? { right: at.right, top: at.top } : {}) }}>
      <Puck mood={mood} size={size} perched={!inside} />
    </span>
  );
}
