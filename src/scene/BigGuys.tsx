// Fixtures and figures for the newer guys: Gym Bro's sink, the germaphobe's wet urinals, the knight's
// shield, the security guard at the urinal he's taped off, and the multi-urinal guys (napper, wolf mascot, sumo).
import { useId } from 'react';
import type { Quirk } from '../types';
import { FEET_Y, PITCH, urinalMetrics } from './geometry';
import {
  MAWASHI,
  QUIRK_STYLE,
  SECURITY_GOLD,
  SECURITY_NAVY,
  SECURITY_PANTS,
  SHIELD_BLUE,
  SHIELD_GOLD,
  STEEL,
  WOLF_FUR,
  WOLF_LIGHT,
  shade,
  type ResolvedLook,
} from './looks';

/** How many neighbouring urinals a guy fills (the napper and the mascot take two, the sumo three). */
export function partWidth(q: Quirk): number {
  return q === 'sumo' ? 3 : q === 'napper' || q === 'mascot' ? 2 : 1;
}

/** Scene x of the middle of a multi-urinal guy, from the centre of the slot holding his part `part`. */
export function spanCentre(q: Quirk, part: number | undefined, cx: number): number {
  return cx + ((partWidth(q) - 1) / 2 - (part ?? 0)) * PITCH;
}

/** Mirror over a sink (scene y). Gym Bro's head sits just below it, so his reflection shows. */
export const MIRROR_Y0 = 5;
export const MIRROR_Y1 = 54;

export interface SinkReflection {
  /** The side he flexes on (-1 screen left, 1 right): his reflection flexes on the same side. */
  side: -1 | 1;
  skin: string;
  hair: string | null;
  tank: string;
}

/**
 * A pedestal sink in a urinal's spot: a mirror up high, a wide basin at hip height with two taps, and
 * a pedestal down to the floor (it shows between Gym Bro's planted feet). With `reflection`, the
 * mirror shows Gym Bro from the front, flexing at himself.
 */
export function Sink({ cx, reflection }: { cx: number; reflection?: SinkReflection }) {
  const clip = `us-mirror-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rimY = 158; // waist height, below his raised arms
  const base = FEET_Y - 4;
  return (
    <g className="us-sink">
      {/* mirror */}
      <rect className="us-ink" x={cx - 27} y={MIRROR_Y0 - 3} width={54} height={MIRROR_Y1 - MIRROR_Y0 + 6} rx={5} fill="#c9d2db" strokeWidth={1.8} />
      <rect className="us-mirror" x={cx - 24} y={MIRROR_Y0} width={48} height={MIRROR_Y1 - MIRROR_Y0} rx={3} />
      {reflection && (
        <g>
          <clipPath id={clip}>
            <rect x={cx - 24} y={MIRROR_Y0} width={48} height={MIRROR_Y1 - MIRROR_Y0} rx={3} />
          </clipPath>
          <g clipPath={`url(#${clip})`} opacity={0.88}>
            <MirrorFlex cx={cx} r={reflection} />
          </g>
        </g>
      )}
      <path d={`M${cx - 18},${MIRROR_Y1 - 6} L${cx - 6},${MIRROR_Y0 + 6}`} stroke="#fff" strokeWidth={3} opacity={0.55} />
      {/* pedestal down to the floor */}
      <path className="us-ink us-porcelain" d={`M${cx - 8},${rimY + 20} L${cx + 8},${rimY + 20} L${cx + 7},${base - 8} Q${cx + 8},${base - 2} ${cx + 13},${base} L${cx - 13},${base} Q${cx - 8},${base - 2} ${cx - 7},${base - 8} Z`} />
      <path className="us-porcelain-shade" d={`M${cx + 2},${rimY + 24} L${cx + 4},${rimY + 24} L${cx + 4},${base - 9} L${cx + 2},${base - 9} Z`} />
      {/* basin, wider than him so it shows either side */}
      <path className="us-ink us-porcelain" d={`M${cx - 41},${rimY} L${cx + 41},${rimY} L${cx + 32},${rimY + 16} Q${cx},${rimY + 27} ${cx - 32},${rimY + 16} Z`} />
      <rect className="us-ink us-porcelain" x={cx - 44} y={rimY - 6} width={88} height={8} rx={3.5} />
      {/* two taps on the corners, a spout in the middle */}
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <rect className="us-ink us-chrome" x={cx + sx * 42 - 2.5} y={rimY - 14} width={5} height={8} strokeWidth={1.3} />
          <rect className="us-ink us-chrome" x={cx + sx * 42 - 6} y={rimY - 16} width={12} height={3.5} rx={1.5} strokeWidth={1.3} />
          <circle cx={cx + sx * 42} cy={rimY - 14.2} r={1.3} fill={sx < 0 ? '#e0453a' : '#3b7fd4'} />
        </g>
      ))}
      <path className="us-ink us-chrome" d={`M${cx - 3},${rimY - 6} V${rimY - 17} Q${cx - 3},${rimY - 22} ${cx + 3},${rimY - 22} H${cx + 10} V${rimY - 16} H${cx + 4} V${rimY - 6} Z`} strokeWidth={1.4} />
    </g>
  );
}

/** Gym Bro in the mirror, from the front: tank top, smirk, a front double biceps (scene coords). */
function MirrorFlex({ cx, r }: { cx: number; r: SinkReflection }) {
  const hy = 30; // head centre
  return (
    <g>
      {/* shoulders and tank */}
      <path d={`M${cx - 19},${MIRROR_Y1 + 2} Q${cx - 19},${hy + 14} ${cx - 8},${hy + 13} L${cx + 8},${hy + 13} Q${cx + 19},${hy + 14} ${cx + 19},${MIRROR_Y1 + 2} Z`} fill={r.skin} stroke="var(--us-ink)" strokeWidth={1.4} />
      <path d={`M${cx - 10},${MIRROR_Y1 + 2} L${cx - 9},${hy + 15} Q${cx},${hy + 21} ${cx + 9},${hy + 15} L${cx + 10},${MIRROR_Y1 + 2} Z`} fill={r.tank} stroke="var(--us-ink)" strokeWidth={1.2} />
      {/* both arms up: upper arms out, forearms up, fists by his head, a peak on each */}
      {[-1, 1].map((sd) => {
        const d = `M${cx + sd * 15},${hy + 15} L${cx + sd * 21},${hy + 11} L${cx + sd * 20},${hy - 3}`;
        return (
          <g key={sd}>
            <path d={d} fill="none" stroke="var(--us-ink)" strokeWidth={9.6} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={r.skin} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${cx + sd * 14.5},${hy + 11.5} Q${cx + sd * 17.5},${hy + 6} ${cx + sd * 21},${hy + 9.5}`} fill="none" stroke="var(--us-ink)" strokeWidth={1.1} />
            <circle cx={cx + sd * 20} cy={hy - 5} r={4.2} fill={r.skin} stroke="var(--us-ink)" strokeWidth={1.3} />
          </g>
        );
      })}
      {/* head and face */}
      <rect x={cx - 4} y={hy + 6} width={8} height={8} fill={r.skin} />
      <circle cx={cx} cy={hy} r={9.5} fill={r.skin} stroke="var(--us-ink)" strokeWidth={1.4} />
      {r.hair && <path d={`M${cx - 9.5},${hy - 1} A9.5,9.5 0 0 1 ${cx + 9.5},${hy - 1} Q${cx},${hy - 7} ${cx - 9.5},${hy - 1} Z`} fill={r.hair} />}
      <path d={`M${cx - 6},${hy - 2.5} L${cx - 2},${hy - 1.5} M${cx + 2},${hy - 1.5} L${cx + 6},${hy - 2.5}`} stroke="#1d1d22" strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={cx - 3.5} cy={hy + 0.8} r={1} fill="#1d1d22" />
      <circle cx={cx + 3.5} cy={hy + 0.8} r={1} fill="#1d1d22" />
      <path d={`M${cx - 3},${hy + 4.5} Q${cx + 1},${hy + 6.5} ${cx + 4},${hy + 3.6}`} fill="none" stroke="#1d1d22" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

/** Sheen and drips on a urinal beside the germaphobe (he keeps flushing, and spraying). */
export function WetUrinal({ cx, low }: { cx: number; low?: boolean }) {
  const m = urinalMetrics(!!low);
  const k = m.scale;
  const drops: [number, number, number][] = [
    [-14, 14, 1],
    [11, 30, 0.85],
    [-6, 50, 0.9],
    [15, 58, 0.7],
    [2, 84, 0.9],
  ];
  return (
    <g className="us-wet" aria-hidden="true">
      <g transform={`translate(${cx},${m.top}) scale(${k})`}>
        <path d="M-20,0 L20,0 L18,50 Q15,78 0,79 Q-15,78 -18,50 Z" fill="#7cc4ef" opacity={0.28} />
        <path d="M-12,6 Q-15,30 -9,54" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <path d="M12,10 Q14,24 12,36" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        {drops.map(([x, y, s], i) => (
          <path key={i} transform={`translate(${x},${y}) scale(${s})`} d="M0,-4 C2.4,0 3,2.2 0,4.2 C-3,2.2 -2.4,0 0,-4 Z" fill="#58aee8" stroke="#2c6fa3" strokeWidth={1.1} />
        ))}
      </g>
      {/* drips on the floor under it */}
      <ellipse cx={cx} cy={FEET_Y + 1} rx={22} ry={4.5} fill="#9ed3f5" stroke="#4a90c8" strokeWidth={1.2} opacity={0.75} />
      <ellipse cx={cx - 7} cy={FEET_Y} rx={6} ry={1.3} fill="#fff" opacity={0.8} />
    </g>
  );
}

/** The knight's kite shield, propped in the urinal on his shield side. */
export function KnightShield({ cx, low, side }: { cx: number; low?: boolean; side: -1 | 1 }) {
  const m = urinalMetrics(!!low);
  const top = m.top - 22;
  return (
    <g className="us-gear us-shield" aria-hidden="true" transform={`translate(${cx},${top}) rotate(${side * 7},0,90)`}>
      <path className="us-ink" fill={STEEL} d="M-25,0 Q0,-6 25,0 Q28,46 0,96 Q-28,46 -25,0 Z" />
      <path className="us-ink" fill={SHIELD_BLUE} d="M-20,5 Q0,0 20,5 Q22,45 0,86 Q-22,45 -20,5 Z" strokeWidth={1.6} />
      {/* a gold chevron and a lion-ish blob, as faire shields have */}
      <path d="M-18,44 L0,28 L18,44 L18,53 L0,37 L-18,53 Z" fill={SHIELD_GOLD} stroke="var(--us-ink)" strokeWidth={1.2} />
      <circle cx={0} cy={64} r={6} fill={SHIELD_GOLD} stroke="var(--us-ink)" strokeWidth={1.2} />
      <path d="M-13,10 Q-15,30 -10,46" fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.35} strokeLinecap="round" />
    </g>
  );
}

/** How far his cap rises above a bare head (unscaled). */
export const GUARD_CAP_RISE = 8;

/**
 * The security guard on duty in front of the urinal he's taped off, facing the room,
 * arms at his sides, chin up, smug. Navy uniform, cap, gold badge, duty belt. Feet at (0, 0), unscaled.
 */
export function GuardFigure({ look }: { look: ResolvedLook }) {
  const navy = SECURITY_NAVY;
  const sleeve = shade(navy, -0.12);
  const skin = look.skin;
  const hair = look.hair?.color ?? '#3a2a20';
  // a gentle knee bend: everything above the knees sits a touch lower
  const crouch = 2;
  return (
    <g>
      {/* feet a bit wider than his shoulders, knees just slightly bent */}
      <ellipse className="us-ink" cx={-19} cy={-4} rx={9.5} ry={5} fill="#1b1b1f" />
      <ellipse className="us-ink" cx={19} cy={-4} rx={9.5} ry={5} fill="#1b1b1f" />
      <path
        className="us-ink"
        fill={SECURITY_PANTS}
        d="M-18,-82 L18,-82 L25,-44 L26,-8 L13,-8 L11,-42 L0,-57 L-11,-42 L-13,-8 L-26,-8 L-25,-44 Z"
      />
      <path d="M-20,-66 L-22,-44 L-21,-14 M20,-66 L22,-44 L21,-14" fill="none" stroke={shade(SECURITY_PANTS, -0.25)} strokeWidth={1.2} />
      {/* leaning back a little, chest puffed out */}
      <g transform={`translate(0,${crouch})`}>
        <path
          className="us-ink"
          fill={navy}
          d="M-21,-145 C-29,-144 -30,-134 -28,-124 Q-25,-102 -19,-81 L19,-81 Q25,-102 28,-124 C30,-134 29,-144 21,-145 Z"
        />
        {/* chest puff: two pec curves catching the light */}
        <path d="M-19,-122 Q-10,-114 -2,-121 M2,-121 Q10,-114 19,-122" fill="none" stroke={shade(navy, -0.35)} strokeWidth={1.4} strokeLinecap="round" />
        {/* collar, tie */}
        <path className="us-ink" fill={sleeve} d="M-11,-146 L0,-135 L11,-146 L8,-150 L0,-143 L-8,-150 Z" strokeWidth={1.5} />
        <path className="us-ink" fill="#121826" d="M-2.6,-138 L2.6,-138 L3.4,-113 L0,-109 L-3.4,-113 Z" strokeWidth={1.3} />
        {/* badge on his left chest (screen right), name tag on the other side */}
        <path className="us-ink" fill={SECURITY_GOLD} d="M9,-136 L17,-136 L17.5,-129 Q13,-123 8.5,-129 Z" strokeWidth={1.3} />
        <circle cx={13} cy={-131.5} r={1.6} fill={shade(SECURITY_GOLD, 0.35)} />
        <rect x={-17} y={-134} width={9} height={3.4} rx={0.8} fill="#e8eef2" />
        {/* duty belt: buckle, radio, pouch */}
        <rect className="us-ink" x={-21} y={-88} width={42} height={7} fill="#15171b" strokeWidth={1.6} />
        <rect x={-3.5} y={-87} width={7} height={5} rx={1} fill="#c9d2db" />
        <rect className="us-ink" x={8} y={-97} width={7} height={12} rx={1.5} fill="#24272d" strokeWidth={1.4} />
        <path d="M13,-97 V-104" stroke="var(--us-ink)" strokeWidth={1.8} strokeLinecap="round" />
        <rect className="us-ink" x={-15} y={-91} width={7} height={9} rx={1.5} fill="#24272d" strokeWidth={1.4} />
        {/* arms at his sides, hands by his belt */}
        {[-1, 1].map((sx) => (
          <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
            <path d="M23,-138 C29,-126 30,-108 28,-92" fill="none" stroke="var(--us-ink)" strokeWidth={12.5} strokeLinecap="round" />
            <path d="M23,-138 C29,-126 30,-108 28,-92" fill="none" stroke={sleeve} strokeWidth={8.6} strokeLinecap="round" />
            <path className="us-ink" fill={SECURITY_GOLD} d="M21,-142 L27,-143 L28,-137 L24,-133 L20,-137 Z" strokeWidth={1.2} />
            <ellipse className="us-ink" cx={28} cy={-87} rx={5} ry={5.6} fill={skin} strokeWidth={1.6} />
          </g>
        ))}
        {/* neck: a bit more of it showing, chin's up */}
        <rect className="us-ink" x={-6.5} y={-157} width={13} height={14} fill={skin} />
        <path d="M-5,-149 Q0,-147 5,-149" fill="none" stroke={shade(skin, 0.2)} strokeWidth={1.2} />
        {/* head tipped back: chin up, looking down his nose */}
        <g transform="translate(0,-3)">
          <ellipse className="us-ink" cx={-14} cy={-163} rx={3.4} ry={4.8} fill={skin} />
          <ellipse className="us-ink" cx={14} cy={-163} rx={3.4} ry={4.8} fill={skin} />
          <circle className="us-ink" cx={0} cy={-165} r={14} fill={skin} />
          {/* one brow cocked, heavy lids, pupils low: smug */}
          <path d="M-9.5,-170.5 L-3,-170 M3,-172.5 Q6.5,-175 10,-172" fill="none" stroke="#1d1d22" strokeWidth={1.8} strokeLinecap="round" />
          <path d="M-8,-166.5 H-2.5 M2.5,-166.5 H8" stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
          <circle cx={-5.2} cy={-165} r={1.4} fill="#1d1d22" />
          <circle cx={5.2} cy={-165} r={1.4} fill="#1d1d22" />
          {/* nose up: nostrils show */}
          <circle cx={-1.5} cy={-160} r={0.9} fill={shade(skin, 0.4)} />
          <circle cx={1.5} cy={-160} r={0.9} fill={shade(skin, 0.4)} />
          <path d="M-6,-157.5 Q0,-160 6,-157.5 L5,-156 Q0,-158 -5,-156 Z" fill={hair} />
          {/* lopsided smirk */}
          <path d="M-4,-153.5 Q1,-152 5.5,-155" fill="none" stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
          {/* cap pushed back with the chin up: more crown, a thin peak */}
          <path className="us-ink" fill={navy} d="M-15,-171 Q-15.5,-186 0,-186 Q15.5,-186 15,-171 Z" strokeWidth={1.8} />
          <path className="us-ink" fill={SECURITY_GOLD} d="M-3,-182 L3,-182 L3.4,-178 L0,-175.5 L-3.4,-178 Z" strokeWidth={1} />
          <path className="us-ink" fill="#121826" d="M-16.5,-171 Q0,-168.5 16.5,-171 Q15,-167.5 0,-167 Q-15,-167.5 -16.5,-171 Z" strokeWidth={1.5} />
        </g>
      </g>
    </g>
  );
}

/** The napper is drawn a bit bigger than life so he reads lying down. */
export const NAPPER_SCALE = 1.2;

/** The napper: asleep on his back on the floor, in front of two urinals. Local origin at the centre of his span, on the floor. */
export function NapperFigure({ look, reduced }: { look: ResolvedLook; reduced?: boolean }) {
  const hair = look.hair?.color ?? null;
  return (
    <g transform={`scale(${NAPPER_SCALE})`}>
      {/* rolled-up jacket for a pillow */}
      <ellipse className="us-ink" cx={-62} cy={-7} rx={17} ry={6.5} fill={look.shirtShade} />
      {/* legs, knees up a little, shoes pointing at the ceiling */}
      <path className="us-ink" fill={look.pants} d="M-2,-27 L26,-34 L54,-24 L53,-11 L27,-19 L-2,-5 Z" />
      <ellipse className="us-ink" cx={58} cy={-24} rx={5.5} ry={9.5} fill="#2a2523" transform="rotate(-14,58,-24)" />
      <ellipse className="us-ink" cx={56} cy={-12} rx={5} ry={8.5} fill="#2a2523" transform="rotate(-10,56,-12)" />
      {/* torso, belly up */}
      <path className="us-ink" fill={look.shirt} d="M-48,-28 Q-22,-39 2,-29 L2,-4 L-48,-3 Z" />
      {/* arm resting on his belly */}
      <path d="M-42,-24 L-24,-35 L-10,-31" fill="none" stroke="var(--us-ink)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-42,-24 L-24,-35 L-10,-31" fill="none" stroke={look.shirtShade} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <circle className="us-ink" cx={-8} cy={-31} r={4} fill={look.skin} />
      {/* head, face up */}
      <circle className="us-ink" cx={-58} cy={-18} r={13} fill={look.skin} />
      {hair ? (
        <path className="us-ink" fill={hair} d="M-66,-29 A13,13 0 0 0 -68,-8 Q-62,-11 -61,-18 Q-62,-25 -66,-29 Z" strokeWidth={1.6} />
      ) : (
        <ellipse cx={-66} cy={-20} rx={2} ry={3.5} fill="#fff" opacity={0.45} />
      )}
      <circle className="us-ink" cx={-58} cy={-32} r={2.8} fill={look.skin} strokeWidth={1.5} />
      <path d="M-64,-27 Q-61.5,-24.5 -59,-27" fill="none" stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
      <ellipse cx={-51} cy={-27} rx={2} ry={1.6} fill="#5a1d1d" stroke="#1d1d22" strokeWidth={1} />
      {/* Zz */}
      <g className={reduced ? 'us-zz' : 'us-zz us-zz-float'}>
        <text className="us-zz-text" x={-46} y={-38} fontSize={9}>
          z
        </text>
        <text className="us-zz-text" x={-38} y={-50} fontSize={12}>
          z
        </text>
        <text className="us-zz-text" x={-28} y={-64} fontSize={16}>
          Z
        </text>
      </g>
    </g>
  );
}

export const MASCOT_SCALE = 0.94;
/** Unscaled head centre and ear-tip height of the wolf mascot. */
export const MASCOT_HEAD_Y = -186;
export const MASCOT_TOP = -226;

/** The wolf mascot: a huge guy in a fur suit, a team jersey, a bushy tail. Origin at the middle of his two urinals. */
export function WolfMascot({ turn, talking }: { turn: -1 | 0 | 1; talking?: boolean }) {
  const dark = shade(WOLF_FUR, 0.25);
  const jersey = QUIRK_STYLE.mascot.color;
  return (
    <g transform={`scale(${MASCOT_SCALE})`}>
      {/* paws */}
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <ellipse className="us-ink" cx={sx * 27} cy={-7} rx={21} ry={8.5} fill={dark} />
          <path d={`M${sx * 18},-12 v5 M${sx * 27},-13 v5 M${sx * 36},-12 v5`} stroke={WOLF_LIGHT} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
      {/* fur legs */}
      <path className="us-ink" fill={WOLF_FUR} d="M-46,-96 L46,-96 L45,-12 L9,-12 L0,-52 L-9,-12 L-45,-12 Z" />
      <path d="M-45,-22 l4,-5 l4,5 l4,-5 l4,5 M13,-22 l4,-5 l4,5 l4,-5 l4,5" fill="none" stroke={dark} strokeWidth={1.6} />
      {/* arms, hanging, with big paw hands */}
      {[-1, 1].map((sx) => (
        <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
          <path className="us-ink" fill={WOLF_FUR} d="M44,-170 C66,-162 70,-124 66,-98 L52,-96 C54,-122 52,-146 42,-158 Z" />
          <path d="M64,-150 l4,2 l-3,3 l4,3 M67,-126 l4,2 l-3,3 l4,3" fill="none" stroke={dark} strokeWidth={1.5} />
          <circle className="us-ink" cx={59} cy={-93} r={10} fill={dark} />
        </g>
      ))}
      {/* body and jersey */}
      <path
        className="us-ink"
        fill={WOLF_FUR}
        d="M-50,-176 C-64,-172 -62,-140 -58,-110 C-56,-96 -52,-88 -46,-86 L46,-86 C52,-88 56,-96 58,-110 C62,-140 64,-172 50,-176 Q0,-186 -50,-176 Z"
      />
      <path className="us-ink" fill={jersey} d="M-44,-173 Q0,-183 44,-173 L56,-150 L47,-144 L45,-96 L-45,-96 L-47,-144 L-56,-150 Z" />
      <path d="M-45,-104 H45" stroke="#ffffff" strokeWidth={3} />
      <text className="us-mascot-num" x={0} y={-134} textAnchor="middle" dominantBaseline="central" fill="#ffffff">
        00
      </text>
      {/* bushy tail out the back */}
      <path className="us-ink" fill={WOLF_FUR} d="M-4,-98 Q30,-92 34,-58 Q36,-34 22,-28 Q16,-44 10,-56 Q4,-74 -10,-90 Z" />
      <path className="us-ink" fill={WOLF_LIGHT} d="M33,-52 Q36,-34 22,-28 Q19,-38 16,-46 Q26,-46 33,-52 Z" strokeWidth={1.6} />
      {/* head: ears, ruff, and (in profile) the snout */}
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <path className="us-ink" fill={WOLF_FUR} d={`M${sx * 8},-206 L${sx * 26},${MASCOT_TOP} L${sx * 29},-194 Z`} />
          <path d={`M${sx * 14},-205 L${sx * 24},-218 L${sx * 25},-200 Z`} fill="#e7a3a9" />
        </g>
      ))}
      <circle className="us-ink" cx={0} cy={MASCOT_HEAD_Y} r={28} fill={WOLF_FUR} />
      <path d="M-24,-170 l5,6 l5,-6 l5,6 l5,-6 l5,6 l5,-6 l5,6 l5,-6 l5,6" fill="none" stroke={WOLF_LIGHT} strokeWidth={2} />
      {turn !== 0 && (
        <g>
          <ellipse className="us-ink" cx={turn * 30} cy={-178} rx={20} ry={11} fill={WOLF_LIGHT} />
          <circle className="us-ink" cx={turn * 48} cy={-182} r={5} fill="#1d1d22" strokeWidth={1.4} />
          {talking ? (
            <path className="us-ink" d={`M${turn * 22},-172 Q${turn * 34},-164 ${turn * 44},-172 Z`} fill="#7a2230" strokeWidth={1.4} />
          ) : (
            <path d={`M${turn * 22},-171 Q${turn * 34},-167 ${turn * 44},-172`} fill="none" stroke="#1d1d22" strokeWidth={1.5} />
          )}
          <circle cx={turn * 14} cy={-196} r={5} fill="#ffffff" stroke="#1d1d22" strokeWidth={1.3} />
          <circle cx={turn * 16} cy={-196} r={2.4} fill="#1d1d22" />
          <path d={`M${turn * 7},-204 L${turn * 21},-201`} stroke="#1d1d22" strokeWidth={2} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/** Unscaled head centre and topknot height of the sumo wrestler. */
export const SUMO_HEAD_Y = -170;
export const SUMO_TOP = -203;

/** The sumo wrestler: huge, bare-backed, mawashi knotted at the back, topknot. Origin at the middle of his three urinals. */
export function SumoFigure({ look }: { look: ResolvedLook }) {
  const skin = look.skin;
  const crease = shade(skin, 0.16);
  return (
    <g>
      {/* bare feet */}
      {[-1, 1].map((sx) => (
        <ellipse key={sx} className="us-ink" cx={sx * 36} cy={-5} rx={17} ry={6.5} fill={skin} />
      ))}
      {/* thick legs */}
      {[-1, 1].map((sx) => (
        <path key={sx} className="us-ink" fill={skin} transform={sx < 0 ? 'scale(-1,1)' : undefined} d="M8,-78 Q14,-40 20,-9 L54,-9 Q70,-40 72,-82 Z" />
      ))}
      {/* arms resting at his sides */}
      {[-1, 1].map((sx) => (
        <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
          <path className="us-ink" fill={skin} d="M58,-152 C88,-144 96,-112 90,-84 L74,-82 C76,-104 72,-128 56,-140 Z" />
          <circle className="us-ink" cx={84} cy={-80} r={10} fill={skin} />
        </g>
      ))}
      {/* the great back */}
      <path
        className="us-ink"
        fill={skin}
        d="M-56,-158 C-80,-154 -88,-120 -84,-92 C-82,-70 -72,-60 -52,-58 L52,-58 C72,-60 82,-70 84,-92 C88,-120 80,-154 56,-158 Q0,-170 -56,-158 Z"
      />
      <path d="M0,-150 Q-3,-120 0,-92" fill="none" stroke={crease} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M-40,-140 Q-28,-128 -14,-134 M40,-140 Q28,-128 14,-134" fill="none" stroke={crease} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M-72,-110 Q-62,-104 -66,-94 M72,-110 Q62,-104 66,-94" fill="none" stroke={crease} strokeWidth={1.5} strokeLinecap="round" />
      {/* mawashi: the belt round the hips, the band down the back, the knot */}
      <path className="us-ink" fill={MAWASHI} d="M-83,-94 Q0,-82 83,-94 L80,-68 Q0,-58 -80,-68 Z" />
      <path className="us-ink" fill={MAWASHI} d="M-9,-76 L9,-76 L7,-34 L-7,-34 Z" />
      <path className="us-ink" fill={shade(MAWASHI, -0.2)} d="M-13,-94 L13,-94 L11,-74 L-11,-74 Z" />
      <path d="M-78,-82 Q0,-71 78,-82" fill="none" stroke={shade(MAWASHI, -0.35)} strokeWidth={1.3} />
      {/* thick neck, head, slicked hair and the topknot */}
      <path className="us-ink" fill={skin} d="M-14,-160 L14,-160 L22,-148 L-22,-148 Z" />
      {[-1, 1].map((sx) => (
        <ellipse key={sx} className="us-ink" cx={sx * 19} cy={-168} rx={3.6} ry={5} fill={skin} />
      ))}
      <circle className="us-ink" cx={0} cy={SUMO_HEAD_Y} r={20} fill={skin} />
      <path className="us-ink" fill="#16161a" d="M-20,-172 A20,20 0 0 1 20,-172 L19,-163 Q0,-157 -19,-163 Z" />
      <path d="M-12,-182 Q0,-186 12,-182" fill="none" stroke="#5a5a66" strokeWidth={1.2} />
      <path className="us-ink" fill="#16161a" d={`M-5,-188 Q-8,${SUMO_TOP + 2} 1,${SUMO_TOP} Q10,${SUMO_TOP + 2} 6,-188 Z`} strokeWidth={1.6} />
      <rect x={-5} y={-191} width={11} height={2.6} rx={1} fill="#f1efe8" />
    </g>
  );
}

