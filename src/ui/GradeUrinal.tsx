// The grade, illustrated: a wall-hung urinal filled to the brim in the grade's color, plus one
// detail per grade. Same flat-cartoon style as the scene (src/scene/Fixtures.tsx). Fixture only.
import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Grade } from '../types';
import { GRADES } from '../grades';
import { useReducedMotion } from './hooks';

export interface GradeUrinalProps {
  grade: Grade;
  /** Art height (and width) in px. */
  size?: number;
  /** Pop-in, slosh and idle loops. Always off under reduced motion. */
  animate?: boolean;
  /** Grade label under the art. */
  label?: boolean;
  className?: string;
}

const INK = '#1d2b44';
const PORCELAIN = '#ffffff';
const SHADE = '#e1e8ef';
const CHROME = '#c9d2db';

/** Liquid gradient (top → bottom) plus the surface line. Clear's chart color is near-white, so it gets water blue. */
const LIQUID: Record<Grade, { top: string; bottom: string; edge: string }> = {
  clear: { top: '#d4f1fb', bottom: '#8ccfe9', edge: '#4aa3c8' },
  straw: { top: GRADES.straw.color, bottom: '#dcc43c', edge: '#b39a14' },
  amber: { top: GRADES.amber.color, bottom: '#c37b04', edge: '#965c00' },
  doctor: { top: GRADES.doctor.color, bottom: '#5c2f05', edge: '#3f1f02' },
};

/** Label text color: the grade's hue, dark enough to read on the page background. */
const LABEL_INK: Record<Grade, string> = {
  clear: '#2a6f97',
  straw: '#7a6400',
  amber: '#9a5800',
  doctor: GRADES.doctor.color,
};

// Geometry (viewBox 0 0 120 120): a shield-shaped bowl, a hood where the pipe enters, an open
// basin below it and a front lip. The surface sits right under the hood: brim-full.
const SURFACE_Y = 35;
const BODY = 'M40,20 L80,20 Q87,20 88,28 L93,80 Q95,108 60,114 Q25,108 27,80 L32,28 Q33,20 40,20 Z';
const CAVITY = 'M48,31 L72,31 Q79,31 79.8,38 L84,80 Q84,101 60,103 Q36,101 36,80 L40.2,38 Q41,31 48,31 Z';

/** Liquid body with a wavy top, longer than the bowl so it can drift one wavelength and loop. */
function liquidPath(): string {
  const half = 8;
  const amp = 1.6;
  let d = `M-24,${SURFACE_Y}`;
  for (let i = 0, x = -24; x < 144; i++, x += half) d += ` q${half / 2},${i % 2 ? amp * 2 : -amp * 2} ${half},0`;
  return `${d} L144,124 L-24,124 Z`;
}
const LIQUID_D = liquidPath();

function sparkle(cx: number, cy: number, r: number): string {
  const k = r * 0.22;
  return `M${cx},${cy - r} C${cx},${cy - k} ${cx + k},${cy} ${cx + r},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + r} C${cx},${cy + k} ${cx - k},${cy} ${cx - r},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - r} Z`;
}

/** Negative delays start each loop mid-cycle, so staggered loops never sit frozen first. */
const delay = (s: number): CSSProperties => ({ animationDelay: `${-s}s` });

// ---------------------------------------------------------------- per-grade details

/** Clear: ice cubes bobbing at the brim. */
function IceCubes() {
  const cube = (x: number, y: number, s: number, rot: number, d: number) => (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <g className="gu-bob" style={delay(d)}>
        <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={2.2} fill="#f6fdff" fillOpacity={0.92} stroke={INK} strokeWidth={1.8} />
        <rect x={-s / 2 + 2.2} y={-s / 2 + 2.2} width={s - 4.4} height={s - 4.4} rx={1.2} fill="none" stroke="#a9def2" strokeWidth={1.2} />
        <path d={`M${-s / 2 + 2.6},${s / 2 - 3.5} L${-s / 2 + 2.6},${-s / 2 + 2.6} L${s / 2 - 4},${-s / 2 + 2.6}`} fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
      </g>
    </g>
  );
  return (
    <>
      {cube(50, 34.5, 11.5, -14, 0)}
      {cube(69.5, 35.5, 9.5, 17, 0.7)}
    </>
  );
}

/** Clear: a lemon wedge on the rim, like it's a drink. */
function LemonWedge() {
  const seg = [30, 60, 90, 120, 150].map((a) => {
    const t = (a * Math.PI) / 180;
    return `M0,0 L${(7.4 * Math.cos(t)).toFixed(2)},${(7.4 * Math.sin(t)).toFixed(2)}`;
  });
  return (
    <g transform="translate(88,22) rotate(24)">
      <path d="M-11.5,0 A11.5,11.5 0 0 0 11.5,0 Z" fill="#f5c400" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M-9.4,0 A9.4,9.4 0 0 0 9.4,0 Z" fill="#fffbe6" />
      <path d="M-8.1,0 A8.1,8.1 0 0 0 8.1,0 Z" fill="#ffe45c" />
      <path d={seg.join(' ')} stroke="#fffbe6" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M-11.5,0 L11.5,0" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Sparkles() {
  const stars: [number, number, number][] = [
    [15, 22, 7.5],
    [108, 58, 6],
    [13, 62, 4.8],
    [105, 98, 4.4],
  ];
  return (
    <g>
      {stars.map(([x, y, r], i) => (
        <path key={i} className="gu-twinkle" style={delay(i * 0.45)} d={sparkle(x, y, r)} fill="#eaf8ff" stroke="#2a6f97" strokeWidth={1.5} strokeLinejoin="round" />
      ))}
    </g>
  );
}

/** Straw: one urinal cake, floating. */
function UrinalCake() {
  const holes: [number, number][] = [
    [-6, -1.6],
    [-1, -0.2],
    [4.5, -1.8],
    [0, -3.4],
    [7.5, -0.3],
  ];
  return (
    <g transform="translate(60,34.5) rotate(-7)">
      <g className="gu-bob">
        <path d="M-12.5,-1 L-12.5,2.6 A12.5,4.2 0 0 0 12.5,2.6 L12.5,-1 Z" fill="#e8689c" stroke={INK} strokeWidth={1.7} strokeLinejoin="round" />
        <ellipse cx={0} cy={-1} rx={12.5} ry={4.2} fill="#ff9cc4" stroke={INK} strokeWidth={1.7} />
        {holes.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={1.25} ry={0.65} fill="#d24f86" />
        ))}
      </g>
    </g>
  );
}

/** Amber: a fly, belly up, X eyes. */
function DeadFly() {
  const legs = [-4, 1.5, 7]
    .map((x, i) => {
      const dir = i === 1 ? 0.6 : i === 0 ? -1 : 1;
      return `M${x},-4.6 l${dir * 1.6},-5 l${dir * 2.2 + (i === 1 ? 1.4 : 0)},-1.2`;
    })
    .concat(['M-1,-4.8 l-3.4,-3.6 l-1.6,-2.4', 'M4.5,-5 l2.6,-4.4 l2.6,-1.4'])
    .join(' ');
  const x = (cx: number, cy: number, s: number) => `M${cx - s},${cy - s} L${cx + s},${cy + s} M${cx + s},${cy - s} L${cx - s},${cy + s}`;
  return (
    <g transform="translate(61,33.5) scale(1.2)">
      <g className="gu-drift">
        <ellipse cx={-3} cy={3.6} rx={7} ry={2.8} transform="rotate(-14,-3,3.6)" fill="#ffffff" fillOpacity={0.85} stroke={INK} strokeWidth={1.3} />
        <ellipse cx={8.5} cy={3.6} rx={7} ry={2.8} transform="rotate(14,8.5,3.6)" fill="#ffffff" fillOpacity={0.85} stroke={INK} strokeWidth={1.3} />
        <path d={legs} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx={2.5} cy={0} rx={9} ry={5.6} fill="#323a46" stroke={INK} strokeWidth={1.6} />
        <path d="M-1,-3.6 Q2.5,-5 6,-3.6" fill="none" stroke="#6d7888" strokeWidth={1.2} strokeLinecap="round" />
        <circle cx={-8.6} cy={-0.6} r={6} fill="#323a46" stroke={INK} strokeWidth={1.6} />
        <path d={`${x(-11, -1.4, 1.7)} ${x(-6.4, -1.8, 1.7)}`} stroke="#ffffff" strokeWidth={1.3} strokeLinecap="round" />
      </g>
    </g>
  );
}

/** Amber: a wet floor sign, leaning on the fixture. */
function WetFloorSign() {
  return (
    <g>
      <ellipse cx={19} cy={115.4} rx={15} ry={1.6} fill="rgba(29,43,68,0.18)" />
      <g transform="translate(5,115) rotate(8)">
        <path d="M3.5,-41 L21.5,-41 Q23.5,-41 23.8,-39 L27,-0.5 L-2,-0.5 L1.2,-39 Q1.5,-41 3.5,-41 Z" fill="#ffd23f" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <rect x={8.5} y={-38} width={8} height={3.4} rx={1.7} fill={INK} />
        <path d="M12.5,-31 L20.2,-17.6 L4.8,-17.6 Z" fill="#ffe680" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        <rect x={11.6} y={-27.6} width={1.8} height={5.6} rx={0.9} fill={INK} />
        <circle cx={12.5} cy={-19.9} r={1.05} fill={INK} />
        <rect x={4.6} y={-13.4} width={15.8} height={2.2} rx={1.1} fill={INK} opacity={0.8} />
        <rect x={5.6} y={-8.8} width={13.8} height={2.2} rx={1.1} fill={INK} opacity={0.8} />
      </g>
    </g>
  );
}

/** Doctor: it's bubbling. */
function Bubbles() {
  const bubbles: [number, number, number][] = [
    [44, 34.6, 3.3],
    [52.5, 33.2, 2.1],
    [61, 35, 1.7],
    [69, 34, 3.9],
    [77.5, 34.8, 2.4],
  ];
  return (
    <g>
      {bubbles.map(([x, y, r], i) => (
        <g key={i} className="gu-bubble" style={delay(i * 0.37)}>
          <circle cx={x} cy={y} r={r} fill="#b8732c" stroke={INK} strokeWidth={1.4} />
          <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.32} fill="#fff" opacity={0.85} />
        </g>
      ))}
    </g>
  );
}

function Steam() {
  const wisps: [number, number, number][] = [
    [75, 30, 11],
    [87, 29, 21],
    [99.5, 44, 16],
  ];
  return (
    <g fill="none" stroke="#a3afba" strokeWidth={3.2} strokeLinecap="round">
      {wisps.map(([x, y, h], i) => (
        <path key={i} className="gu-steam" style={delay(i * 0.6)} d={`M${x},${y} q-4,${-h / 4} 0,${-h / 2} t0,${-h / 2}`} />
      ))}
    </g>
  );
}

/** Doctor: a stethoscope draped over the rim. */
function Stethoscope() {
  const tube = 'M39,21 C37,28 30,30 26.5,40 C23,52 25,68 22,80';
  const ears = 'M33,7.5 C32,15 34,20 39,21 M45,7.5 C46,15 44,20 39,21';
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={ears} stroke={INK} strokeWidth={4.6} />
      <path d={ears} stroke={CHROME} strokeWidth={2.4} />
      <circle cx={33} cy={6.6} r={2.4} fill="#3a4450" stroke={INK} strokeWidth={1.2} />
      <circle cx={45} cy={6.6} r={2.4} fill="#3a4450" stroke={INK} strokeWidth={1.2} />
      <path d={tube} stroke={INK} strokeWidth={6.2} />
      <path d={tube} stroke="#2a9d8f" strokeWidth={3.6} />
      <rect x={20.1} y={80} width={3.8} height={4.5} fill={CHROME} stroke={INK} strokeWidth={1.3} />
      <circle cx={22} cy={89.5} r={6.6} fill={CHROME} stroke={INK} strokeWidth={2} />
      <circle cx={22} cy={89.5} r={3.6} fill="#eef3f7" stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

/** Ripples around whatever floats, drawn inside the liquid. */
function Ripples({ cx, rx }: { cx: number; rx: number }) {
  return (
    <g fill="none" stroke="#fff" strokeWidth={1.2}>
      <ellipse cx={cx} cy={SURFACE_Y + 2.5} rx={rx} ry={2.4} opacity={0.6} />
      <ellipse cx={cx} cy={SURFACE_Y + 3.6} rx={rx + 7} ry={3.4} opacity={0.35} />
    </g>
  );
}

// ---------------------------------------------------------------- component

export function GradeUrinal({ grade, size = 96, animate = true, label = true, className }: GradeUrinalProps) {
  const reduced = useReducedMotion();
  const anim = animate && !reduced;
  const uid = `gu${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const liq = LIQUID[grade];
  const meta = GRADES[grade];

  let floaters: ReactNode = null;
  let ripples: ReactNode = null;
  let props: ReactNode = null;
  switch (grade) {
    case 'clear':
      floaters = <IceCubes />;
      props = (
        <>
          <LemonWedge />
          <Sparkles />
        </>
      );
      break;
    case 'straw':
      floaters = <UrinalCake />;
      ripples = <Ripples cx={60} rx={16} />;
      break;
    case 'amber':
      floaters = <DeadFly />;
      ripples = <Ripples cx={60} rx={17} />;
      props = <WetFloorSign />;
      break;
    case 'doctor':
      floaters = <Bubbles />;
      props = (
        <>
          <Steam />
          <Stethoscope />
        </>
      );
      break;
  }

  const cls = ['gu', `gu--${grade}`, anim ? 'gu--anim' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} role="img" aria-label={meta.label} style={{ ['--gu-size' as string]: `${size}px` }}>
      <svg className="gu-art" viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}-liq`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={liq.top} />
            <stop offset="1" stopColor={liq.bottom} />
          </linearGradient>
          <clipPath id={`${uid}-cav`}>
            <path d={CAVITY} />
          </clipPath>
        </defs>

        {/* the wall behind it: a bathroom tile, so it reads as a fixture and not a jar */}
        <g>
          <clipPath id={`${uid}-wall`}>
            <rect x={3} y={3} width={114} height={114} rx={16} />
          </clipPath>
          <g clipPath={`url(#${uid}-wall)`}>
            <rect x={0} y={0} width={120} height={120} fill="#dde7ed" />
            <path d="M0,27 H120 M0,54 H120 M0,81 H120 M26,0 V108 M52,0 V108 M78,0 V108 M104,0 V108" stroke="#f3f7f9" strokeWidth={1.6} />
            <rect x={0} y={108} width={120} height={12} fill="#c3d1da" />
            <path d="M0,108 H120" stroke="#a9bac6" strokeWidth={1.6} />
          </g>
        </g>

        {/* plumbing */}
        <g stroke={INK} strokeLinejoin="round">
          <rect x={49} y={0.5} width={22} height={6} rx={2} fill={CHROME} strokeWidth={2.2} />
          <rect x={55.5} y={5} width={9} height={18} fill={CHROME} strokeWidth={2.2} />
          <rect x={48} y={7.5} width={24} height={13} rx={6} fill={CHROME} strokeWidth={2.4} />
          <path d="M71,13 L81,8.5" fill="none" strokeWidth={4} strokeLinecap="round" />
        </g>

        {/* porcelain */}
        <path d={BODY} fill={PORCELAIN} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M84.5,29 L89,78 Q90,101 70,108" fill="none" stroke={SHADE} strokeWidth={5} strokeLinecap="round" />
        <path d={CAVITY} fill={SHADE} />

        {/* the liquid, to the brim */}
        <g clipPath={`url(#${uid}-cav)`}>
          <g className="gu-slosh">
            <path className="gu-wave" d={LIQUID_D} fill={`url(#${uid}-liq)`} stroke={liq.edge} strokeWidth={1.6} />
            <ellipse cx={60} cy={86} rx={6.5} ry={2.2} fill="rgba(0,0,0,0.16)" />
            <path d="M45,44 Q42.5,62 43.5,78" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
            {ripples}
          </g>
        </g>
        <path d={CAVITY} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        {/* front lip */}
        <path d="M33,96 Q60,91 87,96 Q88,105 60,108.5 Q32,105 33,96 Z" fill={PORCELAIN} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />

        <g className="gu-slosh">{floaters}</g>
        {props}
      </svg>
      {label && (
        <span className="gu-label" aria-hidden="true" style={{ color: LABEL_INK[grade] }}>
          {meta.label}
        </span>
      )}
    </span>
  );
}
