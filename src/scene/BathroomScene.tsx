// Side-view SVG bathroom. Owned by the Scene agent.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Bathroom, Evaluation, Guy, Side } from '../types';
import {
  FEET_Y,
  FLOOR_Y,
  HIT_TOP,
  MAX_PX_PER_UNIT,
  PITCH,
  SCENE_H,
  SIDE_SLOPE,
  WALK_MS,
  heightScale,
  layoutBathroom,
  spanOf,
  walkPose,
  type SceneLayout,
} from './geometry';
import { CHIP_W, Droplets, FaceTimePhone, GuyFigure, PHONE_X, PHONE_Y, QuirkChip, SideBubble, SplashPuddle, YouTag, guyTop } from './Guy';
import { Divider, Doorway, Puddle, STALL_TOP_Y, SolidEnd, Stall, Urinal } from './Fixtures';
import { GRADES } from '../grades';
import {
  buildReveal,
  describeBathroom,
  firstPickable,
  isPickable,
  lastPickable,
  nextPickable,
  slotLabel,
  spreadChips,
} from './logic';
import { YOU_LOOK, resolveLook } from './looks';
import { STRADDLE_DROP, STRADDLE_MS } from './pose';
import './scene.css';

export interface BathroomSceneProps {
  bathroom: Bathroom;
  /** Called with a slot index when the player picks. Omit (or `disabled`) for read-only. */
  onPick?: (index: number) => void;
  disabled?: boolean;
  /** The player's pick: "you" walk in from the door and stand there. */
  picked?: number;
  /** When set (after the pick), reveal grades: ring the pick in its grade colour, show violated zones, mark the best spot(s). */
  evaluation?: Evaluation;
  reducedMotion?: boolean;
  /** Fires once the walk-in animation finishes (immediately when reducedMotion). */
  onWalkDone?: () => void;
  /** Extra class on the scene root (the rounded frame). */
  className?: string;
  /** Accessible name override (default: a generated one-line description of the room). */
  ariaLabel?: string;
  /** Show small slot numbers (1-based) on the floor under each slot. Default false. */
  slotNumbers?: boolean;
  /**
   * Cap on on-screen px per viewBox unit (default 0.875): the frame's max-width is
   * `layout.width * maxScale` so fixtures keep the same size in small and big rooms.
   * Pass Infinity to always fill the container width.
   */
  maxScale?: number;
}

// Stable per-object ids so a new bathroom (or a new pick) restarts the walk.
const bathroomIds = new WeakMap<object, number>();
let nextBathroomId = 1;
function bathroomId(b: Bathroom): number {
  let id = bathroomIds.get(b);
  if (id === undefined) {
    id = nextBathroomId++;
    bathroomIds.set(b, id);
  }
  return id;
}

// Reveal reactions. The talker's always-on bubble switches to "So…" instead; the splasher splashes;
// the FaceTime guy turns the phone to you and grandma asks.
const REACTION_TEXT: Record<Guy['quirk'], string | null> = {
  normal: '!',
  drunk: '!',
  talker: null,
  boss: '…',
  splasher: null,
  facetime: null,
};
const FACETIME_REACTION = 'Who’s this?';
const TALKER_LINE = 'Hey, buddy!';

/** Drunk lean in degrees (positive = clockwise = toward the right). */
function drunkTilt(guy: Guy): number {
  if (guy.quirk !== 'drunk') return 0;
  return guy.lean === 'left' ? -9 : 9;
}

/** Which way a urinal occupant's head faces: toward you when reacting; the talker faces the door
 * (where you walk in); the FaceTime guy looks at his phone. */
function headTurn(guy: Guy, door: Side, reactDir: -1 | 1 | undefined): -1 | 0 | 1 {
  if (reactDir) return reactDir;
  if (guy.quirk === 'talker') return door === 'left' ? -1 : 1;
  if (guy.quirk === 'facetime') return guy.lean === 'left' ? -1 : 1;
  return 0;
}

/** Hand holding the prop: the drunk's lean side; the boss's free side (right unless only left is free). */
function propSideFor(b: Bathroom, i: number): -1 | 1 {
  const guy = b.slots[i].occupant;
  if (guy?.quirk === 'drunk' || guy?.quirk === 'facetime') return guy.lean === 'left' ? -1 : 1;
  const rightBusy = !!b.slots[i + 1]?.occupant;
  const leftBusy = !!b.slots[i - 1]?.occupant;
  return rightBusy && !leftBusy ? -1 : 1;
}

/** Scene-space centre of a standing guy's head (accounts for the drunk's tilt). */
function headPoint(guy: Guy, cx: number): { x: number; y: number; top: number } {
  const s = heightScale(guy.look.height);
  const rad = (drunkTilt(guy) * Math.PI) / 180;
  const r = 163 * s;
  const rt = -guyTop(guy.look.height);
  return { x: cx + Math.sin(rad) * r, y: FEET_Y - Math.cos(rad) * r, top: FEET_Y - Math.cos(rad) * rt };
}

export function BathroomScene(props: BathroomSceneProps) {
  const { bathroom, onPick, disabled, picked, evaluation, reducedMotion, onWalkDone, className, ariaLabel, slotNumbers } = props;
  const maxScale = props.maxScale ?? MAX_PX_PER_UNIT;
  const layout = useMemo(() => layoutBathroom(bathroom), [bathroom]);
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const tileId = `us-tile-${uid}`;
  const sideTileId = `us-side-${uid}`;

  // ---- walk-in bookkeeping --------------------------------------------------------
  const walkKey = picked === undefined || !bathroom.slots[picked] ? null : `${bathroomId(bathroom)}:${picked}`;
  const [arrivedKey, setArrivedKey] = useState<string | null>(() => (evaluation && walkKey ? walkKey : null));
  const arrived = walkKey !== null && arrivedKey === walkKey;
  const firedRef = useRef<string | null>(null);
  const onWalkDoneRef = useRef(onWalkDone);
  onWalkDoneRef.current = onWalkDone;
  // The walker calls this when it arrives (also for an instant/restored arrival, on the next tick).
  const handleArrive = useCallback(() => {
    if (walkKey === null) return;
    setArrivedKey(walkKey);
    if (firedRef.current !== walkKey) {
      firedRef.current = walkKey;
      onWalkDoneRef.current?.();
    }
  }, [walkKey]);
  // Pick cleared (e.g. replaying the same room): the next pick walks and reports again.
  useEffect(() => {
    if (walkKey === null) {
      firedRef.current = null;
      setArrivedKey(null);
    }
  }, [walkKey]);

  // ---- picking / keyboard -------------------------------------------------------------
  const locked = !!disabled || picked !== undefined || !onPick;
  const [focusIdx, setFocusIdx] = useState(() => firstPickable(bathroom));
  const roving = focusIdx >= 0 && bathroom.slots[focusIdx] && isPickable(bathroom.slots[focusIdx]) ? focusIdx : firstPickable(bathroom);
  const btnRefs = useRef(new Map<number, SVGGElement>());

  const pick = (i: number) => {
    if (locked || !isPickable(bathroom.slots[i])) return;
    onPick?.(i);
  };
  const moveFocus = (i: number) => {
    if (i < 0) return;
    setFocusIdx(i);
    btnRefs.current.get(i)?.focus();
  };
  const onKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(nextPickable(bathroom, i, -1));
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(nextPickable(bathroom, i, 1));
        break;
      case 'Home':
        e.preventDefault();
        moveFocus(firstPickable(bathroom));
        break;
      case 'End':
        e.preventDefault();
        moveFocus(lastPickable(bathroom));
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        pick(i);
        break;
    }
  };

  // ---- reveal -----------------------------------------------------------------------------
  const showReveal = !!evaluation && (picked === undefined || arrived);
  const reveal = useMemo(() => (showReveal && evaluation ? buildReveal(evaluation, picked) : null), [showReveal, evaluation, picked]);
  const reactorDir = new Map<number, -1 | 1>();
  reveal?.reactors.forEach((r) => reactorDir.set(r.index, r.dir));

  const pickedSlot = picked !== undefined ? layout.slots[picked] : undefined;

  // Quirk chips sit over heads; a leaning drunk can push his chip into a neighbour's, so spread them.
  const chipX = useMemo(() => {
    const items: { i: number; x: number }[] = [];
    layout.slots.forEach((g) => {
      const guy = bathroom.slots[g.index].occupant;
      if (guy && guy.quirk !== 'normal' && g.kind === 'urinal') items.push({ i: g.index, x: headPoint(guy, g.cx).x });
    });
    return new Map(spreadChips(items, CHIP_W).map((c) => [c.i, c.x]));
  }, [layout, bathroom]);
  const youInStall = !!pickedSlot && pickedSlot.kind === 'stall' && arrived;

  const rootClass = ['urinal-scene', reducedMotion ? 'us-reduced' : '', locked ? 'us-locked' : 'us-live', className ?? '']
    .filter(Boolean)
    .join(' ');
  const W = layout.width;
  const solidLeft = layout.door.side === 'right';
  const skew = (solidLeft ? -1 : 1) * (Math.atan(SIDE_SLOPE) * 180) / Math.PI;

  return (
    <div className={rootClass} style={{ maxWidth: Number.isFinite(maxScale) ? `${Math.round(W * maxScale)}px` : undefined }}>
      <svg
        className="us-svg"
        viewBox={`0 0 ${W} ${SCENE_H}`}
        role="group"
        aria-label={ariaLabel ?? describeBathroom(bathroom)}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id={tileId} width={24} height={24} patternUnits="userSpaceOnUse">
            <path d="M24,0 L0,0 L0,24" fill="none" className="us-tile-line" />
          </pattern>
          <pattern id={sideTileId} width={24} height={24} patternUnits="userSpaceOnUse" patternTransform={`skewY(${skew})`}>
            <path d="M24,0 L0,0 L0,24" fill="none" className="us-tile-line us-tile-line-side" />
          </pattern>
        </defs>

        {/* room shell */}
        <rect className="us-floor" x={0} y={FLOOR_Y} width={W} height={SCENE_H - FLOOR_Y} />
        <FloorLines width={W} />
        <rect className="us-wall" x={0} y={0} width={W} height={FLOOR_Y} />
        <rect x={0} y={0} width={W} height={FLOOR_Y} fill={`url(#${tileId})`} />
        <line className="us-baseboard" x1={0} x2={W} y1={FLOOR_Y} y2={FLOOR_Y} />
        <Doorway layout={layout} />
        <SolidEnd layout={layout} tileId={sideTileId} />

        {/* red zone bands (behind fixtures) */}
        {reveal?.bands.map((band) => {
          const sp = spanOf(layout, band.lo, band.hi);
          return (
            <g key={`band-${band.occupant}`} className="us-band">
              <rect x={sp.x0 + 2} y={40} width={sp.x1 - sp.x0 - 4} height={FLOOR_Y - 40} rx={6} className="us-band-wall" />
              <rect x={sp.x0 + 2} y={FLOOR_Y + 4} width={sp.x1 - sp.x0 - 4} height={FEET_Y + 16 - FLOOR_Y - 4} rx={6} className="us-band-floor" />
            </g>
          );
        })}

        {/* fixtures */}
        {layout.slots.map((g) => {
          const slot = bathroom.slots[g.index];
          if (g.kind === 'stall') {
            return <Stall key={`fx-${g.index}`} g={g} occupant={slot.occupant} you={youInStall && picked === g.index} />;
          }
          return <Urinal key={`fx-${g.index}`} cx={g.cx} low={g.flag === 'low'} broken={g.flag === 'broken'} />;
        })}
        {layout.dividers.map((d) => (
          <Divider key={`div-${d.index}`} x={d.x} />
        ))}
        {/* grade plate under "you" (under any puddle, which stays visible) */}
        {reveal?.grade && pickedSlot && (
          <ellipse
            className="us-plate"
            cx={pickedSlot.cx}
            cy={FEET_Y}
            rx={PITCH / 2 - 6}
            ry={9}
            fill={GRADES[reveal.grade].color}
            stroke={GRADES[reveal.grade].ink}
          />
        )}

        {layout.slots.map((g) => (g.flag === 'puddle' ? <Puddle key={`pud-${g.index}`} cx={g.cx} /> : null))}
        {slotNumbers &&
          layout.slots.map((g) => (
            <text key={`num-${g.index}`} className="us-slot-num" x={g.cx} y={SCENE_H - 7} textAnchor="middle">
              {g.index + 1}
            </text>
          ))}

        {/* occupants */}
        {layout.slots.map((g) => {
          const slot = bathroom.slots[g.index];
          const guy = slot.occupant;
          if (!guy) return null;
          const dir = reactorDir.get(g.index);
          if (g.kind === 'stall') {
            return (
              <g key={`occ-${g.index}`} className="us-occupant">
                <title>{`${guy.name}: ${guy.blurb}`}</title>
                <QuirkChip x={g.cx} y={STALL_TOP_Y + 52} quirk={guy.quirk} />
              </g>
            );
          }
          return (
            <Occupant
              key={`occ-${g.index}`}
              guy={guy}
              cx={g.cx}
              index={g.index}
              turn={headTurn(guy, bathroom.door, dir)}
              chipX={chipX.get(g.index)}
              propSide={guy.quirk === 'facetime' && dir ? dir : propSideFor(bathroom, g.index)}
              straddle={slot.flag === 'puddle'}
            />
          );
        })}

        {/* you */}
        {walkKey !== null && pickedSlot && (
          <YouWalker
            key={walkKey}
            hidden={youInStall}
            fromX={layout.entryX}
            toX={pickedSlot.cx}
            instant={!!reducedMotion || arrived}
            straddle={pickedSlot.flag === 'puddle'}
            onArrive={handleArrive}
          />
        )}
        {youInStall && pickedSlot && (
          <g transform={`translate(${pickedSlot.cx},${STALL_TOP_Y + 40})`}>
            <YouTag y={0} />
          </g>
        )}

        {/* reactions */}
        {reveal?.reactors.map(({ index, dir }) => {
          const g = layout.slots[index];
          const guy = bathroom.slots[index].occupant;
          if (!guy) return null;
          const stall = g.kind === 'stall';
          const head = stall ? { x: g.cx, y: STALL_TOP_Y + 14 } : headPoint(guy, g.cx);
          const text = stall
            ? guy.quirk === 'boss'
              ? '…'
              : guy.quirk === 'talker'
                ? 'So…'
                : guy.quirk === 'facetime'
                  ? FACETIME_REACTION
                  : '!'
            : REACTION_TEXT[guy.quirk];
          if (guy.quirk === 'facetime' && !stall) {
            // Bubble comes from the phone, which he has turned toward you.
            // Phone redrawn above "you" (who may stand right next to it); bubble floats above your tag.
            const s = heightScale(guy.look.height);
            const px = g.cx + dir * (PHONE_X + 4) * s;
            const py = FEET_Y + (PHONE_Y - 42) * s;
            return (
              <g key={`react-${index}`} className="us-reaction">
                <g transform={`translate(${g.cx},${FEET_Y}) scale(${s})`}>
                  <g
                    transform={`translate(${dir * PHONE_X},${PHONE_Y + (bathroom.slots[index].flag === 'puddle' ? STRADDLE_DROP : 0)}) rotate(${dir * 8})`}
                  >
                    <FaceTimePhone />
                  </g>
                </g>
                <SideBubble x={px} y={py} text={FACETIME_REACTION} dir={dir} small />
              </g>
            );
          }
          return (
            <g key={`react-${index}`} className="us-reaction">
              {guy.quirk === 'splasher' && !stall ? (
                <g transform={`translate(${g.cx},${FEET_Y})`}>
                  <Droplets dir={dir} />
                </g>
              ) : null}
              {text && <SideBubble x={head.x + dir * 19} y={head.y + 4} text={text} dir={dir} />}
            </g>
          );
        })}

        {/* talkers never stop talking */}
        {layout.slots.map((g) => {
          const guy = bathroom.slots[g.index].occupant;
          if (!guy || guy.quirk !== 'talker' || g.kind !== 'urinal') return null;
          const reactDir = reactorDir.get(g.index);
          const turn = headTurn(guy, bathroom.door, reactDir) || 1;
          const head = headPoint(guy, g.cx);
          return (
            <g key={`talk-${g.index}`} className={reactDir ? 'us-talk us-reaction' : 'us-talk'}>
              <SideBubble x={head.x + turn * 19} y={head.y + 6} text={reactDir ? 'So…' : TALKER_LINE} dir={turn} small={!reactDir} />
            </g>
          );
        })}

        {/* reveal rings and green checks (on top) */}
        {reveal?.grade && pickedSlot && <Ring layout={layout} index={pickedSlot.index} color={GRADES[reveal.grade].color} ink={GRADES[reveal.grade].ink} />}
        {reveal?.missedGreens.map((i) => (
          <g key={`green-${i}`}>
            <Ring layout={layout} index={i} color={GRADES.clear.color} ink={GRADES.clear.ink} dashed />
            <CheckMark x={layout.slots[i].cx} y={FEET_Y + 2} />
          </g>
        ))}

        {/* pickable hit areas */}
        {!locked &&
          layout.slots.map((g) => {
            const slot = bathroom.slots[g.index];
            if (!isPickable(slot)) return null;
            return (
              <g
                key={`btn-${g.index}`}
                ref={(el) => {
                  if (el) btnRefs.current.set(g.index, el);
                  else btnRefs.current.delete(g.index);
                }}
                className="us-slot-btn"
                role="button"
                tabIndex={g.index === roving ? 0 : -1}
                aria-label={slotLabel(slot, g.index)}
                onClick={() => pick(g.index)}
                onKeyDown={(e) => onKey(e, g.index)}
                onFocus={() => setFocusIdx(g.index)}
              >
                <rect className="us-hit" x={g.x0} y={HIT_TOP} width={PITCH} height={SCENE_H - HIT_TOP} />
                <g className="us-hl" aria-hidden="true">
                  <rect className="us-hl-glow" x={g.x0 + 4} y={HIT_TOP + 2} width={PITCH - 8} height={FEET_Y + 14 - HIT_TOP} rx={12} />
                  <Footprints cx={g.cx} />
                </g>
              </g>
            );
          })}
      </svg>
    </div>
  );
}

function FloorLines({ width }: { width: number }) {
  return (
    <g className="us-floor-lines">
      <line x1={0} x2={width} y1={FLOOR_Y + 22} y2={FLOOR_Y + 22} />
      <line x1={0} x2={width} y1={FLOOR_Y + 48} y2={FLOOR_Y + 48} />
    </g>
  );
}

function Footprints({ cx }: { cx: number }) {
  return (
    <g className="us-footprints">
      <ellipse cx={cx - 9} cy={FEET_Y - 1} rx={7} ry={3.6} />
      <ellipse cx={cx + 9} cy={FEET_Y - 1} rx={7} ry={3.6} />
    </g>
  );
}

function Ring({ layout, index, color, ink, dashed }: { layout: SceneLayout; index: number; color: string; ink: string; dashed?: boolean }) {
  const g = layout.slots[index];
  const box = { x: g.x0 + 3, y: HIT_TOP, width: PITCH - 6, height: FEET_Y + 16 - HIT_TOP, rx: 12 };
  // Dark outline under the colour so pale grades (clear) still read on the tiles.
  return (
    <g className={dashed ? 'us-ring us-ring-dashed' : 'us-ring'}>
      <rect {...box} className="us-ring-outline" stroke={ink} />
      <rect {...box} className="us-ring-fill" stroke={color} />
    </g>
  );
}

function CheckMark({ x, y }: { x: number; y: number }) {
  return (
    <g className="us-check" transform={`translate(${x},${y})`}>
      <circle r={11.5} fill={GRADES.clear.color} stroke={GRADES.clear.ink} strokeWidth={2.5} />
      <path d="M-5,0.5 L-1.5,4 L5.5,-4" fill="none" stroke={GRADES.clear.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

interface OccupantProps {
  guy: Guy;
  cx: number;
  index: number;
  turn: -1 | 0 | 1;
  chipX?: number;
  propSide: -1 | 1;
  /** Standing over a puddle: legs spread wide. */
  straddle?: boolean;
}

function Occupant({ guy, cx, index, turn, chipX, propSide, straddle }: OccupantProps) {
  const look = useMemo(() => resolveLook(guy.look, guy.quirk), [guy.look, guy.quirk]);
  const tilt = drunkTilt(guy);
  const head = headPoint(guy, cx);
  const drunk = guy.quirk === 'drunk';
  return (
    <g className={`us-occupant us-occupant-${guy.quirk}`}>
      <title>{`${guy.name}: ${guy.blurb}`}</title>
      {guy.quirk === 'splasher' && (
        <g transform={`translate(${cx},${FEET_Y})`}>
          <SplashPuddle />
        </g>
      )}
      <g transform={`translate(${cx},${FEET_Y})${tilt ? ` rotate(${tilt})` : ''}`}>
        <g
          className={drunk ? 'us-wobble' : 'us-sway'}
          style={{ animationDelay: `${-((index * 0.61) % 2.4).toFixed(2)}s` }}
        >
          <GuyFigure
            look={look}
            quirk={guy.quirk}
            turn={turn}
            talking={guy.quirk === 'talker' || guy.quirk === 'facetime'}
            propSide={propSide}
            straddle={straddle ? 1 : 0}
          />
        </g>
      </g>
      {/* chip stays upright even when the guy leans */}
      <QuirkChip x={chipX ?? head.x} y={head.top - 5} quirk={guy.quirk} />
    </g>
  );
}

interface YouWalkerProps {
  fromX: number;
  toX: number;
  /** Appear at the destination (final pose) and report arrival on the next tick. Read once at mount. */
  instant: boolean;
  /** Stay mounted (so arrival still reports) but draw nothing: "you" are inside a stall. */
  hidden?: boolean;
  /** Destination has a puddle: settle into the straddle after arriving. */
  straddle?: boolean;
  onArrive: () => void;
}

function YouWalker({ fromX, toX, instant, hidden, straddle, onArrive }: YouWalkerProps) {
  const [instantAtMount] = useState(instant);
  const total = WALK_MS + (straddle ? STRADDLE_MS : 0);
  const [ms, setMs] = useState(instantAtMount ? total : 0);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  useEffect(() => {
    if (instantAtMount) {
      setMs(total);
      const id = setTimeout(() => onArriveRef.current(), 0);
      return () => clearTimeout(id);
    }
    let raf = 0;
    let start: number | null = null;
    let arrived = false;
    let done = false;
    const arrive = () => {
      if (arrived) return;
      arrived = true;
      onArriveRef.current();
    };
    // Fallback in case rAF is throttled (background tab): still arrive on time.
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      setMs(total);
      arrive();
    }, total + 250);
    const tick = (now: number) => {
      if (done) return;
      if (start === null) start = now;
      const e = Math.min(total, now - start);
      setMs(e);
      if (e >= WALK_MS) arrive();
      if (e >= total) {
        done = true;
        clearTimeout(timer);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [instantAtMount, total]);

  if (hidden) return null;
  const t = Math.min(1, ms / WALK_MS);
  const k = straddle ? Math.max(0, Math.min(1, (ms - WALK_MS) / STRADDLE_MS)) : 0;
  const pose = walkPose(fromX, toX, t);
  const opacity = instantAtMount ? 1 : Math.min(1, 0.25 + t * 6);
  return (
    <g
      className={t >= 1 ? 'us-you us-you-arrived' : 'us-you us-you-walking'}
      transform={`translate(${pose.x.toFixed(2)},${(FEET_Y + pose.bob).toFixed(2)}) rotate(${pose.tilt.toFixed(2)})`}
      opacity={opacity}
    >
      <GuyFigure look={YOU_LOOK} hoodie straddle={k} />
      <YouTag y={guyTop(YOU_LOOK.height) - 4 + STRADDLE_DROP * k} />
    </g>
  );
}
