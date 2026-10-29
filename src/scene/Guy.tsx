// A guy seen from behind, standing facing the wall. Local coords: feet centre at (0, 0), y up is negative.
import type { CSSProperties } from 'react';
import type { Quirk } from '../types';
import { GUY_H, heightScale } from './geometry';
import { QUIRK_STYLE, SHOE, type ResolvedLook } from './looks';
import { legPose } from './pose';

interface GuyFigureProps {
  look: ResolvedLook;
  /** Yellow hoodie with a hood (the player). */
  hoodie?: boolean;
  /** Drives silhouette + props (suit and coffee, beer bottle, wide stance). */
  quirk?: Quirk;
  /** Head turned to the side in profile: -1 left, 1 right. */
  turn?: -1 | 0 | 1;
  /** Mouth open (talker). */
  talking?: boolean;
  /** Which hand holds the prop (beer / coffee / FaceTime phone). */
  propSide?: -1 | 1;
  /** 0..1: legs spread wide over a puddle, knees slightly bent (1 = full straddle). */
  straddle?: number;
}

function Hair({ look }: { look: ResolvedLook }) {
  if (!look.hair) {
    return <ellipse cx={-5} cy={-170} rx={4} ry={2.4} fill="#fff" opacity={0.45} />;
  }
  const { style, color } = look.hair;
  const crop = 'M-14.6,-163 A14.6,14.6 0 0 1 14.6,-163 L13.6,-154 Q0,-149 -13.6,-154 Z';
  switch (style) {
    case 'buzz':
      return <path d={crop} fill={color} opacity={0.6} />;
    case 'curly':
      return (
        <g fill={color} className="us-ink">
          {[
            [-12, -167],
            [-7, -175],
            [1, -178],
            [9, -175],
            [13, -167],
          ].map(([x, y]) => (
            <circle key={`${x}`} cx={x} cy={y} r={6} />
          ))}
          <path d={crop} stroke="none" />
        </g>
      );
    case 'swoop':
      return (
        <g fill={color} className="us-ink">
          <path d={crop} />
          <path d="M-6,-176 Q8,-188 18,-170 Q9,-176 0,-174 Z" />
        </g>
      );
    case 'long':
      return <path className="us-ink" fill={color} d="M-15,-163 A15,15 0 0 1 15,-163 L16.5,-141 Q0,-137 -16.5,-141 Z" />;
    case 'bun':
      return (
        <g fill={color} className="us-ink">
          <circle cx={0} cy={-181} r={6} />
          <path d={crop} />
        </g>
      );
    case 'slick':
      return (
        <g>
          <path className="us-ink" fill={color} d={crop} />
          <path d="M-9,-170 Q0,-174 9,-170 M-11,-163 Q0,-167 11,-163" fill="none" stroke="#e6e9ee" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case 'crop':
    default:
      return <path className="us-ink" fill={color} d={crop} />;
  }
}

const ARM_L = 'M-21,-140 C-29,-136 -31,-118 -29,-100 L-20,-98 C-20,-112 -19,-124 -16,-132 Z';
const ARM_R = 'M21,-140 C29,-136 31,-118 29,-100 L20,-98 C20,-112 19,-124 16,-132 Z';
/** Arm bent with the hand on the hip (right side; mirror for left). */
const AKIMBO = 'M20,-137 L37,-116 L23,-93';
/** Arm hanging straight down to hold something at the hip. */
const ARM_DOWN_R = 'M21,-140 C29,-136 32,-118 33,-96 L25,-94 C23,-112 19,-124 16,-132 Z';

export function GuyFigure({ look, hoodie, quirk = 'normal', turn = 0, talking, propSide = 1, straddle = 0 }: GuyFigureProps) {
  const s = heightScale(look.height);
  const wide = quirk === 'splasher';
  const suit = quirk === 'boss';
  const prop = quirk === 'boss' ? 'coffee' : quirk === 'drunk' ? 'beer' : quirk === 'facetime' ? 'phone' : null;
  const shoe = hoodie ? '#f4f4f4' : SHOE;
  const legs = legPose(straddle, wide);
  const akimbo = quirk === 'gassy';
  const footX = legs.footX;
  const torso = hoodie
    ? 'M-20,-144 C-26,-144 -26,-137 -25,-131 L-21,-76 L21,-76 L25,-131 C26,-137 26,-144 20,-144 Z'
    : suit
      ? 'M-21,-144 C-27,-144 -27,-137 -26,-131 L-22,-70 L22,-70 L26,-131 C27,-137 27,-144 21,-144 Z'
      : quirk === 'drunk'
        ? 'M-19,-143 C-24,-143 -24,-137 -23,-131 L-21,-72 L-8,-74 L4,-71 L21,-74 L23,-131 C24,-137 24,-143 19,-143 Z'
        : 'M-19,-143 C-24,-143 -24,-137 -23,-131 L-19,-78 L19,-78 L23,-131 C24,-137 24,-143 19,-143 Z';
  // The prop hand hangs down at the hip; mirrored via scale(-1,1) for the left hand.
  const propArm = prop === 'phone' ? (
    <g transform={propSide < 0 ? 'scale(-1,1)' : undefined}>
      {/* arm raised out to the side, holding the phone at arm's length */}
      <path d="M19,-138 L33,-147 L39,-156" fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19,-138 L33,-147 L39,-156" fill="none" stroke={look.shirtShade} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ) : prop ? (
    <g transform={propSide < 0 ? 'scale(-1,1)' : undefined}>
      <path className="us-ink" fill={look.shirtShade} d={ARM_DOWN_R} />
      {prop === 'coffee' ? (
        <g>
          <path className="us-ink" fill="#fff" d="M23,-90 L35,-90 L33.5,-72 L24.5,-72 Z" />
          <rect x={24} y={-85} width={10} height={6} fill="#a0703f" />
          <rect className="us-ink" x={22} y={-93} width={14} height={4} rx={1.5} fill="#e9e3d8" strokeWidth={1.6} />
          <circle className="us-ink" cx={29} cy={-91} r={4} fill={look.skin} />
        </g>
      ) : (
        <g>
          <path className="us-ink" fill="#7a4a12" d="M27,-97 L31,-97 L31,-88 L34,-82 L34,-60 Q34,-57 31,-57 L27,-57 Q24,-57 24,-60 L24,-82 L27,-88 Z" strokeWidth={1.8} />
          <rect x={24.8} y={-77} width={8.4} height={8} fill="#f1e2b8" />
          <circle className="us-ink" cx={29} cy={-93} r={4.2} fill={look.skin} />
        </g>
      )}
    </g>
  ) : null;
  return (
    <g transform={`scale(${s})`}>
      {/* shoes */}
      <ellipse className="us-ink" cx={-footX} cy={-4} rx={9} ry={5} fill={shoe} />
      <ellipse className="us-ink" cx={footX} cy={-4} rx={9} ry={5} fill={shoe} />
      {/* pants */}
      <path className="us-ink" fill={look.pants} d={legs.pants} />
      <g transform={legs.drop ? `translate(0,${legs.drop.toFixed(2)})` : undefined}>
      {/* torso */}
      <path className="us-ink" fill={look.shirt} d={torso} />
      {hoodie && <path d="M-20,-86 L20,-86 L21,-76 L-21,-76 Z" fill={look.shirtShade} />}
      {suit && <path d="M0,-70 L0,-96" stroke="#151922" strokeWidth={2} />}
      {/* arms (bent forward, so we mostly see the upper arms) */}
      {akimbo ? (
        // hands on hips, elbows out: relaxed and unbothered
        [-1, 1].map((sx) => (
          <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
            <path d={AKIMBO} fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
            <path d={AKIMBO} fill="none" stroke={look.shirtShade} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
            <circle className="us-ink" cx={21} cy={-91} r={4.2} fill={look.skin} />
          </g>
        ))
      ) : (
        <>
          {prop && propSide < 0 ? null : <path className="us-ink" fill={look.shirtShade} d={ARM_L} />}
          {prop && propSide > 0 ? null : <path className="us-ink" fill={look.shirtShade} d={ARM_R} />}
        </>
      )}
      {propArm}
      {/* neck */}
      <rect className="us-ink" x={-6} y={-153} width={12} height={12} fill={look.skin} />
      {hoodie && <path className="us-ink" fill={look.shirtShade} d="M-17,-146 Q0,-156 17,-146 Q14,-134 0,-132 Q-14,-134 -17,-146 Z" />}
      {suit && (
        <g>
          {/* white shirt collar above the jacket, red tie flipped over the shoulder */}
          <path className="us-ink" fill="#fff" d="M-9,-142 L-8,-149 L8,-149 L9,-142 L0,-139 Z" strokeWidth={1.8} />
          <path className="us-ink" fill={QUIRK_STYLE.boss.color} d="M5,-145 L11,-146 L17,-124 L13,-117 L9,-123 Z" strokeWidth={1.8} />
        </g>
      )}
      {/* head */}
      <g transform={turn ? `translate(${turn * 2},0)` : undefined}>
        {turn === 0 ? (
          <>
            <ellipse className="us-ink" cx={-14} cy={-161} rx={3.5} ry={5} fill={look.skin} />
            <ellipse className="us-ink" cx={14} cy={-161} rx={3.5} ry={5} fill={look.skin} />
          </>
        ) : (
          <circle className="us-ink" cx={turn * 14} cy={-159} r={3.8} fill={look.skin} />
        )}
        <circle className="us-ink" cx={0} cy={-163} r={14} fill={look.skin} />
        {turn === 0 ? (
          <Hair look={look} />
        ) : (
          <g>
            <g transform={`translate(${-turn * 6},0)`}>
              <Hair look={look} />
            </g>
            <ellipse className="us-ink" cx={-turn * 2} cy={-161} rx={3} ry={4.5} fill={look.skin} strokeWidth={1.6} />
            <circle cx={turn * 8.5} cy={-166} r={1.7} fill="#1d1d22" />
            {talking ? (
              <ellipse cx={turn * 10.5} cy={-155.5} rx={2.8} ry={2.4} fill="#5a1d1d" stroke="#1d1d22" strokeWidth={1.2} />
            ) : (
              <path d={`M${turn * 8},-155.5 L${turn * 12},-155.5`} stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
            )}
          </g>
        )}
      </g>
      {prop === 'phone' && (
        <g transform={`translate(${propSide * PHONE_X},${PHONE_Y}) rotate(${propSide * 8})`}>
          <FaceTimePhone />
          <circle className="us-ink" cx={-propSide * 2} cy={14} r={4.4} fill={look.skin} />
        </g>
      )}
      </g>
    </g>
  );
}

/** Phone centre relative to the FaceTime guy's feet (unscaled; multiply by heightScale). */
export const PHONE_X = 45;
export const PHONE_Y = -166;

/** A phone on a video call: grandma on screen, smiling and waving. Centred at (0, 0). */
export function FaceTimePhone() {
  return (
    <g className="us-phone">
      <rect className="us-ink" x={-12} y={-18} width={24} height={36} rx={4.5} fill="#1f2228" />
      <rect x={-9.5} y={-14.5} width={19} height={29} rx={2} fill="#bfe3f2" />
      {/* grandma: cardigan, face, grey bun, glasses, smile, waving hand */}
      <path d="M-8,14.5 Q-8,5 0,5 Q8,5 8,14.5 Z" fill="#c77d9a" />
      <circle cx={0} cy={-1.5} r={5.2} fill="#b97a52" />
      <path d="M-5.4,-2.2 Q-5.6,-7.8 0,-7.6 Q5.6,-7.8 5.4,-2.2 Q3.5,-5.2 0,-5.2 Q-3.5,-5.2 -5.4,-2.2 Z" fill="#d6d6d6" />
      <circle cx={0} cy={-9.6} r={2.6} fill="#d6d6d6" stroke="#9a9a9a" strokeWidth={0.6} />
      <circle cx={-2.1} cy={-1.6} r={1.55} fill="none" stroke="#2b2b2b" strokeWidth={0.75} />
      <circle cx={2.1} cy={-1.6} r={1.55} fill="none" stroke="#2b2b2b" strokeWidth={0.75} />
      <path d="M-0.55,-1.6 L0.55,-1.6" stroke="#2b2b2b" strokeWidth={0.7} />
      <path d="M-1.8,1.3 Q0,2.9 1.8,1.3" fill="none" stroke="#5a2a1a" strokeWidth={0.8} strokeLinecap="round" />
      <path d="M5.5,7 L7,0.5" stroke="#b97a52" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={7.2} cy={-0.6} r={1.8} fill="#b97a52" />
      <rect x={-3} y={-16.8} width={6} height={1.2} rx={0.6} fill="#555" />
    </g>
  );
}

/** The gassy guy's always-on stink: soft green puffs drifting toward `dir` (local coords, feet at 0). */
export function StinkCloud({ dir }: { dir: -1 | 1 }) {
  const puffs: readonly (readonly [number, number, number])[] = [
    [14, -86, 5.5],
    [28, -98, 7],
    [43, -110, 8.5],
  ];
  return (
    <g className="us-stink" aria-hidden="true">
      {puffs.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${dir * x},${y})`}>
          <g className="us-puff" style={{ '--dir': dir, animationDelay: `${-i * 0.9}s` } as CSSProperties}>
            <circle r={r} className="us-gas" />
            <circle cx={dir * r * 0.55} cy={-r * 0.35} r={r * 0.62} className="us-gas" />
          </g>
        </g>
      ))}
      <g className="us-stink-lines" transform={`translate(${dir * 30},-122)`}>
        <path d="M0,0 q3,-4 0,-8 q-3,-4 0,-8" />
        <path d="M9,4 q3,-4 0,-8 q-3,-4 0,-8" transform={dir < 0 ? 'translate(-18,0)' : undefined} />
      </g>
    </g>
  );
}

/** Reveal: a big green cloud engulfing "you" (local coords, your feet at 0). */
export function GasEngulf() {
  const puffs: readonly (readonly [number, number, number])[] = [
    [0, -128, 19],
    [-20, -150, 16],
    [18, -158, 17],
    [-22, -108, 14],
    [22, -112, 15],
    [0, -178, 13],
    [-6, -84, 13],
    [14, -86, 11],
  ];
  return (
    <g className="us-engulf" aria-hidden="true">
      {puffs.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} className="us-gas us-gas-big" />
      ))}
    </g>
  );
}

/** Reveal: a little "PFFT" burst, centred at (x, y). */
export function PfftBurst({ x, y }: { x: number; y: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = i % 2 === 0 ? 19 : 13;
    pts.push(`${(Math.cos(a) * r * 1.25).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return (
    <g className="us-pfft" transform={`translate(${x},${y}) rotate(-8)`}>
      <polygon className="us-ink" points={pts.join(' ')} fill="#e4f07a" />
      <text className="us-pfft-text" textAnchor="middle" dominantBaseline="central" y={0.5}>
        PFFT
      </text>
    </g>
  );
}

/** Width of a quirk chip (viewBox units); fits inside one slot pitch. */
export const CHIP_W = 66;

/** Quirk chip above a guy's head: emoji disc + coloured label. Bottom centre at (x, y). */
export function QuirkChip({ x, y, quirk }: { x: number; y: number; quirk: Quirk }) {
  const st = QUIRK_STYLE[quirk];
  if (!st.tag) return null;
  const w = CHIP_W;
  const h = 18;
  const squeeze = st.tag.length > 6 ? { textLength: w - 10, lengthAdjust: 'spacingAndGlyphs' as const } : {};
  return (
    <g className={`us-chip us-chip-${quirk}`} transform={`translate(${x},${y})`}>
      <rect className="us-chip-box" x={-w / 2} y={-h} width={w} height={h} rx={9} fill={st.color} />
      <text className="us-chip-text" x={0} y={-h / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fill={st.ink} {...squeeze}>
        {st.tag}
      </text>
      <circle className="us-chip-disc" cx={0} cy={-h - 9} r={10.5} fill="#fff" stroke={st.color} />
      <text className="us-emoji" x={0} y={-h - 8} textAnchor="middle" dominantBaseline="central" fontSize={12.5}>
        {st.emoji}
      </text>
    </g>
  );
}

/** Horizontal speech bubble beside a head: tail tip at (x, y), bubble extends toward `dir`. */
export function SideBubble({ x, y, text, dir, small }: { x: number; y: number; text: string; dir: -1 | 1; small?: boolean }) {
  const fs = small ? 10 : 13;
  const w = Math.max(20, Math.round(text.length * fs * 0.6) + 10);
  const h = small ? 16 : 19;
  const bx = dir > 0 ? x + 5 : x - 5 - w;
  const by = y - h + 3;
  const edge = dir > 0 ? bx : bx + w;
  return (
    <g className="us-bubble">
      <path className="us-ink" d={`M${edge + dir * 1},${by + h - 9} L${x},${y + 2} L${edge + dir * 8},${by + h - 1} Z`} fill="#fff" />
      <rect className="us-ink" x={bx} y={by} width={w} height={h} rx={h / 2} fill="#fff" />
      <path d={`M${edge + dir * 2.2},${by + h - 8} L${x + dir * 2.5},${y} L${edge + dir * 7},${by + h - 2.2} Z`} fill="#fff" />
      <text
        className={small ? 'us-bubble-text us-bubble-text-sm' : 'us-bubble-text'}
        x={bx + w / 2}
        y={by + h / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {text}
      </text>
    </g>
  );
}

/** The splasher's standing puddle with a few droplets around his feet (local coords, feet at 0). */
export function SplashPuddle() {
  const drops: readonly (readonly [number, number, number, number])[] = [
    [-31, -16, 0.8, -25],
    [-23, -28, 0.65, -15],
    [31, -18, 0.8, 25],
    [23, -30, 0.65, 15],
  ];
  return (
    <g className="us-splash">
      <path d="M-34,2 C-38,-6 -14,-9 0,-7 C16,-10 38,-6 34,3 C30,10 -28,11 -34,2 Z" fill="#9ed3f5" stroke="#2c7fc0" strokeWidth={1.8} />
      <ellipse cx={-14} cy={-1} rx={8} ry={1.8} fill="#fff" opacity={0.8} />
      {drops.map(([dx, dy, k, rot], i) => (
        <path
          key={i}
          transform={`translate(${dx},${dy}) scale(${k}) rotate(${rot})`}
          d="M0,-6 C3,-1 4,2 0,5 C-4,2 -3,-1 0,-6 Z"
          fill="#58aee8"
          stroke="#2c6fa3"
          strokeWidth={1.4}
        />
      ))}
    </g>
  );
}

/** y (local, feet = 0) of the top of a guy's head, scaled. */
export function guyTop(height: number): number {
  return -GUY_H * heightScale(height);
}

/** Little "YOU" tag above the player, tip at (0, y). */
export function YouTag({ y }: { y: number }) {
  return (
    <g className="us-you-tag" transform={`translate(0,${y})`}>
      <rect x={-17} y={-21} width={34} height={16} rx={5} fill="#1d1d22" />
      <path d="M-4,-5.5 L0,0 L4,-5.5 Z" fill="#1d1d22" />
      <text x={0} y={-12.5} textAnchor="middle" dominantBaseline="central" fill="#ffd23f">
        YOU
      </text>
    </g>
  );
}

/** A few blue droplets arcing from a splasher (at x=0) toward `dir`. */
export function Droplets({ dir }: { dir: -1 | 1 }) {
  const drops: [number, number, number][] = [
    [26, -96, 1],
    [38, -80, 0.85],
    [48, -60, 0.75],
    [55, -38, 0.65],
  ];
  return (
    <g className="us-droplets">
      {drops.map(([dx, y, k], i) => (
        <path
          key={i}
          transform={`translate(${dir * dx},${y}) scale(${k}) rotate(${dir * 35})`}
          d="M0,-6 C3,-1 4,2 0,5 C-4,2 -3,-1 0,-6 Z"
          fill="#58aee8"
          stroke="#2c6fa3"
          strokeWidth={1.2}
        />
      ))}
    </g>
  );
}
