// A guy seen from behind, standing facing the wall. Local coords: feet centre at (0, 0), y up is negative.
import { useId, type CSSProperties } from 'react';
import type { BossMood, Quirk, Side } from '../types';
import { GUY_H, heightScale } from './geometry';
import { OXFORD, PILOT_GOLD, PILOT_NAVY, PILOT_SHIRT, QUIRK_STYLE, SHOE, shade, type ResolvedLook } from './looks';
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

export function GuyFigure({ look, hoodie, quirk = 'normal', turn = 0, talking, propSide = 1, straddle = 0 }: GuyFigureProps) {
  const s = heightScale(look.height);
  const wide = quirk === 'splasher';
  const suit = quirk === 'boss';
  const prop =
    quirk === 'boss' ? 'coffee' : quirk === 'drunk' ? 'beer' : quirk === 'facetime' ? 'phone' : quirk === 'pastor' ? 'bible' : null;
  const sleeve = look.sleeve ?? look.shirtShade;
  // The peeper cranes his neck toward whatever he's looking at.
  const peek = quirk === 'peeper' && turn !== 0;
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
        : TORSO;
  // The prop hand hangs down at the hip; mirrored via scale(-1,1) for the left hand.
  const propArm = prop === 'phone' ? (
    <g transform={propSide < 0 ? 'scale(-1,1)' : undefined}>
      {/* arm raised out to the side, holding the phone at arm's length */}
      <path d="M19,-138 L33,-147 L39,-156" fill="none" stroke="var(--us-ink)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19,-138 L33,-147 L39,-156" fill="none" stroke={look.shirtShade} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ) : prop ? (
    <g transform={propSide < 0 ? 'scale(-1,1)' : undefined}>
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
      {quirk === 'inlaw' && <VestBack color={look.shirt} />}
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
          {prop && propSide < 0 ? null : <path className="us-ink" fill={sleeve} d={ARM_L} />}
          {prop && propSide > 0 ? null : <path className="us-ink" fill={sleeve} d={ARM_R} />}
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
      {/* head */}
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
        {turn === 0 ? (
          <Hair look={look} />
        ) : (
          <g>
            <g transform={`translate(${-turn * 6},0)`}>
              <Hair look={look} turn={turn} />
            </g>
            <ellipse className="us-ink" cx={-turn * 2} cy={-161} rx={3} ry={4.5} fill={look.skin} strokeWidth={1.6} />
            {peek ? (
              <PeekEye turn={turn} />
            ) : (
              <circle cx={turn * 8.5} cy={-166} r={1.7} fill="#1d1d22" />
            )}
            {talking ? (
              <ellipse cx={turn * 10.5} cy={-155.5} rx={2.8} ry={2.4} fill="#5a1d1d" stroke="#1d1d22" strokeWidth={1.2} />
            ) : (
              <path d={`M${turn * 8},-155.5 L${turn * 12},-155.5`} stroke="#1d1d22" strokeWidth={1.4} strokeLinecap="round" />
            )}
          </g>
        )}
        {quirk === 'pilot' && <PilotCap turn={turn} />}
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
  const tag = lean ? (lean === 'left' ? `◀ ${st.tag}` : `${st.tag} ▶`) : st.tag;
  const w = CHIP_W;
  const h = 18;
  const squeeze = tag.length > 6 ? { textLength: w - 10, lengthAdjust: 'spacingAndGlyphs' as const } : {};
  return (
    <g className={`us-chip us-chip-${quirk}`} transform={`translate(${x},${y})`}>
      <rect className="us-chip-box" x={-w / 2} y={-h} width={w} height={h} rx={9} fill={st.color} />
      <text className="us-chip-text" x={0} y={-h / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fill={st.ink} {...squeeze}>
        {tag}
      </text>
      <circle className="us-chip-disc" cx={0} cy={-h - 9} r={10.5} fill="#fff" stroke={st.color} />
      <text className="us-emoji" x={0} y={-h - 8} textAnchor="middle" dominantBaseline="central" fontSize={quirk === 'boss' && mood ? 19 : 12.5}>
        {emoji}
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
