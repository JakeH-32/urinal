// A guy seen from behind, standing facing the wall. Local coords: feet centre at (0, 0), y up is negative.
import { useId, type CSSProperties, type ReactNode } from 'react';
import type { BossMood, Quirk, Side } from '../types';
import { FEET_Y, GUY_H, heightScale } from './geometry';
import {
  BUTTON_DOWN,
  CRYPTO_GOLD,
  FUR_DARK,
  GLOVE_YELLOW,
  LETTERMAN_GOLD,
  LETTERMAN_LEATHER,
  LETTERMAN_WOOL,
  MASK_BLUE,
  SECURITY_GOLD,
  SECURITY_NAVY,
  KNIGHT_PLUME,
  STEEL,
  STEEL_DARK,
  OXFORD,
  PILOT_GOLD,
  PILOT_NAVY,
  PILOT_SHIRT,
  QUIRK_STYLE,
  SHOE,
  TREK_BOOT,
  TREK_HAT,
  shade,
  type FriendVariant,
  type ResolvedLook,
} from './looks';
import { legPose } from './pose';

interface GuyFigureProps {
  look: ResolvedLook;
  /** Yellow hoodie with a hood (the player). */
  hoodie?: boolean;
  /** Drives silhouette + props (suit and coffee, beer bottle, wide stance, vest, collar and Bible, side-eye). */
  quirk?: Quirk;
  /** Head turned to the side in profile: -1 left, 1 right. */
  turn?: -1 | 0 | 1;
  /** Mouth open (talker). */
  talking?: boolean;
  /** Which hand holds the prop (beer / coffee / FaceTime phone). */
  propSide?: -1 | 1;
  /** 0..1: legs spread wide over a puddle, knees slightly bent (1 = full straddle). */
  straddle?: number;
  /** Friends only: which friend (the local legend, the guy buying the round, Dave). */
  friend?: FriendVariant;
  /** Gym Bro: arm stretched over the next urinal on his `lean` side (false = a tight flex, the neighbour's taken). */
  flexReach?: boolean;
  /** Gym Bro: room for his other arm out over his own sink (false = tight, a neighbour's there). */
  flexRoom?: boolean;
  /** Head nods (Dave, at you). */
  nod?: boolean;
}

/** `turn`: the head is in profile (the caller has already shifted the hair toward the back of the head). */
function Hair({ look, turn = 0 }: { look: ResolvedLook; turn?: -1 | 0 | 1 }) {
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
    case 'fringe':
      // Horseshoe: shiny bald crown, one brave comb-over strand, a fluffy band round the back with
      // tufts puffing out over the ears.
      if (turn) {
        // In profile: drawn facing right, then undo the caller's shift and mirror for a left turn.
        return (
          <g transform={`translate(${turn * 6},0) scale(${turn},1)`}>
            <path
              className="us-ink"
              fill={color}
              d="M1.5,-165.5 Q-3,-170 -9.5,-169.5 Q-17.5,-169 -16,-160.5 Q-15.5,-153 -10,-151.5 Q-4,-151 -0.5,-155 Q2.5,-160 1.5,-165.5 Z"
            />
            <ellipse cx={2} cy={-172.5} rx={4.5} ry={2.4} fill="#fff" opacity={0.55} />
            <path d="M-9,-169.5 Q-2,-177.5 7,-173" fill="none" stroke={shade(color, 0.22)} strokeWidth={1.3} strokeLinecap="round" />
          </g>
        );
      }
      return (
        <g>
          <path
            className="us-ink"
            fill={color}
            d="M-16.2,-161 Q-18.5,-169.5 -12.5,-169 Q-8.8,-169.2 -7.5,-165.5 Q-3.8,-166.8 -2.5,-162.8 Q0,-165.8 2.5,-162.8 Q3.8,-166.8 7.5,-165.5 Q8.8,-169.2 12.5,-169 Q18.5,-169.5 16.2,-161 Q17,-156.5 13.4,-153.5 Q0,-148.5 -13.4,-153.5 Q-17,-156.5 -16.2,-161 Z"
          />
          <ellipse cx={-4} cy={-172} rx={4.5} ry={2.4} fill="#fff" opacity={0.55} />
          <path d="M-9,-168 Q-1,-177.5 9.5,-170.5" fill="none" stroke={shade(color, 0.22)} strokeWidth={1.3} strokeLinecap="round" />
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
const TORSO = 'M-19,-143 C-24,-143 -24,-137 -23,-131 L-19,-78 L19,-78 L23,-131 C24,-137 24,-143 19,-143 Z';

/** Argyle on the back of the in-law's sweater vest: two-tone diamonds, a ribbed hem. Clipped to the torso. */
function VestBack({ color }: { color: string }) {
  const clip = `us-vest-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const light = shade(color, -0.24); // negative amt lightens
  const diamonds: [number, number][] = [
    [-22, -128],
    [0, -128],
    [22, -128],
    [-11, -106],
    [11, -106],
  ];
  return (
    <g>
      <clipPath id={clip}>
        <path d={TORSO} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {diamonds.map(([x, y]) => (
          <path key={`${x},${y}`} d={`M${x},${y - 11} L${x + 11},${y} L${x},${y + 11} L${x - 11},${y} Z`} fill={light} />
        ))}
        <path d="M-22,-139 L11,-95 M22,-139 L-11,-95 M0,-139 L-22,-110 M0,-139 L22,-110" fill="none" stroke={OXFORD} strokeWidth={0.9} opacity={0.75} />
        <rect x={-24} y={-87} width={48} height={9} fill={shade(color, 0.16)} />
        {[-15, -10, -5, 0, 5, 10, 15].map((x) => (
          <path key={x} d={`M${x},-86 V-79`} stroke={shade(color, 0.34)} strokeWidth={1} />
        ))}
      </g>
    </g>
  );
}

/** The rookie is drawn bigger than anyone, with long legs, so his head touches the top of the scene. */
export const ROOKIE_SCALE = 1.2;
/** How far (unscaled) a hunched guy's head sinks into his shoulders. */
const HUNCH: Partial<Record<Quirk, number>> = { shy: 8, rookie: 5 };

/** Overall figure scale (the rookie and Bigfoot are bigger than the usual three heights). */
export function figureScale(quirk: Quirk, height: number): number {
  if (quirk === 'rookie') return ROOKIE_SCALE;
  if (quirk === 'bigfoot') return 1.12;
  // Gym Bro is always mid-height, so his head sits just under the mirror (where his reflection flexes).
  if (quirk === 'gymbro') return 1;
  return heightScale(height);
}

/** Vertical stretch of the legs (1 = normal). The rookie's put his head at the top edge. */
export function legStretch(quirk: Quirk): number {
  if (quirk !== 'rookie') return 1;
  return 1 + ((FEET_Y - 1) / ROOKIE_SCALE - (GUY_H - (HUNCH.rookie ?? 0))) / 84;
}

/** Extra (unscaled) height of the head over a standard guy: long legs raise it, a hunch lowers it. */
export function figureRise(quirk: Quirk): number {
  return 84 * (legStretch(quirk) - 1) - (HUNCH[quirk] ?? 0);
}

/** Scale the y of every "x,y" pair in a path (the legs path is all absolute pairs). */
function stretchY(d: string, k: number): string {
  if (k === 1) return d;
  return d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x: string, y: string) => `${x},${Math.round(parseFloat(y) * k * 100) / 100}`);
}

/**
 * Gym Bro's front double biceps (right arm; mirror for left): upper arm out at shoulder height,
 * forearm straight up, fist up by his head.
 *   reach: out over the next urinal's left rim, fist above it, clear of that urinal's pipe and valve
 *   sink:  over his own sink, stays inside his slot plus the end pad (safe at an end slot)
 *   tight: a neighbour's there, so the arm stays close to his head
 */
const FLEX = {
  reach: { elbow: [54, -146], fist: [55, -180] },
  sink: { elbow: [42, -145], fist: [42, -178] },
  tight: { elbow: [30, -150], fist: [27, -179] },
} as const;
const FLEX_SHOULDER = [21, -138] as const;

/** Bigfoot's long arms, hanging to his knees. */
const ARM_LONG = 'M21,-141 C32,-137 36,-112 37,-66 L27,-64 C25,-98 19,-124 16,-132 Z';

export function GuyFigure({ look, hoodie, quirk = 'normal', turn = 0, talking, propSide = 1, straddle = 0, friend, flexReach = true, flexRoom = true, nod }: GuyFigureProps) {
  const s = figureScale(quirk, look.height);
  const k = legStretch(quirk);
  const hunch = HUNCH[quirk] ?? 0;
  // Wide stance: the splasher, and Gym Bro planted at the sink (the sink's pedestal shows between his feet).
  const wide = quirk === 'splasher' || quirk === 'gymbro';
  const suit = quirk === 'boss';
  const fur = quirk === 'bigfoot';
  const knight = quirk === 'knight';
  const prop =
    quirk === 'boss'
      ? 'coffee'
      : quirk === 'drunk'
        ? 'beer'
        : quirk === 'facetime'
          ? 'phone'
          : quirk === 'pastor'
            ? 'bible'
            : quirk === 'finance'
              ? 'speaker'
              : quirk === 'security'
                ? 'flashlight'
                : quirk === 'friend' && friend === 'legend'
                  ? 'napkin'
                  : quirk === 'friend' && friend === 'round'
                    ? 'wallet'
                    : null;
  // The crypto bro wears a hoodie too (hood down), cut like yours.
  const hooded = hoodie || quirk === 'crypto';
  const sleeve = look.sleeve ?? look.shirtShade;
  // The peeper cranes his neck toward whatever he's looking at.
  const peek = quirk === 'peeper' && turn !== 0;
  const shoe = hoodie ? '#f4f4f4' : quirk === 'tourist' ? TREK_BOOT : knight ? STEEL_DARK : SHOE;
  const legs = legPose(straddle, wide);
  // Gassy: relaxed and unbothered. The full dropper: hands on hips, proud of it.
  const akimbo = quirk === 'gassy' || quirk === 'dropper';
  const footX = legs.footX;
  const torso = hooded
    ? 'M-20,-144 C-26,-144 -26,-137 -25,-131 L-21,-76 L21,-76 L25,-131 C26,-137 26,-144 20,-144 Z'
    : suit || fur || knight
      ? 'M-21,-144 C-27,-144 -27,-137 -26,-131 L-22,-70 L22,-70 L26,-131 C27,-137 27,-144 21,-144 Z'
      : quirk === 'drunk'
        ? 'M-19,-143 C-24,-143 -24,-137 -23,-131 L-21,-72 L-8,-74 L4,-71 L21,-74 L23,-131 C24,-137 24,-143 19,-143 Z'
        : TORSO;
  const mirror = (side: number) => (side < 0 ? 'scale(-1,1)' : undefined);
  // The prop hand hangs down at the hip; mirrored via scale(-1,1) for the left hand.
  const propArm = prop === 'speaker' ? (
    <g transform={mirror(propSide)}>
      {/* arm bent out to the side, phone held flat-ish at waist height, on speaker */}
      <path d="M19,-138 L31,-120 L37,-103" fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19,-138 L31,-120 L37,-103" fill="none" stroke={sleeve} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
      <SpeakerPhone />
      <circle className="us-ink" cx={37} cy={-100} r={4.2} fill={look.skin} />
    </g>
  ) : prop === 'flashlight' ? (
    <g transform={mirror(propSide)}>
      {/* arm out to the side, flashlight held level and aimed (the beam is drawn by the scene) */}
      <path d="M19,-138 L31,-118 L40,-106" fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19,-138 L31,-118 L40,-106" fill="none" stroke={sleeve} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(40,-106) rotate(-12)">
        <rect className="us-ink" x={-2} y={-3.5} width={20} height={7} rx={2} fill="#2b2f36" strokeWidth={1.6} />
        <rect className="us-ink" x={16} y={-5} width={6} height={10} rx={1.5} fill="#3a3f47" strokeWidth={1.6} />
        <rect x={21} y={-3.6} width={1.8} height={7.2} fill="#fff6c2" />
      </g>
      <circle className="us-ink" cx={40} cy={-105} r={4.2} fill={look.skin} />
    </g>
  ) : prop === 'phone' ? (
    <g transform={mirror(propSide)}>
      {/* arm raised out to the side, holding the phone at arm's length */}
      <path d="M19,-138 L33,-147 L39,-156" fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19,-138 L33,-147 L39,-156" fill="none" stroke={look.shirtShade} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ) : prop ? (
    <g transform={mirror(propSide)}>
      <path className="us-ink" fill={sleeve} d={ARM_DOWN_R} />
      {prop === 'coffee' ? (
        <g>
          <path className="us-ink" fill="#fff" d="M23,-90 L35,-90 L33.5,-72 L24.5,-72 Z" />
          <rect x={24} y={-85} width={10} height={6} fill="#a0703f" />
          <rect className="us-ink" x={22} y={-93} width={14} height={4} rx={1.5} fill="#e9e3d8" strokeWidth={1.6} />
          <circle className="us-ink" cx={29} cy={-91} r={4} fill={look.skin} />
        </g>
      ) : prop === 'bible' ? (
        <g>
          {/* a small Bible carried by the spine: burgundy cover, gold cross, page edges */}
          <rect className="us-ink" x={22} y={-91} width={14} height={20} rx={1.6} fill="#6e1d2a" strokeWidth={1.8} />
          <rect x={33.2} y={-89.5} width={1.6} height={17} fill="#f1e6cc" />
          <path d="M28.5,-84 V-74.5 M25,-81 H32" stroke="#e2b84a" strokeWidth={1.9} strokeLinecap="round" />
          <circle className="us-ink" cx={29} cy={-91.5} r={4.2} fill={look.skin} />
        </g>
      ) : prop === 'napkin' ? (
        <g>
          {/* a bar napkin he's about to sign for you */}
          <path className="us-ink" fill="#ffffff" d="M22,-90 L37,-92 L38,-76 Q31,-73 24,-75 Z" strokeWidth={1.6} />
          <path d="M25,-84 Q30,-86 35,-84 M25.5,-80 Q30,-81.5 34,-80" fill="none" stroke="#9aa7b3" strokeWidth={1} />
          <circle className="us-ink" cx={29} cy={-92} r={4.2} fill={look.skin} />
        </g>
      ) : prop === 'wallet' ? (
        <g>
          {/* wallet out, cash showing: this round's on him */}
          <rect x={24.5} y={-96} width={11} height={7} rx={1} fill="#7fbf6a" stroke="#2f5d25" strokeWidth={1.1} />
          <rect className="us-ink" x={22} y={-91} width={15} height={12} rx={2} fill="#6e4a2a" strokeWidth={1.7} />
          <path d="M22.5,-85 H36.5" stroke="#4a301a" strokeWidth={1.2} />
          <circle className="us-ink" cx={29} cy={-91} r={4.2} fill={look.skin} />
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

  let arms: ReactNode;
  if (quirk === 'gymbro') {
    // One flexed arm: ink outline, the bicep peak, skin over the join, wristband, fist.
    const flexArm = (side: number, pose: keyof typeof FLEX) => {
      const [sx, sy] = FLEX_SHOULDER;
      const [ex, ey] = FLEX[pose].elbow;
      const [fx, fy] = FLEX[pose].fist;
      const len = Math.hypot(ex - sx, ey - sy);
      const ang = (Math.atan2(ey - sy, ex - sx) * 180) / Math.PI;
      // the peak sits on top of the upper arm, a little past its middle
      const bx = sx + (ex - sx) * 0.55 + ((ey - sy) / len) * 5;
      const by = sy + (ey - sy) * 0.55 - ((ex - sx) / len) * 5;
      const upper = `M${sx},${sy} L${ex},${ey}`;
      const fore = `M${ex},${ey} L${fx},${fy}`;
      const band = `M${fx + (ex - fx) * 0.32},${fy + (ey - fy) * 0.32} L${fx + (ex - fx) * 0.5},${fy + (ey - fy) * 0.5}`;
      const r = pose === 'tight' ? 10 : 12;
      return (
        <g key={side} transform={mirror(side)}>
          <path d={`${upper} L${fx},${fy}`} fill="none" stroke="var(--us-ink)" strokeWidth={19} strokeLinecap="round" strokeLinejoin="round" />
          <ellipse className="us-ink" cx={bx} cy={by} rx={r} ry={8.5} transform={`rotate(${ang},${bx},${by})`} fill={look.skin} />
          <path d={upper} fill="none" stroke={look.skin} strokeWidth={14.8} strokeLinecap="round" />
          <path d={fore} fill="none" stroke={look.skin} strokeWidth={12.6} strokeLinecap="round" />
          <ellipse cx={bx} cy={by + 1.4} rx={r - 1.4} ry={7.1} transform={`rotate(${ang},${bx},${by + 1.4})`} fill={look.skin} />
          <path d={`M${sx + 3},${sy + 3} Q${(sx + ex) / 2},${(sy + ey) / 2 + 6} ${ex - 3},${ey + 4}`} fill="none" stroke={shade(look.skin, 0.16)} strokeWidth={1.3} strokeLinecap="round" />
          <path d={band} stroke={QUIRK_STYLE.gymbro.color} strokeWidth={12.6} />
          <circle className="us-ink" cx={fx} cy={fy} r={7.8} fill={look.skin} />
          {pose === 'reach' && <path d="M65,-187 L70,-191 M66,-178 L72,-178" stroke="var(--us-ink)" strokeWidth={1.6} strokeLinecap="round" />}
        </g>
      );
    };
    // Both arms up and flexed: his flex side reaches over the next urinal, the other over his own sink.
    arms = (
      <g>
        {flexArm(-propSide, flexRoom ? 'sink' : 'tight')}
        {flexArm(propSide, flexReach ? 'reach' : 'tight')}
      </g>
    );
  } else if (quirk === 'germ') {
    arms = [-1, 1].map((sx) => (
      <g key={sx} transform={mirror(sx)}>
        <path className="us-ink" fill={sleeve} d={ARM_DOWN_R} />
        {/* the right hand holds a spray bottle of disinfectant */}
        {sx > 0 && (
          <g>
            <path className="us-ink" fill="#ffffff" d="M26,-106 L36,-106 L37,-101 L26,-101 Z" strokeWidth={1.5} />
            <path d="M36,-104.5 L40,-104.5" stroke="var(--us-ink)" strokeWidth={2} strokeLinecap="round" />
            <rect className="us-ink" x={28.5} y={-101} width={5} height={5} fill="#ffffff" strokeWidth={1.3} />
            <rect className="us-ink" x={25} y={-96} width={13} height={28} rx={3} fill="#bfe6f7" strokeWidth={1.7} />
            <rect x={27} y={-80} width={9} height={7} fill="#ffffff" opacity={0.85} />
          </g>
        )}
        {/* yellow rubber gloves, cuffs up past the wrist */}
        <path className="us-ink" fill={GLOVE_YELLOW} d="M22.5,-99 L35.5,-99 L35,-92 L23,-92 Z" strokeWidth={1.6} />
        <rect className="us-ink" x={23.5} y={-93} width={11} height={11} rx={4.5} fill={GLOVE_YELLOW} strokeWidth={1.7} />
      </g>
    ));
  } else if (fur) {
    arms = [-1, 1].map((sx) => (
      <g key={sx} transform={mirror(sx)}>
        <path className="us-ink" fill={sleeve} d={ARM_LONG} />
        <path d="M34,-118 l4,2 l-3.5,3 l4,3 M35,-96 l4,2 l-3.5,3 l4,3" fill="none" stroke={look.shirtShade} strokeWidth={1.6} strokeLinejoin="round" />
        <ellipse className="us-ink" cx={32} cy={-62} rx={6} ry={8} fill={FUR_DARK} />
      </g>
    ));
  } else if (akimbo) {
    arms = [-1, 1].map((sx) => (
      <g key={sx} transform={mirror(sx)}>
        <path d={AKIMBO} fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
        <path d={AKIMBO} fill="none" stroke={look.shirtShade} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
        <circle className="us-ink" cx={21} cy={-91} r={4.2} fill={look.skin} />
      </g>
    ));
  } else {
    arms = (
      // the shy guy keeps his elbows tucked in
      <g transform={quirk === 'shy' ? 'scale(0.9,1)' : undefined}>
        {prop && propSide < 0 ? null : <path className="us-ink" fill={sleeve} d={ARM_L} />}
        {prop && propSide > 0 ? null : <path className="us-ink" fill={sleeve} d={ARM_R} />}
        {quirk === 'rookie' && <SleeveStripes propSide={prop ? propSide : 0} />}
        {knight && <KnightArms />}
      </g>
    );
  }

  const top = -84 * k;
  return (
    <g transform={`scale(${s})`}>
      {/* shoes (the tourist's are chunky hiking boots, Bigfoot's are his own big feet) */}
      {quirk === 'tourist' ? (
        [-1, 1].map((sx) => (
          <g key={sx}>
            <path className="us-ink" fill={shoe} d={`M${sx * footX - 10},-1 L${sx * footX - 9},-11 Q${sx * footX},-14 ${sx * footX + 9},-11 L${sx * footX + 10},-1 Z`} />
            <path d={`M${sx * footX - 9.5},-3 H${sx * footX + 9.5}`} stroke="#2b1c10" strokeWidth={2.2} />
          </g>
        ))
      ) : fur ? (
        [-1, 1].map((sx) => (
          <g key={sx}>
            <ellipse className="us-ink" cx={sx * (footX + 5)} cy={-5} rx={16} ry={6.5} fill={FUR_DARK} />
            {[0, 1, 2].map((t) => (
              <circle key={t} className="us-ink" cx={sx * (footX + 17 + t * 0.5)} cy={-9 + t * 3.6} r={2.6} fill={FUR_DARK} strokeWidth={1.4} />
            ))}
          </g>
        ))
      ) : (
        <>
          <ellipse className="us-ink" cx={-footX} cy={-4} rx={knight ? 10.5 : 9} ry={5} fill={shoe} />
          <ellipse className="us-ink" cx={footX} cy={-4} rx={knight ? 10.5 : 9} ry={5} fill={shoe} />
        </>
      )}
      {/* pants (bare legs for the full dropper; fur for Bigfoot; plate for the knight) */}
      <path className="us-ink" fill={quirk === 'dropper' ? look.skin : look.pants} d={stretchY(legs.pants, k)} />
      {quirk === 'tourist' && <TrekPants footX={footX} color={look.pants} />}
      {quirk === 'rookie' && (
        <path d={`M-14.2,${top + 3} L-14.6,${-44 * k} L${-footX - 5},-9 M14.2,${top + 3} L14.6,${-44 * k} L${footX + 5},-9`} fill="none" stroke="#ffffff" strokeWidth={2} />
      )}
      {fur && (
        <path d={`M${-footX - 7},-10 l3,-4 l3,4 l3,-4 l3,4 M${footX - 5},-10 l3,-4 l3,4 l3,-4 l3,4`} fill="none" stroke={look.shirtShade} strokeWidth={1.6} />
      )}
      {knight && <KnightLegs footX={footX} />}
      {quirk === 'dropper' && <AnkleBunch footX={footX} color={look.pants} />}
      <g transform={legs.drop || k !== 1 ? `translate(0,${(legs.drop - 84 * (k - 1)).toFixed(2)})` : undefined}>
      {/* torso */}
      {quirk === 'gymbro' ? (
        <g>
          {/* broad bare shoulders tapering to a narrow waist (a V), then a racerback tank */}
          <path className="us-ink" fill={look.skin} d="M-28,-142 C-30,-149 -18,-153 -9,-152 L9,-152 C18,-153 30,-149 28,-142 L20,-104 L-20,-104 Z" />
          <path className="us-ink" fill={look.shirt} d="M-8,-152 L8,-152 L10,-140 Q20,-134 23,-122 L19,-78 L-19,-78 L-23,-122 Q-20,-134 -10,-140 Z" />
          <path d="M0,-138 V-96" stroke={shade(look.shirt, 0.2)} strokeWidth={1.2} />
        </g>
      ) : (
        <path className="us-ink" fill={look.shirt} d={torso} />
      )}
      {quirk === 'dropper' && <CensorMosaic skin={look.skin} />}
      {hooded && <path d="M-20,-86 L20,-86 L21,-76 L-21,-76 Z" fill={look.shirtShade} />}
      {quirk === 'crypto' && <CoinBack />}
      {quirk === 'tourist' && <ShellBack color={look.shirt} />}
      {quirk === 'finance' && <FleeceBack color={look.shirt} />}
      {quirk === 'twin' && <TwinStripes />}
      {quirk === 'security' && <SecurityBack />}
      {quirk === 'rookie' && <WarmupBack color={look.shirt} num={look.jersey} />}
      {quirk === 'friend' && friend === 'legend' && <LettermanBack />}
      {knight && <KnightBack />}
      {fur && (
        <path
          d="M-12,-128 l3,5 l3,-5 M5,-122 l3,5 l3,-5 M-8,-104 l3,5 l3,-5 M8,-96 l3,5 l3,-5 M-15,-86 l3,5 l3,-5"
          fill="none"
          stroke={look.shirtShade}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      )}
      {suit && <path d="M0,-70 L0,-96" stroke="#151922" strokeWidth={2} />}
      {quirk === 'inlaw' && <VestBack color={look.shirt} />}
      {/* arms (bent forward, so we mostly see the upper arms) */}
      {arms}
      {quirk === 'security' &&
        // gold shoulder badges
        [-1, 1].map((sx) => (
          <path key={sx} className="us-ink" fill={SECURITY_GOLD} transform={mirror(sx)} d="M22,-136 L28,-137 L29,-131 L25,-127 L21,-131 Z" strokeWidth={1.3} />
        ))}
      {propArm}
      {/* neck */}
      <rect
        className="us-ink"
        x={quirk === 'gymbro' ? -8 : -6}
        y={-153 + hunch}
        width={quirk === 'gymbro' ? 16 : 12}
        height={12 - hunch / 2}
        fill={knight ? STEEL_DARK : look.skin}
      />
      {hooded && <path className="us-ink" fill={look.shirtShade} d="M-17,-146 Q0,-156 17,-146 Q14,-134 0,-132 Q-14,-134 -17,-146 Z" />}
      {/* crypto: a gold chain round the back of the neck, over the hood */}
      {quirk === 'crypto' && (
        <path d="M-7.5,-150 Q-9,-142 0,-140.5 Q9,-142 7.5,-150" fill="none" stroke={CRYPTO_GOLD} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="2.2 1.2" />
      )}
      {/* tourist: the hood rolled up into the jacket collar */}
      {quirk === 'tourist' && (
        <path className="us-ink" fill={shade(look.shirt, 0.22)} d="M-12,-141 Q-12,-151 0,-151 Q12,-151 12,-141 Q0,-137.5 -12,-141 Z" strokeWidth={1.8} />
      )}
      {/* finance: the button-down's collar over the vest's fleece stand-up collar */}
      {quirk === 'finance' && (
        <g>
          <path className="us-ink" fill={shade(look.shirt, -0.12)} d="M-11,-140 L-10,-146 Q0,-148.5 10,-146 L11,-140 Q0,-137.5 -11,-140 Z" strokeWidth={1.8} />
          <path className="us-ink" fill={BUTTON_DOWN} d="M-8.5,-145 L-7.5,-151 L7.5,-151 L8.5,-145 L0,-143 Z" strokeWidth={1.7} />
        </g>
      )}
      {/* rookie and the local legend: a ribbed stand-up collar */}
      {(quirk === 'rookie' || (quirk === 'friend' && friend === 'legend')) && (
        <path
          className="us-ink"
          fill={quirk === 'rookie' ? '#ffffff' : LETTERMAN_GOLD}
          d={`M-11,${-140 + hunch / 2} L-10,${-147 + hunch / 2} Q0,${-149.5 + hunch / 2} 10,${-147 + hunch / 2} L11,${-140 + hunch / 2} Q0,${-137.5 + hunch / 2} -11,${-140 + hunch / 2} Z`}
          strokeWidth={1.7}
        />
      )}
      {/* knight: a steel gorget round the neck */}
      {knight && <path className="us-ink" fill={STEEL} d="M-13,-140 L-11,-149 Q0,-152 11,-149 L13,-140 Q0,-136.5 -13,-140 Z" strokeWidth={1.8} />}
      {suit && (
        <g>
          {/* white shirt collar above the jacket, red tie flipped over the shoulder */}
          <path className="us-ink" fill="#fff" d="M-9,-142 L-8,-149 L8,-149 L9,-142 L0,-139 Z" strokeWidth={1.8} />
          <path className="us-ink" fill={QUIRK_STYLE.boss.color} d="M5,-145 L11,-146 L17,-124 L13,-117 L9,-123 Z" strokeWidth={1.8} />
        </g>
      )}
      {/* in-law: the oxford's collar above the vest */}
      {quirk === 'inlaw' && <path className="us-ink" fill={OXFORD} d="M-9,-141 L-8,-148.5 L8,-148.5 L9,-141 Q0,-138.5 -9,-141 Z" strokeWidth={1.8} />}
      {/* pastor: the white clerical band, right round the back of the neck */}
      {quirk === 'pastor' && <rect className="us-ink" x={-8.5} y={-149} width={17} height={6.5} rx={1.5} fill="#fff" strokeWidth={1.8} />}
      {/* pilot: crisp shirt collar and navy epaulettes with four gold stripes (captain, actually) */}
      {quirk === 'pilot' && (
        <g>
          <path className="us-ink" fill={PILOT_SHIRT} d="M-9,-142 L-8,-149 L8,-149 L9,-142 L0,-139.5 Z" strokeWidth={1.8} />
          {[-1, 1].map((sx) => (
            <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
              <path className="us-ink" fill={PILOT_NAVY} d="M9,-145.5 L22,-144.2 Q25.2,-143.6 24.6,-140.6 L24.2,-139 L9.4,-140.4 Z" strokeWidth={1.6} />
              {[13.5, 16.5, 19.5, 22.2].map((x) => (
                <path key={x} d={`M${x},-144.4 L${x + 0.2},-139.9`} stroke={PILOT_GOLD} strokeWidth={1.4} />
              ))}
            </g>
          ))}
        </g>
      )}
      {/* head (a hunched guy's sinks into his shoulders; Dave nods at you) */}
      <g transform={hunch ? `translate(0,${hunch})` : undefined}>
      <g className={nod ? 'us-nod' : undefined}>
      <g transform={peek ? `translate(${turn * 5},-1)` : turn ? `translate(${turn * 2},0)` : undefined}>
        {turn === 0 ? (
          <>
            <ellipse className="us-ink" cx={-14} cy={-161} rx={3.5} ry={5} fill={look.skin} />
            <ellipse className="us-ink" cx={14} cy={-161} rx={3.5} ry={5} fill={look.skin} />
          </>
        ) : (
          <circle className="us-ink" cx={turn * 14} cy={-159} r={3.8} fill={look.skin} />
        )}
        <circle className="us-ink" cx={0} cy={-163} r={14} fill={look.skin} />
        {knight ? (
          <KnightHelmet turn={turn} />
        ) : fur ? (
          <g>
            <path className="us-ink" fill={look.shirtShade} d="M-10,-171 Q0,-191 10,-171 Q0,-175 -10,-171 Z" strokeWidth={1.8} />
            <path d="M-9,-157 l3,4 l3,-4 l3,4 l3,-4 l3,4" fill="none" stroke={look.shirtShade} strokeWidth={1.5} />
          </g>
        ) : turn === 0 ? (
          <Hair look={look} />
        ) : (
          <g transform={`translate(${-turn * 6},0)`}>
            <Hair look={look} turn={turn} />
          </g>
        )}
        {turn !== 0 && (
          <g>
            {!knight && <ellipse className="us-ink" cx={-turn * 2} cy={-161} rx={3} ry={4.5} fill={look.skin} strokeWidth={1.6} />}
            {peek ? (
              <PeekEye turn={turn} />
            ) : (
              <circle cx={turn * 8.5} cy={-166} r={1.7} fill="#1d1d22" />
            )}
            {talking ? (
              <ellipse cx={turn * 10.5} cy={-155.5} rx={2.8} ry={2.4} fill="#5a1d1d" stroke="#1d1d22" strokeWidth={1.2} />
            ) : quirk === 'friend' ? (
              <path d={`M${turn * 7.5},-156.5 Q${turn * 10},-153.5 ${turn * 12.5},-156`} fill="none" stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
            ) : (
              <path d={`M${turn * 8},-155.5 L${turn * 12},-155.5`} stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
            )}
          </g>
        )}
        {knight && turn !== 0 && <KnightVisor turn={turn} />}
        {quirk === 'germ' && <GermMask turn={turn} />}
        {quirk === 'pilot' && <PilotCap turn={turn} />}
        {quirk === 'tourist' && <BucketHat turn={turn} />}
        {quirk === 'security' && <SecurityCap turn={turn} />}
        {(quirk === 'shy' || knight) && <SweatDrops flying={knight} />}
      </g>
      </g>
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

/** How far the security guard's cap rises above a bare head (unscaled). */
export const SECURITY_CAP_RISE = 6;
/** How far the knight's helmet and plume rise above a bare head (unscaled). */
export const KNIGHT_HELM_RISE = 12;

function SecurityCap({ turn }: { turn: -1 | 0 | 1 }) {
  return (
    <g transform={turn ? `rotate(${turn * 4},0,-172)` : undefined}>
      {turn !== 0 && (
        <path className="us-ink" fill="#121826" d={`M${turn * 8},-168.5 L${turn * 18},-168 Q${turn * 23},-167 ${turn * 23},-164.5 L${turn * 9},-165 Z`} strokeWidth={1.6} />
      )}
      <path className="us-ink" fill={SECURITY_NAVY} d="M-15,-167 Q-15.5,-182 0,-182 Q15.5,-182 15,-167 Z" strokeWidth={1.8} />
      <rect className="us-ink" x={-15.2} y={-169.5} width={30.4} height={4.6} rx={1} fill="#121826" strokeWidth={1.6} />
      {turn !== 0 && <path className="us-ink" fill={SECURITY_GOLD} d={`M${turn * 9},-178 l${turn * 4},0 l0,4 l${-turn * 2},2 l${-turn * 2},-2 Z`} strokeWidth={1} />}
    </g>
  );
}

/** Security shirt from behind: SECURITY across the shoulders and a black duty belt with pouches. */
function SecurityBack() {
  return (
    <g>
      <rect x={-17} y={-133} width={34} height={10} rx={1.5} fill="#121a2e" />
      <text className="us-back-text" x={0} y={-127.6} textAnchor="middle" dominantBaseline="central" fill="#ffe27a">
        SECURITY
      </text>
      <rect className="us-ink" x={-21} y={-86} width={42} height={7} fill="#15171b" strokeWidth={1.6} />
      <rect className="us-ink" x={-17} y={-88} width={8} height={10} rx={1.5} fill="#24272d" strokeWidth={1.4} />
      <rect className="us-ink" x={9} y={-88} width={8} height={10} rx={1.5} fill="#24272d" strokeWidth={1.4} />
      <rect x={-3} y={-84.5} width={6} height={4} rx={0.8} fill="#c9d2db" />
    </g>
  );
}

/** Matching twins: two white rugby stripes across the back, on both of them. */
function TwinStripes() {
  const clip = `us-twin-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <g>
      <clipPath id={clip}>
        <path d={TORSO} />
      </clipPath>
      <g clipPath={`url(#${clip})`} fill="#ffffff" opacity={0.9}>
        <rect x={-26} y={-125} width={52} height={6} />
        <rect x={-26} y={-111} width={52} height={6} />
      </g>
    </g>
  );
}

/** Rookie's warm-up jacket: a big number on the back, a yoke seam and a ribbed hem. */
function WarmupBack({ color, num }: { color: string; num?: number }) {
  return (
    <g>
      <path d="M-21,-136 Q0,-145 21,-136" fill="none" stroke={shade(color, -0.3)} strokeWidth={1.4} />
      <text className="us-jersey-num" x={0} y={-108} textAnchor="middle" dominantBaseline="central" fill="#ffffff">
        {num ?? '00'}
      </text>
      <rect x={-19.5} y={-84} width={39} height={6} fill={shade(color, 0.25)} />
    </g>
  );
}

/** Two white stripes down each sleeve of the rookie's warm-up jacket. */
function SleeveStripes({ propSide }: { propSide: number }) {
  return (
    <g fill="none" stroke="#ffffff" strokeWidth={1.3}>
      {[-1, 1].map((sx) =>
        propSide === sx ? null : (
          <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
            <path d="M23,-137 C28,-130 28.5,-115 26,-100" />
            <path d="M26,-138 C30.5,-130 31,-115 28.8,-100.5" />
          </g>
        ),
      )}
    </g>
  );
}

/** The local legend's letterman jacket from behind: a chenille number and a striped knit hem. */
function LettermanBack() {
  return (
    <g>
      <text className="us-jersey-num" x={0} y={-112} textAnchor="middle" dominantBaseline="central" fill={LETTERMAN_LEATHER} stroke={LETTERMAN_GOLD} strokeWidth={1.2}>
        23
      </text>
      <rect x={-19.5} y={-85} width={39} height={7} fill={LETTERMAN_GOLD} />
      <rect x={-19.5} y={-82.5} width={39} height={2} fill={LETTERMAN_WOOL} />
    </g>
  );
}

/** The germaphobe's surgical mask: elastic straps round the back of the head, the mask itself in profile. */
function GermMask({ turn }: { turn: -1 | 0 | 1 }) {
  if (turn === 0) {
    return <path d="M-14,-163 Q0,-160 14,-163 M-13.5,-155 Q0,-152 13.5,-155" fill="none" stroke="#f4f8fb" strokeWidth={1.8} />;
  }
  return (
    <g>
      <path d={`M${turn * 2},-160 L${-turn * 10},-163 M${turn * 2},-153 L${-turn * 10},-155`} stroke="#f4f8fb" strokeWidth={1.6} />
      <path className="us-ink" fill={MASK_BLUE} d={`M${turn * 3},-162 L${turn * 15},-161 Q${turn * 17.5},-156 ${turn * 13.5},-150.5 L${turn * 3},-151.5 Z`} strokeWidth={1.5} />
      <path d={`M${turn * 5},-158 H${turn * 15} M${turn * 5},-155 H${turn * 15}`} stroke="#9cc0d8" strokeWidth={0.9} />
    </g>
  );
}

/** Nervous sweat (the shy guy), or sweat flying off a knight in full plate. */
function SweatDrops({ flying }: { flying?: boolean }) {
  const drops: [number, number, number, number][] = flying
    ? [
        [-24, -180, 1, -30],
        [25, -186, 1, 30],
        [-30, -165, 0.8, -55],
        [31, -170, 0.8, 55],
      ]
    : [
        [-20, -174, 1, 0],
        [21, -180, 1, 0],
        [24, -167, 0.75, 0],
      ];
  return (
    <g className={flying ? 'us-sweat us-sweat-fly' : 'us-sweat'} fill="#9ed3f5" stroke="#2c7fc0" strokeWidth={1.2}>
      {drops.map(([x, y, k, rot], i) => (
        <path key={i} transform={`translate(${x},${y}) rotate(${rot}) scale(${k})`} d="M0,-4 C2,0 2.5,2 0,4 C-2.5,2 -2,0 0,-4 Z" />
      ))}
    </g>
  );
}

/** The full dropper's pants and underwear, crumpled in a band round his ankles. */
function AnkleBunch({ footX, color }: { footX: number; color: string }) {
  const w = footX + 17;
  return (
    <g>
      <path
        className="us-ink"
        fill={color}
        d={`M${-w},-3 Q${-w - 2},-15 ${-w + 7},-16 Q${-w / 2},-19 -3,-14 Q0,-12 3,-14 Q${w / 2},-19 ${w - 7},-16 Q${w + 2},-15 ${w},-3 Q${w / 2},1 0,-2 Q${-w / 2},1 ${-w},-3 Z`}
      />
      <path className="us-ink" fill="#ffffff" d={`M${-w + 4},-15 Q${-w / 2},-20 -3,-15 L3,-15 Q${w / 2},-20 ${w - 4},-15 L${w - 5},-12 Q0,-10 ${-w + 5},-12 Z`} strokeWidth={1.5} />
      <path d={`M${-w + 6},-7 Q${-w / 2},-10 -6,-6 M6,-6 Q${w / 2},-10 ${w - 6},-7`} fill="none" stroke={shade(color, 0.3)} strokeWidth={1.3} />
    </g>
  );
}

/** A TV-style pixel censor over the full dropper's behind: chunky squares in a few skin shades. */
function CensorMosaic({ skin }: { skin: string }) {
  const shades = [skin, shade(skin, 0.1), shade(skin, -0.12), shade(skin, 0.2)];
  const cell = 5.5;
  const cols = 7;
  const rows = 5;
  const x0 = (-cols * cell) / 2;
  const y0 = -83;
  const cells: ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push(<rect key={`${r}-${c}`} x={x0 + c * cell} y={y0 + r * cell} width={cell + 0.2} height={cell + 0.2} fill={shades[(r * 3 + c * 5 + ((r * c) % 3)) % 4]} />);
  return (
    <g className="us-censor">
      {cells}
      <rect x={x0} y={y0} width={cols * cell} height={rows * cell} fill="none" stroke="var(--us-ink)" strokeWidth={1.2} opacity={0.5} />
    </g>
  );
}

/** Knight's backplate: a centre ridge, rivets, and the overlapping lames of the fauld at the hips. */
function KnightBack() {
  return (
    <g>
      <path d="M0,-142 V-92" stroke={STEEL_DARK} strokeWidth={1.6} />
      <path d="M-14,-136 Q-17,-112 -13,-94" fill="none" stroke="#ffffff" strokeWidth={2.2} opacity={0.55} strokeLinecap="round" />
      {[-18, 18].map((x) => (
        <circle key={x} cx={x} cy={-138} r={1.3} fill={STEEL_DARK} />
      ))}
      {[-90, -83, -76].map((y) => (
        <path key={y} className="us-ink" fill={STEEL} d={`M-23,${y} L23,${y} L23.5,${y + 7} L-23.5,${y + 7} Z`} strokeWidth={1.4} />
      ))}
    </g>
  );
}

/** Pauldrons on the shoulders and elbow cops on the knight's arms. */
function KnightArms() {
  return (
    <g>
      {[-1, 1].map((sx) => (
        <g key={sx} transform={sx < 0 ? 'scale(-1,1)' : undefined}>
          <path className="us-ink" fill={STEEL} d="M13,-145 Q27,-150 33,-136 Q30,-128 22,-127 Q17,-133 13,-145 Z" strokeWidth={1.7} />
          <path d="M18,-142 Q26,-144 30,-136" fill="none" stroke={STEEL_DARK} strokeWidth={1.1} />
          <ellipse className="us-ink" cx={25} cy={-104} rx={5.5} ry={4} fill={STEEL} strokeWidth={1.5} />
        </g>
      ))}
    </g>
  );
}

/** Knee cops and greave seams on the knight's legs. */
function KnightLegs({ footX }: { footX: number }) {
  return (
    <g>
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <ellipse className="us-ink" cx={sx * 10} cy={-44} rx={6.5} ry={5} fill={STEEL} strokeWidth={1.5} />
          <path d={`M${sx * 9},-36 L${sx * (footX + 1)},-9`} stroke={STEEL_DARK} strokeWidth={1.2} />
        </g>
      ))}
    </g>
  );
}

/** The knight's helmet, plume and all. From behind: a steel bowl with a neck guard. */
function KnightHelmet({ turn }: { turn: -1 | 0 | 1 }) {
  return (
    <g>
      {/* plume */}
      <path className="us-ink" fill={KNIGHT_PLUME} d={`M${-turn * 2},-177 Q${-turn * 14 - 4},-194 ${-turn * 22 - 2},-180 Q${-turn * 12},-185 ${-turn * 2 + 3},-175 Z`} strokeWidth={1.5} />
      {turn === 0 ? (
        <path className="us-ink" fill={STEEL} d="M-16,-158 A16,16 0 0 1 16,-158 L17,-148 Q0,-143 -17,-148 Z" />
      ) : (
        // in profile the face shows through the open front
        <path
          className="us-ink"
          fill={STEEL}
          d={`M${turn * 3},-178 A16,16 0 0 0 ${-turn * 16},-160 L${-turn * 17},-148 Q${-turn * 4},-143 ${turn * 4},-148 L${turn * 4},-170 Z`}
        />
      )}
      <path d="M0,-179 V-148" stroke={STEEL_DARK} strokeWidth={1.4} />
      <path d="M-15,-151 Q0,-147 15,-151" fill="none" stroke={STEEL_DARK} strokeWidth={1.2} />
      <path d="M-9,-172 Q-11,-163 -9,-156" fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.5} strokeLinecap="round" />
    </g>
  );
}

/** The knight's visor, flipped up over his forehead (only shows with his head in profile). */
function KnightVisor({ turn }: { turn: -1 | 1 }) {
  return (
    <g>
      <path className="us-ink" fill={STEEL} d={`M${turn * 2},-176 L${turn * 18},-181 L${turn * 21},-175 L${turn * 5},-170 Z`} strokeWidth={1.6} />
      <path d={`M${turn * 6},-175.5 L${turn * 17},-178.5`} stroke={STEEL_DARK} strokeWidth={1.1} />
      <circle cx={turn * 3} cy={-172} r={1.6} fill={STEEL_DARK} />
    </g>
  );
}

/** The finance bro's phone, held out flat-ish on speaker, with sound waves. Right hand (mirror for left). */
function SpeakerPhone() {
  return (
    <g>
      <g transform="translate(41,-106) rotate(-28)">
        <rect className="us-ink" x={-5.5} y={-10} width={11} height={20} rx={2.5} fill="#1f2228" strokeWidth={1.8} />
        <rect x={-3.8} y={-7.6} width={7.6} height={15} rx={1} fill="#7fd18b" />
        {/* the call screen: a speaker glyph */}
        <path d="M-2,-1.6 H-0.4 L1.6,-3.6 V3.6 L-0.4,1.6 H-2 Z" fill="#1f2228" />
      </g>
      <g className="us-sound" fill="none" stroke="var(--us-ink)" strokeWidth={1.6} strokeLinecap="round">
        <path d="M51,-118 Q55,-112 53,-105" />
        <path d="M56,-122 Q62,-112 58.5,-101" />
      </g>
    </g>
  );
}

/** Crypto bro: a big gold coin on the back of his hoodie, with a bitcoin-style B. */
function CoinBack() {
  return (
    <g>
      <circle className="us-ink" cx={0} cy={-113} r={11.5} fill={CRYPTO_GOLD} strokeWidth={1.8} />
      <circle cx={0} cy={-113} r={8.6} fill="none" stroke={shade(CRYPTO_GOLD, 0.25)} strokeWidth={1} />
      <path d="M-1.6,-122 V-104 M1.8,-122 V-104" stroke="#2a1f00" strokeWidth={1.4} />
      <text className="us-coin-b" x={0.4} y={-112.5} textAnchor="middle" dominantBaseline="central">
        B
      </text>
    </g>
  );
}

/** Tourist's technical shell from behind: a darker back yoke with a vent, a reflective tab, a drawcord hem. */
function ShellBack({ color }: { color: string }) {
  const clip = `us-shell-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <g>
      <clipPath id={clip}>
        <path d={TORSO} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <path d="M-26,-146 H26 V-128 Q0,-122 -26,-128 Z" fill={shade(color, 0.2)} />
        <path d="M-15,-126.5 Q0,-121.5 15,-126.5" fill="none" stroke={shade(color, 0.42)} strokeWidth={1.4} />
        <rect x={-4} y={-133} width={8} height={3} rx={1} fill="#e8eef2" />
        <rect x={-26} y={-85} width={52} height={7} fill={shade(color, 0.16)} />
        <circle cx={-14} cy={-81.5} r={1.4} fill="#e8eef2" />
      </g>
    </g>
  );
}

/** Finance bro's fleece vest from behind: a fleece speckle, a back yoke seam, a bound hem. */
function FleeceBack({ color }: { color: string }) {
  const clip = `us-fleece-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const dots: [number, number][] = [];
  for (let row = 0; row < 8; row++) for (let x = -21 + (row % 2) * 3.5; x < 22; x += 7) dots.push([x, -136 + row * 7]);
  return (
    <g>
      <clipPath id={clip}>
        <path d={TORSO} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {dots.map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={0.9} fill={shade(color, -0.35)} />
        ))}
        <path d="M-24,-131 Q0,-126 24,-131" fill="none" stroke={shade(color, 0.35)} strokeWidth={1.3} />
        <rect x={-24} y={-83} width={48} height={5} fill={shade(color, 0.25)} />
      </g>
    </g>
  );
}

/** Convertible hiking pants: zip-off lines at the knees, a cargo pocket on one thigh. */
function TrekPants({ footX, color }: { footX: number; color: string }) {
  const zip = shade(color, 0.38);
  const kx = Math.max(9, footX + 1);
  return (
    <g>
      <path
        d={`M${-kx - 6},-36 Q${-kx},-34.5 ${-kx + 6},-36 M${kx - 6},-36 Q${kx},-34.5 ${kx + 6},-36`}
        fill="none"
        stroke={zip}
        strokeWidth={1.6}
        strokeDasharray="1.6 1.2"
      />
      <rect className="us-ink" x={6} y={-70} width={10} height={13} rx={1.5} fill={shade(color, 0.08)} strokeWidth={1.4} />
      <path d="M6,-66 H16" stroke={zip} strokeWidth={1} />
    </g>
  );
}

/** How far the tourist's bucket hat rises above a bare head (unscaled), so his chip can sit clear of it. */
export const TOURIST_HAT_RISE = 8;

/** The tourist's floppy tan bucket hat. In profile it tips forward a touch. */
function BucketHat({ turn }: { turn: -1 | 0 | 1 }) {
  return (
    <g transform={turn ? `rotate(${turn * 4},0,-170)` : undefined}>
      <path className="us-ink" fill={TREK_HAT} d="M-13,-168 Q-13.5,-184 0,-184 Q13.5,-184 13,-168 Z" strokeWidth={1.8} />
      <path d="M-13,-171.5 H13" stroke={shade(TREK_HAT, 0.35)} strokeWidth={2.4} />
      <path
        className="us-ink"
        fill={shade(TREK_HAT, 0.08)}
        d="M-22,-164 Q-19,-170.5 -13,-169.5 L13,-169.5 Q19,-170.5 22,-164 Q0,-161 -22,-164 Z"
        strokeWidth={1.8}
      />
    </g>
  );
}

/** How far the pilot's cap rises above a bare head (unscaled), so his chip can sit clear of it. */
export const PILOT_CAP_RISE = 9;

/**
 * The pilot's peaked cap: a navy crown flaring out over a band with a gold cord. From behind the
 * peak is hidden; with the head in profile (`turn`) the glossy black visor juts out in front.
 */
function PilotCap({ turn }: { turn: -1 | 0 | 1 }) {
  // In profile the crown tips forward a touch, as caps do.
  const tip = turn ? `rotate(${turn * 5},0,-172)` : undefined;
  return (
    <g transform={tip}>
      {turn !== 0 && (
        <path
          className="us-ink"
          fill="#15151a"
          d={`M${turn * 8},-168.5 L${turn * 17},-168.8 Q${turn * 23},-168.3 ${turn * 24.5},-164.6 Q${turn * 18},-165.6 ${turn * 9},-165.4 Z`}
          strokeWidth={1.6}
        />
      )}
      <path className="us-ink" fill={PILOT_NAVY} d="M-15.6,-172.5 L-19,-180.5 Q0,-188.5 19,-180.5 L15.6,-172.5 Z" strokeWidth={1.8} />
      <path d="M-11,-182.4 Q0,-185.6 11,-182.4" fill="none" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" opacity={0.28} />
      <rect className="us-ink" x={-15.6} y={-173} width={31.2} height={6.2} rx={1} fill="#121826" strokeWidth={1.8} />
      <path d="M-14.6,-170 H14.6" stroke={PILOT_GOLD} strokeWidth={1.3} />
    </g>
  );
}

/**
 * The peeper's side-eye (head in profile, facing `turn`): a wide eye with the pupil pressed to the
 * front, one eyebrow up, and a dashed sight line out past his face so the direction reads at a glance.
 */
function PeekEye({ turn }: { turn: -1 | 1 }) {
  return (
    <g>
      <path
        className="us-peek-line"
        d={`M${turn * 18},-166.5 L${turn * 42},-165`}
        fill="none"
        stroke="var(--us-ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="3.5 4"
      />
      <ellipse cx={turn * 9} cy={-166} rx={3.1} ry={2.6} fill="#fff" stroke="#1d1d22" strokeWidth={1.1} />
      <circle cx={turn * 10.6} cy={-166} r={1.5} fill="#1d1d22" />
      <path d={`M${turn * 5},-170.5 Q${turn * 8.5},-174.5 ${turn * 11.8},-171.5`} fill="none" stroke="#1d1d22" strokeWidth={1.5} strokeLinecap="round" />
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
/** The boss's mood is his emoji: the only tell for how much room he wants. */
export const BOSS_MOOD_EMOJI: Record<BossMood, string> = { happy: '😊', stressed: '😰', angry: '😡' };

export function QuirkChip({ x, y, quirk, lean, mood }: { x: number; y: number; quirk: Quirk; lean?: Side; mood?: BossMood }) {
  const st = QUIRK_STYLE[quirk];
  if (!st.tag) return null;
  const emoji = quirk === 'boss' && mood ? BOSS_MOOD_EMOJI[mood] : st.emoji;
  // A drunk's chip points the way he sways (a peeper's, the way he looks), so the lopsided zone reads at a glance.
  const w = CHIP_W;
  // A long two-word name ("CRYPTO BRO") stacks on two lines rather than squashing into one.
  const space = st.tag.indexOf(' ');
  const lines = st.tag.length > 7 && space > 0 ? [st.tag.slice(0, space), st.tag.slice(space + 1)] : [st.tag];
  if (lean) lines[lines.length === 1 ? 0 : lean === 'left' ? 0 : 1] = lean === 'left' ? `◀ ${lines[0]}` : `${lines[lines.length - 1]} ▶`;
  const lh = 11;
  const h = 18 + (lines.length - 1) * lh;
  const long = lines.some((l) => l.length > 7);
  const fit = (l: string) => (l.length > 6 ? { textLength: w - 10, lengthAdjust: 'spacingAndGlyphs' as const } : {});
  return (
    <g className={`us-chip us-chip-${quirk}`} transform={`translate(${x},${y})`}>
      <rect className="us-chip-box" x={-w / 2} y={-h} width={w} height={h} rx={9} fill={st.color} />
      {lines.map((l, k) => (
        <text
          key={k}
          className={long ? 'us-chip-text us-chip-text-sm' : 'us-chip-text'}
          x={0}
          y={-h / 2 + 0.5 + (k - (lines.length - 1) / 2) * lh}
          textAnchor="middle"
          dominantBaseline="central"
          fill={st.ink}
          {...fit(l)}
        >
          {l}
        </text>
      ))}
      <circle className="us-chip-disc" cx={0} cy={-h - 9} r={10.5} fill="#fff" stroke={st.color} />
      <text className="us-emoji" x={0} y={-h - 8} textAnchor="middle" dominantBaseline="central" fontSize={quirk === 'boss' && mood ? 19 : 12.5}>
        {emoji}
      </text>
    </g>
  );
}

/** Longest text a bubble keeps on one line (chars). Longer text breaks in two, at the space nearest the middle. */
export const BUBBLE_WRAP = 18;

export function bubbleLines(text: string): string[] {
  if (text.length <= BUBBLE_WRAP) return [text];
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' && (best < 0 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2))) best = i;
  }
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

/**
 * Horizontal speech bubble beside a head: tail tip at (x, y), bubble extends toward `dir`. Given the
 * scene width, a bubble that would run off either edge flips to the other side of the head.
 */
export function SideBubble({ x, y, text, dir: wantDir, small, sceneW }: { x: number; y: number; text: string; dir: -1 | 1; small?: boolean; sceneW?: number }) {
  const fs = small ? 10 : 13;
  const lines = bubbleLines(text);
  const longest = Math.max(...lines.map((l) => l.length));
  const w = Math.max(20, Math.round(longest * fs * 0.6) + 10);
  let dir = wantDir;
  if (sceneW !== undefined && dir > 0 && x + 5 + w > sceneW - 2) dir = -1;
  else if (sceneW !== undefined && dir < 0 && x - 5 - w < 2) dir = 1;
  const lh = small ? 11 : 14;
  const h = (small ? 16 : 19) + (lines.length - 1) * lh;
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
        y={by + h / 2 + 0.5 - ((lines.length - 1) * lh) / 2}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {lines.length === 1
          ? text
          : lines.map((l, k) => (
              <tspan key={k} x={bx + w / 2} dy={k ? lh : 0}>
                {l}
              </tspan>
            ))}
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
