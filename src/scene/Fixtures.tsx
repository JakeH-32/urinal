// Static fixtures: urinals, stalls, dividers, puddles, the doorway end and the solid end wall.
import type { Guy } from '../types';
import { FEET_Y, FLOOR_Y, LINTEL_Y, SCENE_H, SIDE_SLOPE, solidEnd, urinalMetrics, type SceneLayout, type SlotGeom } from './geometry';
import { SHOE, resolveLook } from './looks';

const PIPE_TOP = 12;

export function Urinal({ cx, low, broken }: { cx: number; low?: boolean; broken?: boolean }) {
  const m = urinalMetrics(!!low);
  return (
    <g className={broken ? 'us-urinal us-broken' : 'us-urinal'}>
      {/* plumbing */}
      <rect className="us-ink us-chrome" x={cx - 6} y={PIPE_TOP - 2} width={12} height={5} rx={1.5} />
      <rect className="us-ink us-chrome" x={cx - 2.5} y={PIPE_TOP} width={5} height={m.top - PIPE_TOP} />
      <rect className="us-ink us-chrome" x={cx - 7} y={m.valveY - 7} width={14} height={14} rx={4} />
      <path className="us-ink" d={`M${cx + 6},${m.valveY - 2} L${cx + 15},${m.valveY - 6}`} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* porcelain */}
      <g transform={`translate(${cx},${m.top}) scale(${m.scale})`}>
        <path className="us-ink us-porcelain" d="M-20,0 L20,0 L18,50 Q15,78 0,79 Q-15,78 -18,50 Z" />
        <path className="us-porcelain-shade" d="M-13,9 L13,9 L12,45 Q10,63 0,64 Q-10,63 -12,45 Z" />
        <ellipse cx={0} cy={56} rx={4} ry={1.8} fill="#9aa7b3" />
        <rect className="us-ink us-porcelain" x={-21.5} y={-3} width={43} height={7} rx={3.5} />
        {broken && (
          <>
            <path d="M-20,0 L20,0 L18,50 Q15,78 0,79 Q-15,78 -18,50 Z" className="us-broken-dim" />
            <path d="M8,14 L3,26 L9,34 L4,47" fill="none" stroke="#3a4450" strokeWidth={1.4} />
            <g transform="translate(0,30) rotate(-7)">
              <rect className="us-ink" x={-19} y={-13} width={38} height={26} rx={1.5} fill="#fbf6e4" strokeWidth={1.4} />
              <rect x={-21} y={-16} width={12} height={5} fill="#d8c79a" opacity={0.85} transform="rotate(-20,-15,-13)" />
              <rect x={9} y={-16} width={12} height={5} fill="#d8c79a" opacity={0.85} transform="rotate(20,15,-13)" />
              <text className="us-sign" x={0} y={-3.5} textAnchor="middle" dominantBaseline="central">
                OUT OF
              </text>
              <text className="us-sign" x={0} y={5} textAnchor="middle" dominantBaseline="central">
                ORDER
              </text>
            </g>
          </>
        )}
      </g>
    </g>
  );
}

export function Puddle({ cx }: { cx: number }) {
  return (
    <g className="us-puddle">
      <path
        d={`M${cx - 26},${FEET_Y + 2} C${cx - 28},${FEET_Y - 5} ${cx - 8},${FEET_Y - 8} ${cx + 4},${FEET_Y - 6} C${cx + 20},${FEET_Y - 8} ${cx + 30},${FEET_Y - 2} ${cx + 24},${FEET_Y + 4} C${cx + 16},${FEET_Y + 9} ${cx - 20},${FEET_Y + 9} ${cx - 26},${FEET_Y + 2} Z`}
        fill="#9ed3f5"
        stroke="#4a90c8"
        strokeWidth={1.6}
      />
      <ellipse cx={cx - 8} cy={FEET_Y - 2} rx={7} ry={1.8} fill="#fff" opacity={0.75} />
    </g>
  );
}

const STALL_TOP = 24;
const STALL_BOTTOM = FEET_Y + 6;
const DOOR_TOP = 34;
const DOOR_BOTTOM = FEET_Y - 16;

interface StallProps {
  g: SlotGeom;
  occupant?: Guy;
  /** "You" are inside: door shut, your sneakers under it. */
  you?: boolean;
}

export function Stall({ g, occupant, you }: StallProps) {
  const inX0 = g.x0 + 7;
  const inX1 = g.x1 - 7;
  const busy = !!occupant || !!you;
  const look = occupant ? resolveLook(occupant.look) : null;
  const cuff = you ? '#2f3b52' : (look?.pants ?? '#333');
  const shoe = you ? '#f4f4f4' : SHOE;
  return (
    <g className="us-stall">
      {/* interior */}
      <rect className="us-stall-in" x={inX0} y={STALL_TOP} width={inX1 - inX0} height={STALL_BOTTOM - STALL_TOP} />
      {!busy && (
        // toilet, visible through the ajar door
        <g className="us-ink" transform={`translate(${g.cx + 10},0)`}>
          <rect className="us-porcelain" x={-11} y={156} width={22} height={26} rx={3} />
          <path className="us-porcelain" d="M-15,184 L15,184 Q14,206 4,212 L5,224 L-5,224 L-4,212 Q-14,206 -15,184 Z" />
        </g>
      )}
      {busy && (
        <g>
          <rect className="us-ink" x={g.cx - 15} y={DOOR_BOTTOM - 2} width={12} height={10} fill={cuff} />
          <rect className="us-ink" x={g.cx + 3} y={DOOR_BOTTOM - 2} width={12} height={10} fill={cuff} />
          <ellipse className="us-ink" cx={g.cx - 10} cy={FEET_Y + 1} rx={9} ry={4.5} fill={shoe} />
          <ellipse className="us-ink" cx={g.cx + 10} cy={FEET_Y + 1} rx={9} ry={4.5} fill={shoe} />
        </g>
      )}
      {/* door */}
      {busy ? (
        <g>
          <rect className="us-ink us-stall-door" x={inX0} y={DOOR_TOP} width={inX1 - inX0} height={DOOR_BOTTOM - DOOR_TOP} rx={2} />
          <rect className="us-ink" x={inX1 - 15} y={132} width={11} height={12} rx={2} fill="#c8d0d8" strokeWidth={1.4} />
          <rect x={inX1 - 13} y={134.5} width={7} height={7} rx={1.2} fill="#d9342b" />
        </g>
      ) : (
        <path
          className="us-ink us-stall-door us-stall-ajar"
          d={`M${inX0},${DOOR_TOP} L${inX0 + 26},${DOOR_TOP + 7} L${inX0 + 26},${DOOR_BOTTOM - 6} L${inX0},${DOOR_BOTTOM} Z`}
        />
      )}
      {/* frame */}
      <rect className="us-ink us-stall-frame" x={g.x0 + 1} y={STALL_TOP} width={6} height={STALL_BOTTOM - STALL_TOP} />
      <rect className="us-ink us-stall-frame" x={g.x1 - 7} y={STALL_TOP} width={6} height={STALL_BOTTOM - STALL_TOP} />
      <rect className="us-ink us-chrome" x={g.x0} y={STALL_TOP - 5} width={g.x1 - g.x0} height={6} rx={2} />
    </g>
  );
}

export const STALL_TOP_Y = STALL_TOP;

/** Privacy panel between two urinals: a dark slab from above the urinals down to the floor. */
export function Divider({ x }: { x: number }) {
  const top = 88;
  const bottom = FEET_Y - 4;
  return (
    <g className="us-divider">
      <ellipse className="us-divider-shadow" cx={x} cy={bottom + 1} rx={13} ry={3.5} />
      <rect className="us-ink us-divider-panel" x={x - 8} y={top} width={16} height={bottom - top} rx={4} />
      <rect className="us-divider-face" x={x - 5} y={top + 4} width={5} height={bottom - top - 8} rx={2} />
      <rect className="us-ink us-chrome" x={x - 9.5} y={150} width={19} height={5} rx={1.5} />
      <rect className="us-ink us-chrome" x={x - 10} y={bottom - 4} width={20} height={5} rx={1.5} />
    </g>
  );
}

/** The open end: a doorway into the rest of the bathroom (sinks, mirror). */
export function Doorway({ layout }: { layout: SceneLayout }) {
  const { x0, x1, jambX } = layout.opening;
  const left = layout.door.side === 'left';
  const jamb0 = left ? jambX - 10 : jambX;
  const innerX0 = left ? x0 : jambX + 10;
  const innerX1 = left ? jambX - 10 : x1;
  const w = innerX1 - innerX0;
  const sinkW = Math.min(46, w - 14);
  const sinkCx = innerX0 + w / 2;
  return (
    <g className="us-doorway">
      <rect className="us-beyond" x={innerX0} y={LINTEL_Y} width={w} height={FLOOR_Y - LINTEL_Y} />
      <rect className="us-beyond-floor" x={innerX0} y={FLOOR_Y} width={w} height={SCENE_H - FLOOR_Y} />
      {/* mirror + sink beyond */}
      <rect className="us-ink us-mirror" x={sinkCx - sinkW / 2} y={70} width={sinkW} height={56} rx={4} strokeWidth={1.6} />
      <path d={`M${sinkCx - sinkW / 2 + 8},${118} L${sinkCx - sinkW / 2 + 22},${78}`} stroke="#fff" strokeWidth={3} opacity={0.7} />
      <rect className="us-ink us-porcelain" x={sinkCx - sinkW / 2 - 4} y={148} width={sinkW + 8} height={8} rx={3} strokeWidth={1.6} />
      <path className="us-ink us-porcelain" d={`M${sinkCx - 14},156 Q${sinkCx},176 ${sinkCx + 14},156 Z`} strokeWidth={1.6} />
      <rect className="us-ink us-chrome" x={sinkCx - 2} y={138} width={4} height={10} strokeWidth={1.2} />
      <line x1={innerX0} x2={innerX1} y1={FLOOR_Y} y2={FLOOR_Y} className="us-baseboard-beyond" />
      {/* lintel shadow + jamb (wall end) */}
      <rect x={innerX0} y={LINTEL_Y} width={w} height={6} fill="rgba(20,30,45,0.18)" />
      <rect className="us-ink us-jamb" x={jamb0} y={LINTEL_Y} width={10} height={FLOOR_Y + 8 - LINTEL_Y} />
      <line className="us-ink" x1={innerX0} x2={innerX1} y1={LINTEL_Y} y2={LINTEL_Y} />
    </g>
  );
}

/** The closed end: a solid tiled side wall in perspective. */
export function SolidEnd({ layout, tileId }: { layout: SceneLayout; tileId: string }) {
  const end = solidEnd(layout);
  const far = layout.door.side === 'left' ? end.x1 : end.x0;
  const drop = Math.abs(far - end.cornerX) * SIDE_SLOPE;
  const pts = `${end.cornerX},0 ${far},0 ${far},${FLOOR_Y + drop} ${end.cornerX},${FLOOR_Y}`;
  return (
    <g className="us-solid-end">
      <polygon className="us-side-wall" points={pts} />
      <polygon points={pts} fill={`url(#${tileId})`} />
      <line className="us-baseboard" x1={end.cornerX} y1={FLOOR_Y} x2={far} y2={FLOOR_Y + drop} />
      <line className="us-corner" x1={end.cornerX} y1={0} x2={end.cornerX} y2={FLOOR_Y} />
    </g>
  );
}
