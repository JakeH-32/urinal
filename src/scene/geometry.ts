// Pure layout math for the side-view bathroom. No React here: everything is tested.
import type { Bathroom, Side, SlotKind, UrinalFlag } from '../types';

/** Horizontal distance between neighbouring slot centres (viewBox units). */
export const PITCH = 72;
/** Width of the door bay at the door end of the room. */
export const DOOR_W = 68;
/** Gap between the far-end slot and the end wall. */
export const END_PAD = 8;
/** Narrowest viewBox; small rooms are centred with side walls filling the rest. */
export const MIN_W = 360;
/**
 * Max on-screen pixels per viewBox unit. The scene's frame caps its width at
 * `width * MAX_PX_PER_UNIT`, so fixtures render at the same size in a 2-slot room and a
 * 10-slot room (a 10-slot room is ~720px at this scale); narrower containers scale down.
 */
export const MAX_PX_PER_UNIT = 0.875;
/** Height of the doorway opening's top (lintel) at the door end. */
export const LINTEL_Y = 34;
/** Minimum visible sliver of side wall on each end. */
export const SIDE_MIN = 14;
/** ViewBox height. */
export const SCENE_H = 290;
/** Where the back wall meets the floor (the blue baseboard). */
export const FLOOR_Y = 228;
/** Where standing guys' feet touch the floor. */
export const FEET_Y = 262;
/** Top of the hit area for a pickable slot. */
export const HIT_TOP = 12;
/** How steeply the floor line runs down the side walls (perspective hint). */
export const SIDE_SLOPE = 0.35;

export interface SlotGeom {
  index: number;
  kind: SlotKind;
  flag?: UrinalFlag;
  /** Left edge, centre, right edge of the slot's column. */
  x0: number;
  cx: number;
  x1: number;
}

export interface DividerGeom {
  /** Divider sits between slot `index` and `index + 1`. */
  index: number;
  x: number;
}

export interface SceneLayout {
  width: number;
  height: number;
  /** Back-wall extent (the room). Outside it, perspective side walls. */
  roomX0: number;
  roomX1: number;
  door: { side: Side; x0: number; x1: number; cx: number };
  slots: SlotGeom[];
  dividers: DividerGeom[];
  /** Where "you" start walking from (inside the doorway, near the scene edge). */
  entryX: number;
  /** Doorway opening: from the scene edge to the jamb at the room side of the door bay. */
  opening: { x0: number; x1: number; jambX: number };
}

/** Width needed for the room contents (door bay + slots + end pad). */
export function contentWidth(slotCount: number): number {
  return DOOR_W + Math.max(0, slotCount) * PITCH + END_PAD;
}

export function layoutBathroom(b: Bathroom): SceneLayout {
  const n = b.slots.length;
  const cw = contentWidth(n);
  const width = Math.max(MIN_W, cw + 2 * SIDE_MIN);
  const roomX0 = (width - cw) / 2;
  const roomX1 = roomX0 + cw;
  const doorLeft = b.door === 'left';
  const doorX0 = doorLeft ? roomX0 : roomX1 - DOOR_W;
  const firstX = doorLeft ? roomX0 + DOOR_W : roomX0 + END_PAD;

  const slots: SlotGeom[] = b.slots.map((s, index) => {
    const x0 = firstX + index * PITCH;
    return { index, kind: s.kind, flag: s.flag, x0, cx: x0 + PITCH / 2, x1: x0 + PITCH };
  });

  const dividers: DividerGeom[] = [];
  for (let i = 0; i < n - 1; i++) {
    if (b.dividers[i]) dividers.push({ index: i, x: slots[i].x1 });
  }

  const door = { side: b.door, x0: doorX0, x1: doorX0 + DOOR_W, cx: doorX0 + DOOR_W / 2 };
  const opening = doorLeft
    ? { x0: 0, x1: door.x1, jambX: door.x1 }
    : { x0: door.x0, x1: width, jambX: door.x0 };
  const entryX = doorLeft ? door.x0 + 14 : door.x1 - 14;
  return { width, height: SCENE_H, roomX0, roomX1, door, slots, dividers, entryX, opening };
}

/** The solid (non-door) end: the perspective side wall spans [x0, x1] and meets the back wall at `cornerX`. */
export function solidEnd(layout: SceneLayout): { x0: number; x1: number; cornerX: number } {
  return layout.door.side === 'left'
    ? { x0: layout.roomX1, x1: layout.width, cornerX: layout.roomX1 }
    : { x0: 0, x1: layout.roomX0, cornerX: layout.roomX0 };
}

/** Floor-line y on the solid side wall at x (perspective: drops as it leaves the room). */
export function sideFloorY(layout: SceneLayout, x: number): number {
  const end = solidEnd(layout);
  if (x < end.x0 || x > end.x1) return FLOOR_Y;
  return FLOOR_Y + Math.abs(x - end.cornerX) * SIDE_SLOPE;
}

/** Horizontal span covering slots lo..hi inclusive (for zone bands, rings). */
export function spanOf(layout: SceneLayout, lo: number, hi: number): { x0: number; x1: number } {
  const a = layout.slots[Math.max(0, Math.min(lo, hi))];
  const b = layout.slots[Math.min(layout.slots.length - 1, Math.max(lo, hi))];
  return { x0: a.x0, x1: b.x1 };
}

// ---- Urinal / guy vertical metrics ----------------------------------------------

export interface UrinalMetrics {
  /** Top of the porcelain body. */
  top: number;
  /** Scale of the body relative to a normal urinal. */
  scale: number;
  /** Bottom of the body. */
  bottom: number;
  /** Flush valve centre y. */
  valveY: number;
}

const URINAL_BODY_H = 78;

export function urinalMetrics(low: boolean): UrinalMetrics {
  if (low) {
    const top = 140;
    const scale = 0.78;
    return { top, scale, bottom: top + URINAL_BODY_H * scale, valveY: 104 };
  }
  const top = 100;
  return { top, scale: 1, bottom: top + URINAL_BODY_H, valveY: 58 };
}

/** Body heights (feet to head-top) for look.height 0..2. */
export const HEIGHT_SCALES = [0.92, 1, 1.07] as const;
/** Unscaled feet-to-head-top height of a guy. */
export const GUY_H = 176;

export function heightScale(height: number): number {
  const i = Math.max(0, Math.min(HEIGHT_SCALES.length - 1, Math.round(height) || 0));
  return HEIGHT_SCALES[i];
}

/** y of the top of a standing guy's head. */
export function headTopY(height: number): number {
  return FEET_Y - GUY_H * heightScale(height);
}

// ---- Walking --------------------------------------------------------------------

export const WALK_MS = 900;

/** Ease-in-out cubic. */
export function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/** Position of the walker at normalised time t (0..1): x along the path, y bob (<= 0). */
export function walkPose(fromX: number, toX: number, t: number): { x: number; bob: number; tilt: number } {
  const c = Math.max(0, Math.min(1, t));
  const x = fromX + (toX - fromX) * easeInOut(c);
  const dist = Math.abs(toX - fromX);
  const steps = Math.max(2, Math.round(dist / 36));
  const phase = Math.sin(Math.PI * steps * c);
  const bob = c >= 1 ? 0 : -Math.abs(phase) * 4;
  const dir = toX >= fromX ? 1 : -1;
  const tilt = c >= 1 ? 0 : dir * 3 * Math.sin(Math.PI * c);
  return { x, bob, tilt };
}
