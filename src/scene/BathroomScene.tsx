// Side-view SVG bathroom. Owned by the Scene agent.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Bathroom, Evaluation, Guy, Side } from '../types';
import {
  FEET_Y,
  FLOOR_Y,
  GUY_H,
  HIT_TOP,
  MAX_PX_PER_UNIT,
  PITCH,
  SCENE_H,
  SIDE_SLOPE,
  WALK_MS,
  heightScale,
  layoutBathroom,
  spanOf,
  urinalMetrics,
  walkPose,
  type SceneLayout,
} from './geometry';
import {
  CHIP_W,
  Droplets,
  KNIGHT_HELM_RISE,
  SECURITY_CAP_RISE,
  figureRise,
  figureScale,
  legStretch,
  FaceTimePhone,
  GasEngulf,
  GuyFigure,
  PHONE_X,
  PHONE_Y,
  PILOT_CAP_RISE,
  PfftBurst,
  QuirkChip,
  StinkCloud,
  SideBubble,
  SplashPuddle,
  TOURIST_HAT_RISE,
  YouTag,
  bubbleLines,
  guyTop,
} from './Guy';
import {
  GUARD_CAP_RISE,
  GuardFigure,
  KnightShield,
  MASCOT_HEAD_Y,
  MASCOT_SCALE,
  MASCOT_TOP,
  NAPPER_SCALE,
  NapperFigure,
  SUMO_HEAD_Y,
  SUMO_TOP,
  Sink,
  SumoFigure,
  WetUrinal,
  WolfMascot,
  partWidth,
  spanCentre,
} from './BigGuys';
import { Divider, Doorway, Puddle, STALL_TOP_Y, SolidEnd, Stall, Urinal, UrinalTape } from './Fixtures';
import { GRADES } from '../grades';
import { gearBlocked, sideOf, zoneCovers, zoneRadius } from '../engine/code';
import { CRYPTO_LINES, FINANCE_LINES, KNIGHT_LINES, SECURITY_LINES, SHY_LINES, TWIN_LINES } from '../content';
import {
  buildReveal,
  canPick,
  describeBathroom,
  firstPickable,
  lastPickable,
  nextPickable,
  slotLabel,
  spreadChips,
} from './logic';
import { PACK_LID, PACK_RED, POLE_BLUE, YOU_LOOK, friendVariant, resolveLook, shade } from './looks';
import { STRADDLE_DROP, STRADDLE_MS } from './pose';
import './scene.css';

/** How long you stand at the urinal before the grade shows. */
const REVEAL_BEAT_MS = 250;

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
  /** Show small slot numbers (1-based) on the floor under each slot. Default true (small and faint, so "went with #9" is easy to find). */
  slotNumbers?: boolean;
  /**
   * Crowd stats: percent of players (0..100) who picked each slot, indexed like `bathroom.slots`
   * (missing or non-finite entries read as 0%). Once the evaluation is revealed, each pickable slot
   * gets a small "38%" label at the foot of the wall; the most-picked spot's label is inverted.
   */
  crowd?: number[];
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
// the FaceTime guy turns the phone to you and grandma asks. Keep them short: the bubble points at you.
const REACTION_TEXT: Record<Guy['quirk'], string | null> = {
  normal: '!',
  drunk: '!',
  talker: null,
  boss: '…',
  splasher: null,
  facetime: null,
  gassy: null,
  inlaw: 'Son.',
  pastor: 'Oh my.',
  peeper: 'Hi!',
  pilot: null,
  tourist: 'Mind the pack.',
  crypto: 'WAGMI.',
  finance: 'Adding you to the invite.',
  gymbro: 'Spot me?',
  twin: 'Ahem.',
  napper: null,
  shy: null,
  mascot: 'Awoo?',
  security: 'Move along.',
  germ: 'Don’t touch me!',
  friend: 'Hey!',
  rookie: 'How did you end up in the locker room?',
  doppel: '…',
  bigfoot: '!',
  dropper: 'Problem?',
  knight: 'Halt!',
  sumo: '…',
};
const FACETIME_REACTION = 'Who’s this?';
const TALKER_LINE = 'Hey, buddy!';
/** The pilot talks like the talker, but only ever about one thing. */
const PILOT_LINE = 'I’m a pilot.';
const PILOT_REACTION = 'Captain, actually.';
/** Guys with an always-on speech bubble aimed at the door (the finance bro is on speakerphone). */
const isChatty = (q: Guy['quirk']) => q === 'talker' || q === 'pilot' || q === 'crypto' || q === 'finance' || q === 'twin' || q === 'knight' || q === 'security';
/** The boss hiding in a stall, through the door. One per boss (by name). Short: one line each. */
const STALL_BOSS_LINES = ['Occupied.', 'Taking a call.', 'In a meeting.', 'Don’t come in.', 'My office now.', 'Circle back later.'];
/** The third triplet only ever agrees. */
const TRIPLET_LINE = '—yeah.';

/** Small stable string hash (FNV-1a), so a guy's line survives a reload. */
function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickLine(lines: readonly string[], key: string, fallback: string): string {
  return lines.length ? lines[hashStr(key) % lines.length] : fallback;
}

const TALKER_LINES = [TALKER_LINE, 'How’s it going?', 'Busy day, huh?', 'Crazy weather, right?'];
const PILOT_LINES = [PILOT_LINE, 'I fly planes.', 'Did I mention I fly?', 'Captain, actually.'];

/**
 * Line `index`'s guy says from `pool`: stable per guy, and never the same line as another guy of
 * his kind in this room (walk left to right; a taken line passes to the next free one).
 */
function roomLine(b: Bathroom, index: number, pool: readonly string[], fallback: string): string {
  if (pool.length === 0) return fallback;
  const q = b.slots[index].occupant?.quirk;
  const used = new Set<number>();
  for (let j = 0; j < b.slots.length; j++) {
    const g = b.slots[j].occupant;
    if (!g || g.quirk !== q || b.slots[j].kind !== b.slots[index].kind) continue;
    let k = hashStr(g.name) % pool.length;
    for (let t = 0; t < pool.length && used.has(k); t++) k = (k + 1) % pool.length;
    used.add(k);
    if (j === index) return pool[k];
  }
  return pickLine(pool, b.slots[index].occupant?.name ?? '', fallback);
}

/** A chatty guy's always-on line, never repeated by another guy of his kind in the room. */
function chatLine(b: Bathroom, index: number): string {
  const guy = b.slots[index].occupant!;
  if (guy.quirk === 'pilot') return roomLine(b, index, PILOT_LINES, PILOT_LINE);
  if (guy.quirk === 'security') return roomLine(b, index, SECURITY_LINES, 'You can’t pee here.');
  if (guy.quirk === 'knight') return roomLine(b, index, KNIGHT_LINES, 'Where’s the ren faire?');
  if (guy.quirk === 'crypto') return roomLine(b, index, CRYPTO_LINES, 'It’s still early.');
  if (guy.quirk === 'finance') return roomLine(b, index, FINANCE_LINES, 'Let’s circle back.');
  return roomLine(b, index, TALKER_LINES, TALKER_LINE);
}

/** Where a twin stands in his set (left to right), and his set's line key (stable per group). */
function twinRole(b: Bathroom, i: number): { order: number; size: number; key: number } {
  const g = b.slots[i].occupant;
  const list =
    g?.group === undefined
      ? [i]
      : b.slots.flatMap((sl, j) => (sl.kind === 'urinal' && sl.occupant?.quirk === 'twin' && sl.occupant.group === g.group ? [j] : []));
  const key = hashStr(`${list.map((j) => b.slots[j].occupant?.name ?? '').join('|')}#${g?.group ?? i}`);
  return { order: Math.max(0, list.indexOf(i)), size: list.length, key };
}

/** Twin A starts the sentence, twin B finishes it, a third triplet agrees. */
function twinLine(b: Bathroom, i: number): string {
  const { order, key } = twinRole(b, i);
  const pair = TWIN_LINES.length ? TWIN_LINES[key % TWIN_LINES.length] : (['Is this', '—urinal taken?'] as const);
  return order === 0 ? pair[0] : order === 1 ? pair[1] : TRIPLET_LINE;
}

/** Twins talk outward (first one left, last one right) so the sentence reads left to right; a middle triplet faces the door. */
function twinTurn(b: Bathroom, i: number): -1 | 1 {
  const { order, size } = twinRole(b, i);
  const door = b.door === 'left' ? -1 : 1;
  if (size < 2) return door;
  if (order === 0) return -1;
  if (order === size - 1) return 1;
  return door;
}

/** Dave looks at you: at your spot once you've picked, before that at the nearest open spot. */
function daveTurn(b: Bathroom, i: number, picked: number | undefined): -1 | 1 {
  if (picked !== undefined && picked !== i) return picked < i ? -1 : 1;
  for (let d = 1; d < b.slots.length; d++) {
    if (canPick(b, i - d)) return -1;
    if (canPick(b, i + d)) return 1;
  }
  return b.door === 'left' ? -1 : 1;
}

/** What a chatty guy says once he turns to you. */
function chatReaction(guy: Guy): string {
  if (guy.quirk === 'pilot') return PILOT_REACTION;
  if (guy.quirk === 'talker') return 'So…';
  return REACTION_TEXT[guy.quirk] ?? '!';
}

/** Body lean in degrees (positive = clockwise = toward the right): the drunk sways, the peeper leans in to look. */
function bodyTilt(guy: Guy): number {
  if (guy.quirk === 'drunk') return guy.lean === 'left' ? -9 : 9;
  if (guy.quirk === 'peeper' && guy.lean) return guy.lean === 'left' ? -4 : 4;
  return 0;
}

/** Which way a urinal occupant's head faces: toward you when reacting; the talker faces the door
 * (where you walk in); the FaceTime guy looks at his phone; the peeper looks where his zone runs long. */
function headTurn(guy: Guy, b: Bathroom, i: number, reactDir: -1 | 1 | undefined, picked?: number): -1 | 0 | 1 {
  if (reactDir) return reactDir;
  const door: Side = b.door;
  if (guy.quirk === 'twin') return twinTurn(b, i);
  // The wolf mascot faces the door too, so his snout shows.
  if (isChatty(guy.quirk) || guy.quirk === 'mascot') return door === 'left' ? -1 : 1;
  if (guy.quirk === 'facetime' || guy.quirk === 'peeper') return guy.lean === 'left' ? -1 : 1;
  if (guy.quirk === 'friend' && friendVariant(guy.name) === 'dave') return daveTurn(b, i, picked);
  return 0;
}

/** The napper's chip sits over his middle, right of his head (his Zz float up from there). */
const NAPPER_CHIP_DX = 22;

/** True for every slot of a multi-urinal guy except the first (he's drawn once, from his first slot). */
function isTrailingPart(guy: Guy): boolean {
  return partWidth(guy.quirk) > 1 && (guy.part ?? 0) > 0;
}

/** Hand holding the prop: the drunk's lean side; the boss's free side (right unless only left is free). */
function propSideFor(b: Bathroom, i: number): -1 | 1 {
  const guy = b.slots[i].occupant;
  if (guy?.quirk === 'drunk' || guy?.quirk === 'facetime' || guy?.quirk === 'gymbro') return guy.lean === 'left' ? -1 : 1;
  // The finance bro holds his speakerphone out on the door side, the way he's talking.
  if (guy?.quirk === 'finance') return b.door === 'left' ? -1 : 1;
  const rightBusy = !!b.slots[i + 1]?.occupant;
  const leftBusy = !!b.slots[i - 1]?.occupant;
  return rightBusy && !leftBusy ? -1 : 1;
}

/**
 * Always-on bubbles for chatty guys at urinals, aimed at the door ("Hey, buddy!", "I'm a pilot.",
 * a crypto pitch, a speakerphone line); on the reveal they turn to you ("So…", "Captain, actually.",
 * "WAGMI."). Drawn last, on top of everything. Lines over BUBBLE_WRAP chars break onto two lines.
 */
function chatBubbles(
  layout: ReturnType<typeof layoutBathroom>,
  bathroom: Bathroom,
  reactorDir: Map<number, -1 | 1>,
  picked: number | undefined,
) {
  return layout.slots.map((g) => {
    const guy = bathroom.slots[g.index].occupant;
    // The boss hiding in a stall talks through the door: a small line from the stall top, toward the room.
    if (guy?.quirk === 'boss' && g.kind === 'stall') {
      const toward: -1 | 1 = g.index > 0 ? -1 : 1;
      return (
        <g key={`talk-${g.index}`} className="us-talk">
          <SideBubble
            x={g.cx + toward * 16}
            y={STALL_TOP_Y + 8}
            text={roomLine(bathroom, g.index, STALL_BOSS_LINES, 'Occupied.')}
            dir={toward}
            small
            sceneW={layout.width}
          />
        </g>
      );
    }
    if (!guy || !isChatty(guy.quirk) || g.kind !== 'urinal') return null;
    const reactDir = reactorDir.get(g.index);
    const text = reactDir ? chatReaction(guy) : guy.quirk === 'twin' ? twinLine(bathroom, g.index) : chatLine(bathroom, g.index);
    const long = text.length > 3;
    const turn = headTurn(guy, bathroom, g.index, reactDir) || 1;
    const head = headPoint(guy, g.cx);
    // A neighbour on the side he's facing: drop the bubble to shoulder height so it doesn't cover that guy's head.
    // A long reaction does the same when you're standing right next to him.
    const crowdedSide = reactDir ? long && Math.abs((picked ?? g.index) - g.index) === 1 : !!bathroom.slots[g.index + turn]?.occupant;
    // A two-line bubble grows upward: sit it a little lower so it stays under his chip (or, dropped,
    // under the neighbour's chin).
    const twoLine = bubbleLines(text).length > 1;
    let y = head.y + (crowdedSide ? 30 : twoLine ? (reactDir ? 16 : 12) : reactDir ? 4 : 6);
    if (crowdedSide) {
      if (twoLine) y += reactDir ? 14 : 11;
      // Neighbouring twins: the inner one's bubble sits at shoulder height, clear of his brother's.
      // Neighbours stand at different heights: stay below his head and his own head-height bubble too.
      const nb = bathroom.slots[g.index + turn]?.occupant;
      const ng = layout.slots[g.index + turn];
      if (!reactDir && nb && ng) y = Math.max(y, headPoint(nb, ng.cx).y + 30 + (twoLine ? 11 : 0));
    }
    return (
      <g key={`talk-${g.index}`} className={reactDir ? 'us-talk us-reaction' : 'us-talk'}>
        <SideBubble x={head.x + turn * 19} y={y} text={text} dir={turn} small={!reactDir} sceneW={layout.width} />
      </g>
    );
  });
}

/** Scene-space centre of a standing guy's head (accounts for the drunk's and peeper's tilt). */
function headPoint(guy: Guy, cx: number): { x: number; y: number; top: number } {
  const q = guy.quirk;
  if (partWidth(q) > 1) {
    // Multi-urinal guys: measured from the middle of their span, whichever part's slot we were given.
    const mx = spanCentre(q, guy.part, cx);
    if (q === 'mascot') return { x: mx, y: FEET_Y + MASCOT_HEAD_Y * MASCOT_SCALE, top: FEET_Y + MASCOT_TOP * MASCOT_SCALE };
    if (q === 'sumo') return { x: mx, y: FEET_Y + SUMO_HEAD_Y, top: FEET_Y + SUMO_TOP };
    return { x: mx - 58 * NAPPER_SCALE, y: FEET_Y - 18 * NAPPER_SCALE, top: FEET_Y - 31 * NAPPER_SCALE };
  }
  const s = figureScale(q, guy.look.height);
  const rise = figureRise(q);
  const rad = (bodyTilt(guy) * Math.PI) / 180;
  const r = (163 + rise) * s;
  const rt = (GUY_H + rise) * s;
  return { x: cx + Math.sin(rad) * r, y: FEET_Y - Math.cos(rad) * r, top: FEET_Y - Math.cos(rad) * rt };
}

export function BathroomScene(props: BathroomSceneProps) {
  const { bathroom, onPick, disabled, picked, evaluation, reducedMotion, onWalkDone, className, ariaLabel, slotNumbers = true, crowd } = props;
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
  const beatTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(beatTimer.current), []);
  // The walker calls this when it arrives (also for an instant/restored arrival, on the next tick).
  // A live walk holds a short beat at the urinal before the grade shows.
  const handleArrive = useCallback(() => {
    if (walkKey === null) return;
    const land = () => {
      setArrivedKey(walkKey);
      if (firedRef.current !== walkKey) {
        firedRef.current = walkKey;
        onWalkDoneRef.current?.();
      }
    };
    window.clearTimeout(beatTimer.current);
    if (reducedMotion || arrivedKey === walkKey) land();
    else beatTimer.current = window.setTimeout(land, REVEAL_BEAT_MS);
  }, [walkKey, reducedMotion, arrivedKey]);
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
  // Gear-blocked urinals (a tourist's pack and poles) are never pickable, focusable or highlighted.
  const roving = focusIdx >= 0 && canPick(bathroom, focusIdx) ? focusIdx : firstPickable(bathroom);
  const btnRefs = useRef(new Map<number, SVGGElement>());

  const pick = (i: number) => {
    if (locked || !canPick(bathroom, i)) return;
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
  const reveal = useMemo(() => (showReveal && evaluation ? buildReveal(evaluation, picked, bathroom) : null), [showReveal, evaluation, picked, bathroom]);
  const reactorDir = new Map<number, -1 | 1>();
  reveal?.reactors.forEach((r) => reactorDir.set(r.index, r.dir));

  const pickedSlot = picked !== undefined ? layout.slots[picked] : undefined;

  // Quirk chips sit over heads; a leaning drunk can push his chip into a neighbour's, so spread them.
  const chipX = useMemo(() => {
    const items: { i: number; x: number }[] = [];
    layout.slots.forEach((g) => {
      const guy = bathroom.slots[g.index].occupant;
      if (!guy || guy.quirk === 'normal' || isTrailingPart(guy)) return;
      // A guy in a stall has his chip over the door: spread it with the rest.
      if (g.kind === 'stall') {
        items.push({ i: g.index, x: g.cx });
        return;
      }
      // The napper's chip sits over the middle of him, not over his head.
      const x =
        guy.quirk === 'napper'
          ? spanCentre('napper', guy.part, g.cx) + NAPPER_CHIP_DX
          : headPoint(guy, g.cx).x;
      items.push({ i: g.index, x });
    });
    return new Map(spreadChips(items, CHIP_W).map((c) => [c.i, c.x]));
  }, [layout, bathroom]);
  const youInStall = !!pickedSlot && pickedSlot.kind === 'stall' && arrived;

  // FaceTime: the stretch his camera films (the side away from the phone, to the end of the row),
  // straight from the engine so the picture can never disagree with the grade.
  // Splashers leave a wet floor that fades out the farther it gets from them.
  const splasherAt = bathroom.slots.flatMap((sl, i) => (sl.kind === 'urinal' && sl.occupant?.quirk === 'splasher' ? [i] : []));
  // Urinal occupants who are gassy (the draft starts at each one's head).
  const gassyAt = bathroom.slots.flatMap((sl, i) => (sl.kind === 'urinal' && sl.occupant?.quirk === 'gassy' ? [i] : []));
  const cameraSpans = useMemo(() => {
    const out: { guy: number; lo: number; hi: number; recAt: 'lo' | 'hi' }[] = [];
    bathroom.slots.forEach((s, j) => {
      const g = s.occupant;
      if (!g || g.quirk !== 'facetime' || !g.lean || s.kind !== 'urinal') return;
      const filmed = zoneCovers(bathroom, j).filter((i) => sideOf(i, j) !== g.lean);
      // REC sits at the far end of the frame, away from his head and chip.
      if (filmed.length) out.push({ guy: j, lo: Math.min(...filmed), hi: Math.max(...filmed), recAt: g.lean === 'left' ? 'hi' : 'lo' });
    });
    return out;
  }, [bathroom]);

  // Each gear-blocked urinal gets the item from the tourist beside it: the pack on his left (screen
  // left: we see him from behind), the poles on his right. Between two tourists, the pack wins.
  const gear = useMemo(() => {
    const out: { index: number; kind: 'pack' | 'poles' }[] = [];
    const is = (j: number, q: Guy['quirk']) => bathroom.slots[j]?.kind === 'urinal' && bathroom.slots[j].occupant?.quirk === q;
    for (const i of gearBlocked(bathroom)) {
      if (bathroom.slots[i].flag === 'broken') continue; // keep the OUT OF ORDER sign readable
      // Only the tourist's gear goes in here; Gym Bro's arm and the knight's shield are drawn on their own.
      if (!is(i - 1, 'tourist') && !is(i + 1, 'tourist')) continue;
      out.push({ index: i, kind: is(i + 1, 'tourist') ? 'pack' : 'poles' });
    }
    return out;
  }, [bathroom]);
  // The knight's kite shield, propped in the urinal on his shield side (side = toward him).
  const shields = useMemo(() => {
    const out: { index: number; side: -1 | 1 }[] = [];
    const blocked = gearBlocked(bathroom);
    bathroom.slots.forEach((sl, j) => {
      const g = sl.occupant;
      if (sl.kind !== 'urinal' || g?.quirk !== 'knight') return;
      const i = g.lean === 'left' ? j - 1 : j + 1;
      if (blocked.has(i) && bathroom.slots[i].flag !== 'broken' && !out.some((o) => o.index === i)) out.push({ index: i, side: i < j ? 1 : -1 });
    });
    return out;
  }, [bathroom]);
  // The germaphobe keeps flushing: the empty urinals right beside him are wet.
  const wetAt = useMemo(() => {
    const out = new Set<number>();
    bathroom.slots.forEach((sl, j) => {
      if (sl.kind !== 'urinal' || sl.occupant?.quirk !== 'germ') return;
      for (const i of [j - 1, j + 1]) {
        const n = bathroom.slots[i];
        if (n?.kind === 'urinal' && !n.occupant && n.flag !== 'sink' && n.flag !== 'broken') out.add(i);
      }
    });
    return [...out];
  }, [bathroom]);

  const rootClass = ['urinal-scene', reducedMotion ? 'us-reduced' : '', locked ? 'us-locked' : 'us-live', className ?? '']
    .filter(Boolean)
    .join(' ');
  const W = layout.width;
  const solidLeft = layout.door.side === 'right';
  const skew = (solidLeft ? -1 : 1) * (Math.atan(SIDE_SLOPE) * 180) / Math.PI;

  return (
    <div
      className={rootClass}
      style={{
        // Width cap and aspect ratio as variables, so a page can also cap the scene by height (see .round in styles.css).
        ['--us-max-w' as string]: Number.isFinite(maxScale) ? `${Math.round(W * maxScale)}px` : '100%',
        ['--us-aspect' as string]: W / SCENE_H,
      }}
    >
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
          {/* splash sheen: wet near the splasher, fading to nothing a couple of urinals out */}
          <radialGradient id={`${tileId}-wet`}>
            <stop offset="0%" stopColor="#5fb0e6" stopOpacity={0.6} />
            <stop offset="45%" stopColor="#8cc9f0" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#9ed3f5" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* room shell */}
        <rect className="us-floor" x={0} y={FLOOR_Y} width={W} height={SCENE_H - FLOOR_Y} />
        <FloorLines width={W} />
        {splasherAt.map((i) => (
          <g key={`wet-${i}`} aria-hidden="true">
            <ellipse cx={layout.slots[i].cx} cy={FEET_Y + 2} rx={PITCH * 2.2} ry={16} fill={`url(#${tileId}-wet)`} />
            <SplashDrops cx={layout.slots[i].cx} />
          </g>
        ))}
        <rect className="us-wall" x={0} y={0} width={W} height={FLOOR_Y} />
        <rect x={0} y={0} width={W} height={FLOOR_Y} fill={`url(#${tileId})`} />
        <line className="us-baseboard" x1={0} x2={W} y1={FLOOR_Y} y2={FLOOR_Y} />
        <Doorway layout={layout} />
        <SolidEnd layout={layout} tileId={sideTileId} />
        {/* gassy rooms: a small vent over the door and a faint draft drifting toward it */}
        {gassyAt.length > 0 && <GasVent layout={layout} />}
        {gassyAt.map((i) => (
          <Draft key={`draft-${i}`} layout={layout} fromX={headPoint(bathroom.slots[i].occupant as Guy, layout.slots[i].cx).x} animate={!reducedMotion} />
        ))}

        {/* a Clear: the zones you dodged flash up faintly, then fade */}
        {!reducedMotion &&
          reveal?.dodged.map((band) => {
            const sp = spanOf(layout, band.lo, band.hi);
            return (
              <rect key={`dodged-${band.occupant}`} x={sp.x0 + 2} y={FLOOR_Y + 4} width={sp.x1 - sp.x0 - 4} height={FEET_Y + 16 - FLOOR_Y - 4} rx={6} className="us-dodged" aria-hidden="true" />
            );
          })}
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
          if (g.flag === 'sink') {
            const gb = slot.occupant?.quirk === 'gymbro' ? slot.occupant : undefined;
            const gl = gb ? resolveLook(gb.look, 'gymbro') : undefined;
            const reflection = gb && gl ? { side: (gb.lean === 'left' ? -1 : 1) as -1 | 1, skin: gl.skin, hair: gl.hair?.color ?? null, tank: gl.shirt } : undefined;
            return <Sink key={`fx-${g.index}`} cx={g.cx} reflection={reflection} />;
          }
          const guarded = slot.occupant?.quirk === 'security';
          return (
            <g key={`fx-${g.index}`}>
              <Urinal cx={g.cx} low={g.flag === 'low'} broken={g.flag === 'broken'} />
              {/* the urinal security is guarding, for no stated reason: taped off */}
              {guarded && <UrinalTape cx={g.cx} />}
            </g>
          );
        })}
        {layout.dividers.map((d) => (
          <Divider key={`div-${d.index}`} x={d.x} />
        ))}
        {/* backpack tourists: his pack hangs on the urinal to his left, his poles stand in the one to his right */}
        {gear.map(({ index, kind }) => {
          const g = layout.slots[index];
          return kind === 'pack' ? (
            <Backpack key={`gear-${index}`} cx={g.cx} low={g.flag === 'low'} />
          ) : (
            <TrekPoles key={`gear-${index}`} cx={g.cx} low={g.flag === 'low'} />
          );
        })}
        {/* the knight's shield in the urinal on his shield side */}
        {shields.map(({ index, side }) => (
          <KnightShield key={`shield-${index}`} cx={layout.slots[index].cx} low={layout.slots[index].flag === 'low'} side={side} />
        ))}
        {/* germaphobe: the urinals beside him are wet */}
        {wetAt.map((i) => (
          <WetUrinal key={`wet-u-${i}`} cx={layout.slots[i].cx} low={layout.slots[i].flag === 'low'} />
        ))}
        {/* FaceTime: a viewfinder over everything his camera can see (in front of urinals, behind men) */}
        {cameraSpans.map((c) => (
          <CameraFrame key={`cam-${c.guy}`} layout={layout} lo={c.lo} hi={c.hi} recAt={c.recAt} />
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

        {/* reveal rings and green checks: behind the men, so legs and every speech bubble sit on top */}
        {reveal?.grade && pickedSlot && <Ring layout={layout} index={pickedSlot.index} color={GRADES[reveal.grade].color} ink={GRADES[reveal.grade].ink} />}
        {reveal?.grade === 'clear' && pickedSlot && !reducedMotion && <Sparkle cx={pickedSlot.cx} />}
        {reveal?.missedGreens.map((i) => (
          <g key={`green-${i}`}>
            <Ring layout={layout} index={i} color={GRADES.clear.color} ink={GRADES.clear.ink} dashed />
            <CheckMark x={layout.slots[i].cx} y={FEET_Y + 2} />
          </g>
        ))}

        {/* occupants */}
        {layout.slots.map((g) => {
          const slot = bathroom.slots[g.index];
          const guy = slot.occupant;
          if (!guy) return null;
          const dir = reactorDir.get(g.index);
          if (g.kind === 'urinal' && isTrailingPart(guy)) return null; // drawn once, from his first slot
          if (g.kind === 'urinal' && partWidth(guy.quirk) > 1) {
            // React if any slot of his reacted (they all carry his zone).
            const w = partWidth(guy.quirk);
            let rd: -1 | 1 | undefined;
            for (let p = 0; p < w && !rd; p++) rd = reactorDir.get(g.index + p);
            return (
              <BigOccupant
                key={`occ-${g.index}`}
                guy={guy}
                cx={g.cx}
                index={g.index}
                turn={headTurn(guy, bathroom, g.index, rd)}
                chipX={chipX.get(g.index)}
                reduced={!!reducedMotion}
                reacting={!!rd}
              />
            );
          }
          if (g.kind === 'urinal' && guy.quirk === 'security') {
            return <UrinalGuard key={`occ-${g.index}`} guy={guy} cx={g.cx} chipX={chipX.get(g.index)} />;
          }
          if (g.kind === 'stall') {
            return (
              <g key={`occ-${g.index}`} className="us-occupant">
                <title>{`${guy.name}: ${guy.blurb}`}</title>
                <QuirkChip x={chipX.get(g.index) ?? g.cx} y={STALL_TOP_Y + 52} quirk={guy.quirk} mood={guy.mood} />
              </g>
            );
          }
          return (
            <Occupant
              key={`occ-${g.index}`}
              guy={guy}
              cx={g.cx}
              index={g.index}
              turn={headTurn(guy, bathroom, g.index, dir, picked)}
              chipX={chipX.get(g.index)}
              propSide={guy.quirk === 'facetime' && dir ? dir : propSideFor(bathroom, g.index)}
              straddle={slot.flag === 'puddle'}
              reacting={!!dir}
              flexReach={guy.quirk !== 'gymbro' || !bathroom.slots[g.index + (guy.lean === 'left' ? -1 : 1)]?.occupant}
              flexRoom={guy.quirk !== 'gymbro' || !bathroom.slots[g.index + (guy.lean === 'left' ? 1 : -1)]?.occupant}
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
          if (stall && guy.quirk === 'boss') return null; // he's hiding; his door line stays as it is
          if (guy.quirk === 'security') return null; // he's on duty, not bothered by you
          // A multi-urinal guy says it once, from the first of his slots that reacted.
          if (!stall && partWidth(guy.quirk) > 1) {
            const first = index - (guy.part ?? 0);
            const firstReactor = reveal.reactors.find((r) => r.index >= first && r.index < first + partWidth(guy.quirk));
            if (firstReactor?.index !== index) return null;
          }
          if (!stall && isChatty(guy.quirk)) return null; // chatBubbles turns his bubble to you
          const head = stall ? { x: g.cx, y: STALL_TOP_Y + 14 } : headPoint(guy, g.cx);
          const text = stall
            ? isChatty(guy.quirk)
              ? chatReaction(guy)
              : guy.quirk === 'facetime'
                ? FACETIME_REACTION
                : guy.quirk === 'gassy'
                  ? null
                  : (REACTION_TEXT[guy.quirk] ?? '!')
            : guy.quirk === 'shy'
              ? roomLine(bathroom, index, SHY_LINES, 'Nope. Nope.')
              : REACTION_TEXT[guy.quirk];
          if (guy.quirk === 'gassy') {
            // PFFT over him (at his hip, downwind side); the cloud on "you" is drawn in its own layer.
            const lean: -1 | 1 = guy.lean === 'left' ? -1 : 1;
            const s = heightScale(guy.look.height);
            const bx = stall ? g.cx : g.cx + lean * 22 * s;
            const by = stall ? STALL_TOP_Y + 110 : FEET_Y - 96 * s;
            return (
              <g key={`react-${index}`} className="us-reaction">
                <PfftBurst x={bx} y={by} />
              </g>
            );
          }
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
                <SideBubble x={px} y={py} text={FACETIME_REACTION} dir={dir} small sceneW={W} />
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
              {/* right next to you, a wordy bubble drops to shoulder height so it doesn't cover your head */}
              {text && (
                <SideBubble
                  x={head.x + dir * (guy.quirk === 'mascot' && !stall ? 50 : guy.quirk === 'sumo' && !stall ? 26 : 19)}
                  y={Math.max(30, head.y + (text.length > 3 && Math.abs((reveal.picked ?? index) - index) === 1 ? 30 : 4))}
                  text={text}
                  dir={dir}
                  sceneW={W}
                />
              )}
            </g>
          );
        })}


        {/* after the pick, puffs drift from each gassy guy toward the door (where his smell goes), out to the
            edge of his reach: they only reach you if you're downwind and inside it */}
        {reveal &&
          pickedSlot &&
          !reducedMotion &&
          gassyAt.map((i) => {
            const guy = bathroom.slots[i].occupant as Guy;
            const g = layout.slots[i];
            const dir: -1 | 1 = guy.lean === 'left' ? -1 : 1;
            const s = heightScale(guy.look.height);
            const startX = g.cx + dir * 22 * s;
            const startY = FEET_Y - 96 * s;
            const reach = zoneRadius(guy, dir > 0 ? 'right' : 'left') * PITCH;
            const dist = reach;
            return (
              <g key={`drift-${i}`} className="us-gas-drift" aria-hidden="true">
                {[0, 1, 2, 3].map((k) => (
                  <circle
                    key={k}
                    cx={startX}
                    cy={startY + (k % 2 ? 6 : -4)}
                    r={5 - k * 0.6}
                    style={{ ['--dx' as string]: `${dir * dist}px`, animationDelay: `${k * 220}ms` }}
                  />
                ))}
              </g>
            );
          })}

        {/* gassy reaction: a big green cloud engulfs you */}
        {pickedSlot &&
          reveal?.reactors.some((r) => bathroom.slots[r.index].occupant?.quirk === 'gassy') && (
            <g className="us-reaction" transform={`translate(${pickedSlot.cx},${FEET_Y + (pickedSlot.flag === 'puddle' ? STRADDLE_DROP : 0)})`}>
              <GasEngulf />
            </g>
          )}


        {/* crowd stats: what share of players picked each spot (after the reveal) */}
        {reveal && crowd && <CrowdLabels layout={layout} bathroom={bathroom} crowd={crowd} />}

        {/* talkers (the pilot, the crypto bro, the finance bro on speaker, the knight) never stop talking: on top of everything */}
        {chatBubbles(layout, bathroom, reactorDir, reveal?.picked)}

        {/* pickable hit areas */}
        {!locked &&
          layout.slots.map((g) => {
            const slot = bathroom.slots[g.index];
            if (!canPick(bathroom, g.index)) return null;
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

/** A Clear: three small glints rise off the top of the ring and fade. Plays once. */
function Sparkle({ cx }: { cx: number }) {
  const glints = [
    { dx: -18, delay: 0, s: 1 },
    { dx: 4, delay: 90, s: 1.3 },
    { dx: 20, delay: 170, s: 0.85 },
  ];
  return (
    <g className="us-sparkle" aria-hidden="true">
      {glints.map((g, i) => (
        <path
          key={i}
          d="M0,-6 Q0.9,-0.9 6,0 Q0.9,0.9 0,6 Q-0.9,0.9 -6,0 Q-0.9,-0.9 0,-6 Z"
          transform={`translate(${cx + g.dx} ${HIT_TOP + 8}) scale(${g.s})`}
          style={{ animationDelay: `${g.delay}ms` }}
        />
      ))}
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

/** "38%"; a share that isn't zero or everyone never reads as "0%" or "100%". */
function crowdPct(p: number): string {
  if (!(p > 0)) return '0%';
  if (p < 1) return '<1%';
  if (p < 100 && p >= 99.5) return '99%';
  return `${Math.round(Math.min(100, p))}%`;
}

/**
 * Percent pills at the foot of the wall under each pickable slot: below the lowest urinal bowl and
 * above the ✓ marker and the ring's bottom edge. Text is sized off the room width so it renders at
 * roughly the same on-screen size in any room on a phone (bigger rooms are drawn smaller).
 */
function CrowdLabels({ layout, bathroom, crowd }: { layout: SceneLayout; bathroom: Bathroom; crowd: number[] }) {
  const fs = Math.max(15, Math.min(21, layout.width / 36));
  const h = fs + 7;
  const cy = FLOOR_Y + 6;
  const maxW = PITCH - 14; // clear of the ring's outline
  const items = layout.slots
    .filter((g) => canPick(bathroom, g.index))
    .map((g) => {
      const raw = crowd[g.index];
      const p = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      return { g, p, text: crowdPct(p) };
    });
  const top = Math.max(0, ...items.map((it) => it.p));
  return (
    <g className="us-crowd" aria-hidden="true">
      {items.map(({ g, p, text }) => {
        // Bold digits run ~0.6em, "%" a bit wider; shrink the font if a label would outgrow the slot.
        const natural = fs * (0.6 * text.length + 0.3) + 10;
        const size = natural > maxW ? (fs * (maxW - 10)) / (natural - 10) : fs;
        const w = Math.min(natural, maxW);
        const cls = p <= 0 ? 'us-crowd-pill us-crowd-zero' : p === top ? 'us-crowd-pill us-crowd-top' : 'us-crowd-pill';
        return (
          <g key={`crowd-${g.index}`} className={cls}>
            <rect x={g.cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} />
            <text x={g.cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="central" style={{ fontSize: size }}>
              {text}
            </text>
          </g>
        );
      })}
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
  /** He's reacting to you (the shy guy freaks out). */
  reacting?: boolean;
  /** Gym Bro: room to stretch his flexing arm over the next urinal. */
  flexReach?: boolean;
  /** Gym Bro: room for his other arm out over his own sink. */
  flexRoom?: boolean;
}

/** Extra height (unscaled) of a hat or helmet over the head, so the chip sits clear of it. */
function hatRise(q: Guy['quirk']): number {
  if (q === 'pilot') return PILOT_CAP_RISE;
  if (q === 'tourist') return TOURIST_HAT_RISE;
  if (q === 'security') return SECURITY_CAP_RISE;
  if (q === 'knight') return KNIGHT_HELM_RISE;
  return 0;
}

function Occupant({ guy, cx, index, turn, chipX, propSide, straddle, reacting, flexReach, flexRoom }: OccupantProps) {
  const look = useMemo(() => resolveLook(guy.look, guy.quirk, guy.name), [guy.look, guy.quirk, guy.name]);
  const blurId = `us-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const tilt = bodyTilt(guy);
  const head = headPoint(guy, cx);
  const drunk = guy.quirk === 'drunk';
  const q = guy.quirk;
  const friend = q === 'friend' ? friendVariant(guy.name) : undefined;
  const s = figureScale(q, guy.look.height);
  // The rookie's head is at the top edge: his chip rides at his waist instead.
  const chipY = q === 'rookie' ? FEET_Y - 84 * legStretch(q) * s + 24 : head.top - 5 - hatRise(q) * s;
  const motion = drunk ? 'us-wobble' : q === 'knight' ? 'us-clank' : q === 'shy' && reacting ? 'us-shake' : 'us-sway';
  return (
    <g className={`us-occupant us-occupant-${guy.quirk}`}>
      {/* Bigfoot: always a little out of focus, like every photo of him */}
      {q === 'bigfoot' && (
        <filter id={blurId} x="-10%" y="-5%" width="120%" height="110%">
          <feGaussianBlur stdDeviation={0.6} />
        </filter>
      )}
      <title>{`${guy.name}: ${guy.blurb}`}</title>
      {guy.quirk === 'splasher' && (
        <g transform={`translate(${cx},${FEET_Y})`}>
          <SplashPuddle />
        </g>
      )}
      <g
        transform={`translate(${cx},${FEET_Y})${tilt ? ` rotate(${tilt})` : ''}`}
        filter={q === 'bigfoot' ? `url(#${blurId})` : undefined}
      >
        <g className={motion} style={{ animationDelay: `${-((index * 0.61) % 2.4).toFixed(2)}s` }}>
          <GuyFigure
            look={look}
            hoodie={q === 'doppel'}
            quirk={guy.quirk}
            turn={turn}
            talking={isChatty(guy.quirk) || guy.quirk === 'facetime' || (q === 'shy' && reacting)}
            propSide={propSide}
            straddle={straddle ? 1 : 0}
            friend={friend}
            flexReach={flexReach}
            flexRoom={flexRoom}
            nod={friend === 'dave'}
          />
        </g>
      </g>
      {guy.quirk === 'gassy' && (
        <g transform={`translate(${cx},${FEET_Y + (straddle ? STRADDLE_DROP : 0)})`}>
          <StinkCloud dir={guy.lean === 'left' ? -1 : 1} />
        </g>
      )}
      {/* chip stays upright even when the guy leans; the drunk's and peeper's point the long way */}
      <QuirkChip
        x={chipX ?? head.x}
        y={chipY}
        quirk={guy.quirk}
        lean={guy.quirk === 'drunk' || guy.quirk === 'peeper' ? guy.lean : undefined}
        mood={guy.mood}
      />
    </g>
  );
}

/** The security guard on duty in front of the urinal he's taped off, for no stated reason (facing the room, arms at his sides). */
function UrinalGuard({ guy, cx, chipX }: { guy: Guy; cx: number; chipX?: number }) {
  const look = useMemo(() => resolveLook(guy.look, 'security', guy.name), [guy.look, guy.name]);
  const s = heightScale(guy.look.height) * 0.88;
  return (
    <g className="us-occupant us-occupant-security us-guard">
      <title>{`${guy.name}: ${guy.blurb}`}</title>
      <g transform={`translate(${cx},${FEET_Y}) scale(${s})`}>
        <GuardFigure look={look} />
      </g>
      <QuirkChip x={chipX ?? cx} y={FEET_Y - (GUY_H + GUARD_CAP_RISE) * s - 5} quirk="security" />
    </g>
  );
}

interface BigOccupantProps {
  guy: Guy;
  /** Centre of his first slot. */
  cx: number;
  index: number;
  turn: -1 | 0 | 1;
  chipX?: number;
  reduced: boolean;
  reacting: boolean;
}

/** The guys who fill more than one urinal (the napper, the wolf mascot, the sumo): drawn once across all of them. */
function BigOccupant({ guy, cx, index, turn, chipX, reduced, reacting }: BigOccupantProps) {
  const look = useMemo(() => resolveLook(guy.look, guy.quirk, guy.name), [guy.look, guy.quirk, guy.name]);
  const q = guy.quirk;
  const mx = spanCentre(q, guy.part, cx);
  const head = headPoint(guy, cx);
  const napper = q === 'napper';
  return (
    <g className={`us-occupant us-occupant-${q}`}>
      <title>{`${guy.name}: ${guy.blurb}`}</title>
      <g transform={`translate(${mx},${FEET_Y})`}>
        <g className={napper ? undefined : 'us-sway'} style={{ animationDelay: `${-((index * 0.61) % 2.4).toFixed(2)}s` }}>
          {napper ? <NapperFigure look={look} reduced={reduced} /> : q === 'mascot' ? <WolfMascot turn={turn} talking={reacting} /> : <SumoFigure look={look} />}
        </g>
      </g>
      <QuirkChip x={chipX ?? (napper ? mx + NAPPER_CHIP_DX : mx)} y={napper ? FEET_Y - 50 : head.top - 4} quirk={q} />
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

/** Camera viewfinder over the slots a FaceTime guy is filming: corner brackets, a faint tint, a REC tag. */
function CameraFrame({ layout, lo, hi, recAt }: { layout: SceneLayout; lo: number; hi: number; recAt: 'lo' | 'hi' }) {
  const sp = spanOf(layout, lo, hi);
  const x0 = sp.x0 + 5;
  const x1 = sp.x1 - 5;
  const y0 = 8;
  const y1 = FEET_Y + 14;
  const k = 16; // bracket arm length
  const rec = { w: 44, h: 16 };
  const recX = recAt === 'hi' ? x1 - rec.w - 6 : x0 + 6;
  return (
    <g className="us-cam" aria-hidden="true">
      <rect className="us-cam-tint" x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={8} />
      <path
        className="us-cam-bracket"
        d={`M${x0},${y0 + k} V${y0} H${x0 + k} M${x1 - k},${y0} H${x1} V${y0 + k} M${x1},${y1 - k} V${y1} H${x1 - k} M${x0 + k},${y1} H${x0} V${y1 - k}`}
      />
      <g transform={`translate(${recX},${y0 + 5})`}>
        <rect className="us-cam-rec" width={rec.w} height={rec.h} rx={8} />
        <circle className="us-cam-dot" cx={10} cy={rec.h / 2} r={4} />
        <text className="us-cam-text" x={18} y={rec.h / 2 + 0.5} dominantBaseline="central">
          REC
        </text>
      </g>
    </g>
  );
}

const VENT_W = 26;
const VENT_H = 12;
const VENT_Y = 9;

/** Where the vent sits: centered above the doorway, clear of the urinal pipes. */
function ventX(layout: SceneLayout): number {
  return layout.door.cx - VENT_W / 2;
}

/** A small return-air vent over the door end. Decor, drawn quiet. */
function GasVent({ layout }: { layout: SceneLayout }) {
  const x = ventX(layout);
  return (
    <g className="us-vent" aria-hidden="true">
      <rect x={x} y={VENT_Y} width={VENT_W} height={VENT_H} rx={2} />
      {[3, 6, 9].map((dy) => (
        <line key={dy} x1={x + 4} x2={x + VENT_W - 4} y1={VENT_Y + dy} y2={VENT_Y + dy} />
      ))}
    </g>
  );
}

/** The faint air current from the gassy guy to the vent: two thin wavy strokes, barely there. */
function Draft({ layout, fromX, animate }: { layout: SceneLayout; fromX: number; animate: boolean }) {
  const toX = ventX(layout) + VENT_W / 2;
  const toY = VENT_Y + VENT_H + 2;
  const wave = (y0: number, amp: number) => {
    const n = 4;
    let d = `M${fromX},${y0}`;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const x = fromX + (toX - fromX) * t;
      const y = y0 + (toY - y0) * t * t;
      const cx = fromX + (toX - fromX) * (t - 0.5 / n);
      d += ` Q${cx},${y + (k % 2 ? amp : -amp)} ${x},${y}`;
    }
    return d;
  };
  return (
    <g className={`us-draft${animate ? ' is-moving' : ''}`} aria-hidden="true">
      <path d={wave(64, 5)} />
      <path d={wave(80, 4)} />
    </g>
  );
}

/** Droplets on the floor around a splasher: bigger and darker near him, fewer and fainter farther out. */
const SPLASH_DROPS: readonly (readonly [number, number, number])[] = [
  // [distance out in pitches, y offset, size]
  [0.55, -3, 4.2], [0.7, 4, 3.6], [0.9, -1, 3.4], [1.05, 5, 2.8], [1.25, -4, 2.6],
  [1.45, 2, 2.1], [1.7, -2, 1.7], [1.95, 4, 1.3], [2.2, -1, 1],
];

function SplashDrops({ cx }: { cx: number }) {
  return (
    <g className="us-splash-drops">
      {SPLASH_DROPS.flatMap(([d, dy, size], k) =>
        ([-1, 1] as const).map((side) => {
          const fade = Math.max(0, 1 - d / 2.4);
          // Mirror sides a little differently so it doesn't look stamped.
          const x = cx + side * (d * PITCH + (side < 0 ? 3 : 0));
          const y = FEET_Y + 2 + (side < 0 ? -dy : dy);
          return <ellipse key={`${k}${side}`} cx={x} cy={y} rx={size * 1.8} ry={size * 0.7} fill="#4a9fd8" opacity={0.15 + 0.5 * fade} />;
        }),
      )}
    </g>
  );
}

/**
 * A backpack tourist's pack, hung off the flush valve by its haul loop so it covers the bowl: a
 * big red-orange trekking pack with a dark lid, front pocket, compression straps, a water bottle
 * in the side pocket and a sleeping mat strapped underneath. Nobody is using this urinal.
 */
function Backpack({ cx, low }: { cx: number; low?: boolean }) {
  const m = urinalMetrics(!!low);
  const top = m.top - 6;
  return (
    <g className="us-gear us-pack" aria-hidden="true">
      {/* haul loop over the valve */}
      <path d={`M${cx - 6},${top + 2} Q${cx},${m.valveY - 4} ${cx + 6},${top + 2}`} fill="none" stroke="var(--us-ink)" strokeWidth={3.4} />
      <path d={`M${cx - 6},${top + 2} Q${cx},${m.valveY - 4} ${cx + 6},${top + 2}`} fill="none" stroke="#565c66" strokeWidth={1.6} />
      <g transform={`translate(${cx},${top})`}>
        {/* water bottle in the side pocket */}
        <rect className="us-ink" x={20} y={36} width={9} height={22} rx={3} fill="#4aa3df" strokeWidth={1.6} />
        <rect className="us-ink" x={21.5} y={32} width={6} height={5} rx={1} fill="#2a2f36" strokeWidth={1.4} />
        {/* body */}
        <path className="us-ink" fill={PACK_RED} d="M-21,10 Q-24,10 -24,16 L-25,84 Q-25,92 -17,92 L17,92 Q25,92 25,84 L24,16 Q24,10 21,10 Z" />
        <path d="M-17,18 L-18,84" stroke={shade(PACK_RED, 0.18)} strokeWidth={2} />
        {/* front pocket with a zip */}
        <path className="us-ink" fill={shade(PACK_RED, 0.12)} d="M-15,44 L15,44 Q17,44 17,47 L16,80 Q16,84 12,84 L-12,84 Q-16,84 -16,80 L-17,47 Q-17,44 -15,44 Z" strokeWidth={1.6} />
        <path d="M-13,50 H13" stroke="#2a2f36" strokeWidth={1.2} />
        <rect x={9} y={48} width={3} height={5} rx={1} fill="#c9d2db" />
        {/* compression straps and buckles */}
        {[30, 66].map((y) => (
          <g key={y}>
            <path d={`M-25,${y} H25`} stroke="#22262c" strokeWidth={3} />
            <rect x={-22} y={y - 3} width={6} height={6} rx={1} fill="#15171b" />
            <rect x={16} y={y - 3} width={6} height={6} rx={1} fill="#15171b" />
          </g>
        ))}
        {/* lid */}
        <path className="us-ink" fill={PACK_LID} d="M-22,14 Q-24,0 -12,-1 L12,-1 Q24,0 22,14 Q0,18 -22,14 Z" strokeWidth={1.8} />
        <path d="M-12,7 Q0,9.5 12,7" fill="none" stroke="#7d848f" strokeWidth={1.1} />
        {/* sleeping mat strapped under the pack */}
        <rect className="us-ink" x={-27} y={90} width={54} height={13} rx={6.5} fill="#5c9a3b" strokeWidth={1.8} />
        <path d="M-12,90 V103 M12,90 V103" stroke="#22262c" strokeWidth={2.4} />
        <ellipse cx={-27} cy={96.5} rx={2.4} ry={5.4} fill="#467a2c" />
        {/* luggage tag: it's his */}
        <g transform="translate(-23,22) rotate(12)">
          <path d="M0,0 L-3,6" stroke="#22262c" strokeWidth={1} />
          <rect className="us-ink" x={-9} y={5} width={10} height={13} rx={1.5} fill="#fbf6e4" strokeWidth={1.2} />
        </g>
      </g>
    </g>
  );
}

/**
 * The tourist's trekking poles, propped in the urinal: tips and snow baskets down in the bowl, the
 * shafts crossed against the wall, foam grips and wrist straps up by the flush pipe.
 */
function TrekPoles({ cx, low }: { cx: number; low?: boolean }) {
  const m = urinalMetrics(!!low);
  const k = m.scale;
  const tipY = m.top + 60 * k;
  const poles = [
    { x0: cx - 5, x1: cx + 17, y1: m.top - 50 * k - 8 },
    { x0: cx + 5, x1: cx - 16, y1: m.top - 44 * k - 8 },
  ];
  return (
    <g className="us-gear us-poles" aria-hidden="true">
      {poles.map(({ x0, x1, y1 }, i) => {
        const dx = x1 - x0;
        const dy = y1 - tipY;
        const at = (t: number) => [x0 + dx * t, tipY + dy * t] as const;
        const [bx, by] = at(0.1);
        const [sx, sy] = at(0.55);
        const [gx, gy] = at(0.8);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <g key={i}>
            {/* lower section silver, upper section blue (telescoping) */}
            <path d={`M${x0},${tipY} L${x1},${y1}`} stroke="var(--us-ink)" strokeWidth={5.4} strokeLinecap="round" />
            <path d={`M${x0},${tipY} L${sx},${sy}`} stroke="#c3ccd5" strokeWidth={2.8} strokeLinecap="round" />
            <path d={`M${sx},${sy} L${x1},${y1}`} stroke={POLE_BLUE} strokeWidth={3.2} strokeLinecap="round" />
            <circle cx={sx} cy={sy} r={2.6} fill="#22262c" />
            {/* snow basket near the tip */}
            <ellipse className="us-ink" cx={bx} cy={by} rx={7} ry={2.4} fill="#2a2f36" strokeWidth={1.2} transform={`rotate(${ang + 90},${bx},${by})`} />
            {/* foam grip and wrist strap */}
            <g transform={`translate(${gx},${gy}) rotate(${ang})`}>
              <rect className="us-ink" x={0} y={-3.6} width={20} height={7.2} rx={3} fill="#1d2025" strokeWidth={1.4} />
              <path d={`M18,0 C${i ? -2 : 26},${i ? 12 : -12} ${i ? 30 : -6},${i ? 14 : -14} 22,2`} fill="none" stroke={i ? '#e0542b' : '#237a35'} strokeWidth={2} />
            </g>
          </g>
        );
      })}
    </g>
  );
}
