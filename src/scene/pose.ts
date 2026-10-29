// Pure pose math for the puddle straddle (legs wide, knees slightly bent; arms stay down). No React.

/** How far the upper body drops (knees bent) at full straddle, unscaled units. */
export const STRADDLE_DROP = 6;
/** Duration of the "you" straddle settle after the walk-in. */
export const STRADDLE_MS = 280;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (k: number) => Math.max(0, Math.min(1, Number.isFinite(k) ? k : 0));

export interface LegPose {
  /** Pants outline path (feet at y = 0, up is negative). */
  pants: string;
  /** Shoe centre x (mirrored for the left foot). */
  footX: number;
  /** Upper-body drop (positive = down). */
  drop: number;
}

/** Legs from a normal (or splasher-wide) stance toward a full puddle straddle at k = 1. */
export function legPose(k: number, wide: boolean): LegPose {
  const c = clamp01(k);
  const base = wide
    ? { xo: 25, xi: 11, xk: 21, xki: 6, crotch: -54, foot: 17.5 }
    : { xo: 15, xi: 2, xk: 15.5, xki: 1, crotch: -58, foot: 8.5 };
  const xo = lerp(base.xo, 42, c);
  const xi = lerp(base.xi, 30, c);
  const xk = lerp(base.xk, 33, c); // knees pushed out = bent
  const xki = lerp(base.xki, 20, c);
  const crotch = lerp(base.crotch, -52, c);
  const drop = STRADDLE_DROP * c;
  const top = -84 + drop;
  const f = (n: number) => Math.round(n * 100) / 100;
  const pants =
    `M-16,${f(top)} L16,${f(top)} L${f(xk)},-44 L${f(xo)},-7 L${f(xi)},-7 L${f(xki)},-42 L0,${f(crotch)} ` +
    `L${f(-xki)},-42 L${f(-xi)},-7 L${f(-xo)},-7 L${f(-xk)},-44 Z`;
  return { pants, footX: lerp(base.foot, 36, c), drop };
}
