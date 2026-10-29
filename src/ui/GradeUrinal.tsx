// The grade, illustrated: a wall-hung urinal with a pool in its basin, plus one gag per grade.
// Physics: a urinal is open at the front, so the pool can only rise to the front lip. The surface is
// a level ellipse (seen from a little above) and anything past the lip runs down the front, drips
// off the lowest point and puddles on the floor. Same flat-cartoon style as the scene
// (src/scene/Fixtures.tsx). Fixture only.
import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Grade } from '../types';
import { GRADES } from '../grades';
import { useReducedMotion } from './hooks';

export interface GradeUrinalProps {
  grade: Grade;
  /** Art height (and width) in px. */
  size?: number;
  /** Pop-in, slosh, spill and idle loops. Always off under reduced motion. */
  animate?: boolean;
  /** Grade label under the art. */
  label?: boolean;
  className?: string;
}

const INK = '#1d2b44';
const PORCELAIN = '#ffffff';
const SHADE = '#e1e8ef';
const CHROME = '#c9d2db';

/** Liquid colors: back of the surface (catches the light), front (the grade's hue), and the edge line. */
const LIQUID: Record<Grade, { top: string; bottom: string; edge: string }> = {
  clear: { top: '#b4e4f9', bottom: '#5db9ea', edge: '#2f8dbd' },
  straw: { top: '#f7e47c', bottom: '#e9cf3f', edge: '#a88f10' },
  amber: { top: '#f0b23c', bottom: '#c37b04', edge: '#965c00' },
  doctor: { top: GRADES.doctor.color, bottom: '#5c2f05', edge: '#3f1f02' },
};

/** Label text color: the grade's hue, dark enough to read on the page background. */
const LABEL_INK: Record<Grade, string> = {
  clear: '#2a6f97',
  straw: '#7a6400',
  amber: '#9a5800',
  doctor: GRADES.doctor.color,
};

// ---------------------------------------------------------------- geometry (viewBox 0 0 120 120)
// A shield-shaped shell hung on the wall (bottom at y 90, floor from y 98), an opening whose
// bottom edge is the front lip, and the basin behind the lip. The lip's top edge is the near half
// of the RIM ellipse: a level circle seen from a little above.

const FLOOR_Y = 98;
const BODY = 'M41,16 L79,16 Q86,16 87,23 L91.5,58 Q94,87 60,90 Q26,87 28.5,58 L33,23 Q34,16 41,16 Z';
const RIM = { cx: 60, cy: 62, rx: 24, ry: 12 };
const CAVITY = `M49,26 L71,26 Q78,26 78.8,33 L${RIM.cx + RIM.rx},${RIM.cy} A${RIM.rx},${RIM.ry} 0 0 1 ${RIM.cx - RIM.rx},${RIM.cy} L41.2,33 Q42,26 49,26 Z`;

interface Pool {
  cy: number;
  rx: number;
  ry: number;
}
/**
 * The level surface per grade. The basin narrows with depth, so a lower surface is a smaller
 * ellipse further down (same rx:ry, same viewing angle). Its front half disappears behind the lip.
 * Brim-full is exactly the rim ellipse: the surface can't go any higher, the rest goes over.
 */
const POOL: Record<Grade, Pool> = {
  clear: { cy: 69.5, rx: 16, ry: 8 },
  straw: { cy: 66, rx: 20.5, ry: 10.25 },
  amber: { cy: RIM.cy, rx: RIM.rx, ry: RIM.ry },
  doctor: { cy: RIM.cy, rx: RIM.rx, ry: RIM.ry },
};

const r2 = (n: number) => +n.toFixed(2);

/** y of the lip's top edge (the near half of the rim) at x. */
function lipY(x: number): number {
  const t = (x - RIM.cx) / RIM.rx;
  return RIM.cy + RIM.ry * Math.sqrt(Math.max(0, 1 - t * t));
}

/**
 * Liquid sheeting over the lip between x0 and x1: it wraps over the edge and hangs in drip
 * fingers [x, width, bottom y]. Open along the top, where it joins the pool, so only the sides and
 * the drips get an outline. Fingers need ~6 units between them and from the ends.
 */
function overflow(x0: number, x1: number, fingers: [number, number, number][]): string {
  const base = (x: number) => lipY(x) + 4.5;
  let d = `M${r2(x0)},${r2(lipY(x0) - 1.4)} C${r2(x0 + 2)},${r2(lipY(x0) + 0.2)} ${r2(x0 + 2.8)},${r2(lipY(x0) + 2.2)} ${r2(x0 + 3)},${r2(base(x0 + 3))}`;
  for (const [x, w, bottom] of fingers) {
    const l = x - w / 2;
    const r = x + w / 2;
    d += ` Q${r2(l - 1.2)},${r2(base(l) + 0.2)} ${r2(l)},${r2(base(l) + 2)}`;
    d += ` L${r2(l)},${r2(bottom - w / 2)} A${r2(w / 2)},${r2(w / 2)} 0 0 0 ${r2(r)},${r2(bottom - w / 2)} L${r2(r)},${r2(base(r) + 2)}`;
    d += ` Q${r2(r + 1.2)},${r2(base(r) + 0.2)} ${r2(r + 2.4)},${r2(base(r + 2.4))}`;
  }
  d += ` L${r2(x1 - 3)},${r2(base(x1 - 3))} C${r2(x1 - 2.8)},${r2(lipY(x1) + 2.2)} ${r2(x1 - 2)},${r2(lipY(x1) + 0.2)} ${r2(x1)},${r2(lipY(x1) - 1.4)}`;
  return d;
}

/** Teardrop with its tip at (x, y); s = scale. Bottom sits at y + 7.5s. */
function drop(x: number, y: number, s: number): string {
  return (
    `M${r2(x)},${r2(y)} C${r2(x + 1.6 * s)},${r2(y + 2.6 * s)} ${r2(x + 2.5 * s)},${r2(y + 3.8 * s)} ${r2(x + 2.5 * s)},${r2(y + 5 * s)} ` +
    `A${r2(2.5 * s)},${r2(2.5 * s)} 0 0 1 ${r2(x - 2.5 * s)},${r2(y + 5 * s)} ` +
    `C${r2(x - 2.5 * s)},${r2(y + 3.8 * s)} ${r2(x - 1.6 * s)},${r2(y + 2.6 * s)} ${r2(x)},${r2(y)} Z`
  );
}

function sparkle(cx: number, cy: number, r: number): string {
  const k = r * 0.22;
  return `M${cx},${cy - r} C${cx},${cy - k} ${cx + k},${cy} ${cx + r},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + r} C${cx},${cy + k} ${cx - k},${cy} ${cx - r},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - r} Z`;
}

/** Negative delays start each loop mid-cycle, so staggered loops never sit frozen first. */
const delay = (s: number): CSSProperties => ({ animationDelay: `${-s}s` });

// ---------------------------------------------------------------- the pool

/** The level surface: an ellipse with a glint. Clipped to the opening by the caller. */
function Surface({ pool, fill, edge }: { pool: Pool; fill: string; edge: string }) {
  const { cx } = RIM;
  const { cy, rx, ry } = pool;
  const glint = `M${r2(cx - rx * 0.66)},${r2(cy - ry * 0.18)} Q${r2(cx - rx * 0.5)},${r2(cy - ry * 0.72)} ${r2(cx - rx * 0.08)},${r2(cy - ry * 0.8)}`;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={edge} strokeWidth={1.6} />
      <path d={glint} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

/** Ripple rings on the surface around (cx, cy). */
function Ripples({ cx, cy, rx, animated }: { cx: number; cy: number; rx: number; animated?: boolean }) {
  const ry = rx * 0.4;
  return (
    <g fill="none" stroke="#fff" strokeWidth={1.2}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} opacity={0.65} />
      <ellipse className={animated ? 'gu-ripple' : undefined} cx={cx} cy={cy + 0.6} rx={rx + 5.5} ry={ry + 2.2} opacity={0.4} />
    </g>
  );
}

// ---------------------------------------------------------------- spills (amber, doctor)

/** Apple Juice: one thin stream over the middle of the lip, gathering into a drop at the low point. */
const AMBER_STREAM = 'M55.6,72.2 Q58.2,73.6 58.4,76.6 L58.7,86.6 C58.2,88.8 58.2,91.4 60,91.4 C61.8,91.4 61.8,88.8 61.3,86.6 L61.6,76.6 Q61.8,73.6 64.4,72.2';
/** See a Doctor: a sheet over the middle that hangs in drips (the longest reaches the low point)… */
const DOCTOR_SHEET = overflow(45, 75.8, [
  [51.5, 3.4, 83],
  [60, 4.6, 91.6],
  [68, 3.8, 85.5],
]);
/** …and a runner over the right side that drips off the curve of the shell. */
const DOCTOR_RUNNER = 'M76.6,69.6 Q78.6,70.6 78.8,73 L79.1,83 C78.6,85 78.9,87 80.1,87 C81.3,87 81.6,85 81.1,83 L80.8,72 Q80.8,68.6 82,66.2';

/** One drip: swells at the low point, falls (faster and faster), lands in the puddle with a ring. */
function Drip({ x, y, landY, ringRx, d = 0, size = 0.8 }: { x: number; y: number; landY: number; ringRx: number; d?: number; size?: number }) {
  const fall = r2(landY - (y + 7.5 * size));
  return (
    <g>
      <ellipse className="gu-splash" style={{ animationDelay: `${1.3 + d}s` }} cx={x} cy={landY} rx={ringRx} ry={ringRx * 0.3} fill="none" stroke="#fff" strokeWidth={1.2} />
      <path className="gu-fall" style={{ ['--gu-fall' as string]: `${fall}px`, animationDelay: `${1.3 + d}s` }} d={drop(x, y, size)} />
    </g>
  );
}

/** A floor puddle, with a highlight. */
function Puddle({ d, fill, edge, glint }: { d: string; fill: string; edge: string; glint: string }) {
  return (
    <g className="gu-spread">
      <path d={d} fill={fill} stroke={edge} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={glint} fill="none" stroke="#fff" strokeOpacity={0.65} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------- per-grade details

/** Clear: ice cubes floating in the pool. */
function IceCubes() {
  const cube = (x: number, y: number, s: number, rot: number, d: number) => (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <g className="gu-bob" style={delay(d)}>
        <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={1.8} fill="#f6fdff" fillOpacity={0.94} stroke={INK} strokeWidth={1.5} />
        <path d={`M${-s / 2 + 2},${s / 2 - 2.8} L${-s / 2 + 2},${-s / 2 + 2} L${s / 2 - 3},${-s / 2 + 2}`} fill="none" stroke="#a9def2" strokeWidth={1.2} strokeLinecap="round" />
      </g>
    </g>
  );
  return (
    <>
      {cube(52.5, 65.4, 7.5, -14, 0)}
      {cube(66.5, 66.2, 6.4, 18, 0.8)}
    </>
  );
}

/** Clear: a lemon wedge on the corner, like it's a drink. */
function LemonWedge() {
  const seg = [30, 60, 90, 120, 150].map((a) => {
    const t = (a * Math.PI) / 180;
    return `M0,0 L${(7.4 * Math.cos(t)).toFixed(2)},${(7.4 * Math.sin(t)).toFixed(2)}`;
  });
  return (
    <g transform="translate(87,18) rotate(24)">
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
    [14, 22, 7.5],
    [107, 46, 6],
    [13, 60, 4.8],
    [106, 82, 4.4],
  ];
  return (
    <g>
      {stars.map(([x, y, r], i) => (
        <path key={i} className="gu-twinkle" style={delay(i * 0.45)} d={sparkle(x, y, r)} fill="#eaf8ff" stroke="#2a6f97" strokeWidth={1.5} strokeLinejoin="round" />
      ))}
    </g>
  );
}

/** Straw: a urinal cake. They sink, so it sits on the bottom of the shallow pool, poking out. */
function UrinalCake({ waterline }: { waterline: string }) {
  const holes: [number, number][] = [
    [-4.5, -0.4],
    [-0.5, 1],
    [3.6, -0.6],
    [0, -2.1],
  ];
  return (
    <g>
      <g transform="translate(53,62.6) rotate(-6)">
        <path d="M-8.5,0 L-8.5,3.4 A8.5,4.2 0 0 0 8.5,3.4 L8.5,0 Z" fill="#e8689c" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        <ellipse cx={0} cy={0} rx={8.5} ry={4.2} fill="#ff9cc4" stroke={INK} strokeWidth={1.5} />
        {holes.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={1.1} ry={0.6} fill="#d24f86" />
        ))}
      </g>
      {/* the lemonade around its base, in front of the cake: level, whatever the cake does */}
      <path d="M42,65.2 A11,4.6 0 0 0 64,65.2 L64,78 L42,78 Z" fill={waterline} />
    </g>
  );
}

/** Amber: a fly, belly up, X eyes, floating at the brim. */
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
    <g transform="translate(59,60) scale(1.08)">
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

/** Amber: a wet floor sign, standing on the floor. */
function WetFloorSign() {
  return (
    <g>
      <ellipse cx={18} cy={113.4} rx={14} ry={1.6} fill="rgba(29,43,68,0.18)" />
      <g transform="translate(4.5,113) rotate(8)">
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

/** Doctor: it's bubbling. Bubbles sit on the surface and pop. */
function Bubbles() {
  const bubbles: [number, number, number][] = [
    [45, 59.5, 3],
    [53.5, 66.5, 2.2],
    [61.5, 56.5, 1.8],
    [70.5, 63, 3.5],
    [77.5, 58.5, 2],
  ];
  return (
    <g>
      {bubbles.map(([x, y, r], i) => (
        <g key={i} className="gu-bubble" style={delay(i * 0.37)}>
          <circle cx={x} cy={y} r={r} fill="#b8732c" stroke={INK} strokeWidth={1.3} />
          <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.32} fill="#fff" opacity={0.85} />
        </g>
      ))}
    </g>
  );
}

/** Doctor: steam rising off the pool. */
function Steam() {
  const wisps: [number, number, number][] = [
    [49, 52, 15],
    [61.5, 50.5, 19],
    [73.5, 52.5, 14],
  ];
  return (
    <g fill="none" stroke="#97a4b2" strokeWidth={3} strokeLinecap="round">
      {wisps.map(([x, y, h], i) => (
        <path key={i} className="gu-steam" style={delay(i * 0.6)} d={`M${x},${y} q-4,${-h / 4} 0,${-h / 2} t0,${-h / 2}`} />
      ))}
    </g>
  );
}

/** Doctor: a stethoscope draped over the top of the fixture. */
function Stethoscope() {
  const tube = 'M39,17.5 C37,25 30,27 26.5,37 C23,49 25,64 22,76';
  const ears = 'M33,4.5 C32,12 34,16.5 39,17.5 M45,4.5 C46,12 44,16.5 39,17.5';
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={ears} stroke={INK} strokeWidth={4.6} />
      <path d={ears} stroke={CHROME} strokeWidth={2.4} />
      <circle cx={33} cy={3.8} r={2.3} fill="#3a4450" stroke={INK} strokeWidth={1.2} />
      <circle cx={45} cy={3.8} r={2.3} fill="#3a4450" stroke={INK} strokeWidth={1.2} />
      <path d={tube} stroke={INK} strokeWidth={6.2} />
      <path d={tube} stroke="#2a9d8f" strokeWidth={3.6} />
      <rect x={20.1} y={76} width={3.8} height={4.5} fill={CHROME} stroke={INK} strokeWidth={1.3} />
      <circle cx={22} cy={85.5} r={6.6} fill={CHROME} stroke={INK} strokeWidth={2} />
      <circle cx={22} cy={85.5} r={3.6} fill="#eef3f7" stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

/** Doctor: it's clogged. A plunger standing in the puddle. */
function Plunger() {
  return (
    <g stroke={INK} strokeLinejoin="round">
      <rect x={100.3} y={56} width={3.4} height={49} rx={1.7} transform="rotate(6,102,105)" fill="#c98d52" strokeWidth={1.8} />
      <path d="M93,110.5 Q93,102 102,102 Q111,102 111,110.5 Z" fill="#d64541" strokeWidth={2} />
      <ellipse cx={102} cy={110.5} rx={9} ry={1.9} fill="#a8302d" strokeWidth={1.8} />
      <path d="M96.6,106 Q97.4,103.8 100,103.4" fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.3} strokeLinecap="round" />
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
  const pool = POOL[grade];
  const poolFill = `url(#${uid}-pool)`;
  const spillFill = `url(#${uid}-spill)`;
  const puddleFill = `url(#${uid}-puddle)`;
  const slosh: CSSProperties = { transformOrigin: `${RIM.cx}px ${pool.cy}px` };

  let inPool: ReactNode = null; // floats on / sits in the pool, hidden behind the lip like the pool is
  let spill: ReactNode = null; // over the lip, down the front, onto the floor
  let props: ReactNode = null;
  switch (grade) {
    case 'clear':
      inPool = (
        <>
          <path d={sparkle(72, 68.4, 2.6)} fill="#fff" />
          <IceCubes />
        </>
      );
      props = (
        <>
          <LemonWedge />
          <Sparkles />
        </>
      );
      break;
    case 'straw':
      inPool = (
        <>
          <UrinalCake waterline={poolFill} />
          <Ripples cx={53} cy={66.2} rx={11.5} animated={anim} />
        </>
      );
      break;
    case 'amber':
      inPool = (
        <>
          <Ripples cx={60} cy={64.5} rx={16} />
          <DeadFly />
        </>
      );
      spill = (
        <>
          <Puddle
            d="M45.5,108.2 C45.5,105.6 52,104.6 60,104.6 C68.5,104.6 75,105.4 75,108 C75,110.4 69,111.8 61,111.8 C52,111.8 45.5,110.8 45.5,108.2 Z"
            fill={puddleFill}
            edge={liq.edge}
            glint="M50.5,107 Q54,105.9 58.5,105.8"
          />
          <g className="gu-pour">
            <path d={AMBER_STREAM} fill={spillFill} stroke={liq.edge} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
            <path className="gu-flow" d="M60,75.5 L60,87" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.1} strokeLinecap="round" strokeDasharray="2.2 5" />
          </g>
          <g fill={liq.bottom} stroke={liq.edge} strokeWidth={1}>
            <Drip x={60} y={92} landY={108} ringRx={4.5} />
          </g>
        </>
      );
      props = <WetFloorSign />;
      break;
    case 'doctor':
      inPool = <Bubbles />;
      spill = (
        <>
          <Puddle
            d="M27,108.6 C26,104.6 35,102.8 43,103.4 C50,102 58,102.8 64,102.6 C74,101.8 88,102.6 95,105.2 C100,107.2 98,111.6 91,112.8 C83,114.8 71,113.8 62,115 C52,116.2 38,115.2 32,112.8 C27.6,111.6 27.2,110 27,108.6 Z"
            fill={puddleFill}
            edge={liq.edge}
            glint="M33,107.4 Q38,104.6 47,104.8 M70,104.4 Q77,104 82,104.6"
          />
          <g className="gu-pour">
            <g fill={spillFill} stroke={liq.edge} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round">
              <path d={DOCTOR_SHEET} />
              <path d={DOCTOR_RUNNER} />
            </g>
            <g className="gu-flow" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.1} strokeLinecap="round" strokeDasharray="2.2 5">
              <path d="M60,77 L60,88" />
              <path d="M79.9,73 L80,83" />
            </g>
          </g>
          <g fill={liq.bottom} stroke={liq.edge} strokeWidth={1}>
            <Drip x={60} y={92.2} landY={109.5} ringRx={5} />
            <Drip x={80.1} y={87.4} landY={106.5} ringRx={4} d={0.55} size={0.7} />
          </g>
        </>
      );
      props = (
        <>
          <Steam />
          <Stethoscope />
          <Plunger />
        </>
      );
      break;
  }

  const cls = ['gu', `gu--${grade}`, anim ? 'gu--anim' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} role="img" aria-label={meta.label} style={{ ['--gu-size' as string]: `${size}px` }}>
      <svg className="gu-art" viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
        <defs>
          {/* in viewBox units, so anything in the pool (the cake's waterline) matches it exactly */}
          <linearGradient id={`${uid}-pool`} gradientUnits="userSpaceOnUse" x1="0" y1={pool.cy - pool.ry} x2="0" y2={pool.cy + pool.ry}>
            <stop offset="0" stopColor={liq.top} />
            <stop offset="0.55" stopColor={liq.bottom} />
          </linearGradient>
          {/* thin where it runs over white porcelain, so it lightens on the way down */}
          <linearGradient id={`${uid}-spill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.1" stopColor={liq.bottom} />
            <stop offset="1" stopColor={liq.top} />
          </linearGradient>
          <linearGradient id={`${uid}-puddle`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={liq.top} />
            <stop offset="1" stopColor={liq.bottom} />
          </linearGradient>
          <radialGradient id={`${uid}-basin`} cx="0.5" cy="0.62" r="0.62">
            <stop offset="0" stopColor="#c3cfda" />
            <stop offset="1" stopColor={SHADE} />
          </radialGradient>
          <clipPath id={`${uid}-cav`}>
            <path d={CAVITY} />
          </clipPath>
          <clipPath id={`${uid}-wall`}>
            <rect x={3} y={3} width={114} height={114} rx={16} />
          </clipPath>
        </defs>

        {/* the wall and floor: a bathroom, so it reads as a fixture and not a jar */}
        <g clipPath={`url(#${uid}-wall)`}>
          <rect x={0} y={0} width={120} height={120} fill="#dde7ed" />
          <path d={`M0,27 H120 M0,54 H120 M0,81 H120 M26,0 V${FLOOR_Y} M52,0 V${FLOOR_Y} M78,0 V${FLOOR_Y} M104,0 V${FLOOR_Y}`} stroke="#f3f7f9" strokeWidth={1.6} />
          <rect x={0} y={FLOOR_Y} width={120} height={120 - FLOOR_Y} fill="#c3d1da" />
          <path d={`M0,${FLOOR_Y} H120`} stroke="#a9bac6" strokeWidth={1.6} />
          <ellipse cx={60} cy={FLOOR_Y + 1.5} rx={22} ry={1.4} fill="rgba(29,43,68,0.1)" />
        </g>

        {/* plumbing */}
        <g stroke={INK} strokeLinejoin="round">
          <rect x={49} y={0.5} width={22} height={6} rx={2} fill={CHROME} strokeWidth={2.2} />
          <rect x={55.5} y={5} width={9} height={14} fill={CHROME} strokeWidth={2.2} />
          <rect x={48} y={6.5} width={24} height={11} rx={5.5} fill={CHROME} strokeWidth={2.4} />
          <path d="M71,11.5 L81,7" fill="none" strokeWidth={4} strokeLinecap="round" />
        </g>

        {/* porcelain */}
        <path d={BODY} fill={PORCELAIN} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M84.6,27 L88.9,58 Q90.4,80 73,86.4" fill="none" stroke={SHADE} strokeWidth={5} strokeLinecap="round" />
        <path d={CAVITY} fill={SHADE} />

        {/* inside the opening: the basin, then the level pool. The lip hides its front half. */}
        <g clipPath={`url(#${uid}-cav)`}>
          <ellipse cx={RIM.cx} cy={RIM.cy + 2} rx={RIM.rx + 1} ry={RIM.ry + 4} fill={`url(#${uid}-basin)`} />
          <path d="M45.5,38 Q43.5,46 44,52" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" />
          <g className="gu-slosh" style={slosh}>
            <Surface pool={pool} fill={poolFill} edge={liq.edge} />
            {inPool}
          </g>
        </g>
        <path d={CAVITY} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        {/* the rounded top of the lip, just under its edge */}
        <path
          d={`M${r2(RIM.cx + RIM.rx * 0.94)},${r2(RIM.cy + 2.5 + RIM.ry * 0.34)} A${RIM.rx},${RIM.ry} 0 0 1 ${r2(RIM.cx - RIM.rx * 0.94)},${r2(RIM.cy + 2.5 + RIM.ry * 0.34)}`}
          fill="none"
          stroke={SHADE}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {spill}
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
