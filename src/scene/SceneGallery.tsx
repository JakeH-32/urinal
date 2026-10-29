// Dev page (#/dev/scene): every fixture, quirk, door side and reveal state, plus live examples.
// Evaluations here are hand-built (or from the tiny fake below); the real rules live in src/engine.
import { useState, type ReactNode } from 'react';
import type { Bathroom, Evaluation, Grade, Guy, Quirk, Side, Slot, SlotAnalysis } from '../types';
import { BathroomScene } from './BathroomScene';

let lookSeed = 3;
function guy(quirk: Quirk = 'normal', opts: Partial<Guy['look']> & { lean?: Side } = {}): Guy {
  const k = lookSeed++;
  const { lean, ...look } = opts;
  return {
    quirk,
    lean,
    name: quirk === 'normal' ? `Guy ${k}` : `${quirk[0].toUpperCase()}${quirk.slice(1)} ${k}`,
    blurb: 'Hand-built for the gallery.',
    look: {
      shirt: (k * 5) % 8,
      pants: (k * 3) % 5,
      hair: k % 6,
      skin: (k * 2) % 5,
      height: k % 3,
      bald: k % 7 === 0,
      ...look,
    },
  };
}

const U = (occupant?: Guy, flag?: Slot['flag']): Slot => ({ kind: 'urinal', flag, occupant });
const S = (occupant?: Guy): Slot => ({ kind: 'stall', occupant });
function room(slots: Slot[], door: Side, dividerAt: number[] = []): Bathroom {
  return { slots, door, dividers: slots.slice(1).map((_, i) => dividerAt.includes(i)) };
}

// ---- A tiny stand-in for the urinal code (gallery only) --------------------------------------

function radius(g: Guy, toward: Side): number {
  switch (g.quirk) {
    case 'talker':
    case 'splasher':
      return 2;
    case 'boss':
      return 3;
    case 'drunk':
      return toward === g.lean ? 3 : 1;
    case 'facetime':
      return toward === g.lean ? 2 : 1;
    case 'gassy':
      return toward === g.lean ? 3 : 1;
    default:
      return 1;
  }
}

export function fakeEvaluate(b: Bathroom): Evaluation {
  const n = b.slots.length;
  const rows: (SlotAnalysis & { key: number[] })[] = b.slots.map((slot, i) => {
    const pickable = !slot.occupant && slot.flag !== 'broken';
    if (!pickable) return { index: i, pickable, key: [] };
    const violatedBy: number[] = [];
    let clearance = Infinity;
    if (slot.kind === 'urinal') {
      b.slots.forEach((o, j) => {
        if (!o.occupant) return;
        const [lo, hi] = i < j ? [i, j] : [j, i];
        let d = hi - lo;
        if (o.occupant.quirk !== 'talker') for (let k = lo; k < hi; k++) if (b.dividers[k]) d++;
        const c = d - radius(o.occupant, i < j ? 'left' : 'right');
        clearance = Math.min(clearance, c);
        if (c <= 0) violatedBy.push(j);
      });
    }
    const tier = slot.kind === 'stall' ? 2 : violatedBy.length ? 3 : slot.flag ? 1 : 0;
    const wall = i === 0 || i === n - 1 ? 0 : 1;
    const fromDoor = b.door === 'left' ? i : n - 1 - i;
    return {
      index: i,
      pickable,
      tier,
      violations: violatedBy.length,
      clearance,
      violatedBy,
      key: [tier, violatedBy.length, -clearance, wall, -fromDoor],
    };
  });
  const cmp = (a: number[], c: number[]) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== c[k]) return a[k] < c[k] ? -1 : 1;
    return 0;
  };
  const cands = rows.filter((r) => r.pickable);
  const best = cands.reduce((m, r) => (cmp(r.key, m.key) < 0 ? r : m), cands[0]);
  const greens: number[] = [];
  for (const r of cands) {
    let grade: Grade;
    if (cmp(r.key, best.key) === 0) grade = 'clear';
    else if ((r.violations ?? 0) <= (best.violations ?? 0)) grade = 'straw';
    else {
      const quirky = (r.violatedBy ?? []).some((j) => b.slots[j].occupant?.quirk !== 'normal');
      grade = (r.violations ?? 0) >= 2 || quirky ? 'doctor' : 'amber';
    }
    r.grade = grade;
    if (grade === 'clear') greens.push(r.index);
  }
  return { slots: rows.map(({ key: _key, ...r }) => r), greens };
}

// ---- Fixtures ------------------------------------------------------------------------

const tiny2 = room([U(guy()), U()], 'left');
const tiny3 = room([U(), U(guy('boss')), U()], 'right');
const basic = room([U(guy()), U(), U(), U(guy()), U(), U()], 'left');
const fixtures = room(
  [U(undefined, 'low'), U(guy()), U(undefined, 'puddle'), U(undefined, 'broken'), U(), U(undefined, 'low'), U(guy('normal', { bald: true }))],
  'right',
  [1, 4],
);
const stalls = room([S(guy('normal', { pants: 1 })), S(), U(), U(guy()), U(), S(guy('boss'))], 'left', [2]);
const quirks = room(
  [
    U(guy('facetime', { lean: 'right' })),
    U(guy('talker')),
    U(),
    U(guy('splasher')),
    U(),
    U(guy('drunk', { lean: 'left' })),
    U(),
    U(guy('boss', { height: 2 })),
    U(),
    U(guy('drunk', { lean: 'right', bald: true })),
  ],
  'right',
  [0],
);
const crowded = room(
  [
    U(guy('gassy', { lean: 'left' })),
    U(guy('talker')),
    U(),
    U(guy('splasher')),
    U(guy()),
    U(),
    U(guy('boss')),
    U(guy('drunk', { lean: 'left' })),
    U(),
    U(guy('facetime', { lean: 'left' })),
  ],
  'left',
  [4],
);
const looksRow = room(
  Array.from({ length: 10 }, (_, i) => U(guy('normal', { hair: i % 6, shirt: i % 8, pants: i % 5, skin: i % 5, height: i % 3, bald: i === 9 }))),
  'left',
);

// Reveal fixtures.
const revealClearRoom = room([U(guy()), U(), U(), U(guy()), U(), U()], 'left');
const revealStrawRoom = room([U(), U(guy()), U(), U(), U(), U(guy('splasher'))], 'right', [2]);
const revealDoctorRoom = room([U(), U(guy('talker')), U(), U(), U(guy('boss')), U(), U()], 'left', [1]);
const revealFaceTimeRoom = room([U(), U(), U(guy('facetime', { lean: 'right' })), U(), U(), U(), U(), U(guy())], 'right');
const revealAmberRoom = room([U(guy()), U(), U(guy('splasher')), U(), U(undefined, 'broken'), U()], 'right');
const puddleRoom = room([U(guy('normal'), 'puddle'), U(), U(), U(undefined, 'puddle'), U(), U(guy('splasher'), 'puddle')], 'left');
// Gassy at 2, door on the right so his smell drifts right: zone covers 1 (r=1) and 3..5 (r=3).
const revealGassyRoom = room([U(), U(), U(guy('gassy', { lean: 'right' })), U(), U(), U()], 'right');
const revealStallRoom = room([U(guy()), U(), U(guy('boss')), U(), U(guy()), S()], 'left');

const evalOf = (b: Bathroom, picks: Record<number, Grade>, greens: number[], violated: Record<number, number[]> = {}): Evaluation => ({
  slots: b.slots.map((s, index) => {
    const pickable = !s.occupant && s.flag !== 'broken';
    return pickable ? { index, pickable, grade: picks[index] ?? 'straw', violatedBy: violated[index] ?? [] } : { index, pickable };
  }),
  greens,
});

const revealClear = evalOf(revealClearRoom, { 5: 'clear' }, [5]);
const revealStraw = evalOf(revealStrawRoom, { 0: 'clear', 3: 'straw' }, [0]);
// Talker at 1 (r=2, ignores dividers) covers 0..3; boss at 4 (r=3) covers 1..6 (2 via the divider math is illustrative).
const revealDoctor = evalOf(revealDoctorRoom, { 3: 'doctor', 0: 'doctor', 2: 'doctor', 5: 'doctor', 6: 'doctor' }, [6], {
  0: [1],
  2: [1, 4],
  3: [1, 4],
  5: [4],
  6: [4],
});
const revealAmber = evalOf(revealAmberRoom, { 1: 'amber', 3: 'doctor', 5: 'clear' }, [5], { 1: [0, 2], 3: [2] });
// FaceTime guy at 2 holds the phone to his right: frame covers 1 (left, r=1) and 3..4 (right, r=2).
const revealFaceTime = evalOf(revealFaceTimeRoom, { 0: 'clear', 1: 'amber', 3: 'doctor', 4: 'amber', 5: 'straw', 6: 'amber' }, [0], {
  1: [2],
  3: [2],
  4: [2],
  6: [7],
});
const puddleEval = evalOf(puddleRoom, { 3: 'straw', 2: 'clear' }, [2]);
const revealGassy = evalOf(revealGassyRoom, { 0: 'clear', 1: 'amber', 3: 'doctor', 4: 'doctor', 5: 'doctor' }, [0], {
  1: [2],
  3: [2],
  4: [2],
  5: [2],
});
const revealStall = evalOf(revealStallRoom, { 5: 'clear', 1: 'doctor', 3: 'doctor' }, [5], { 1: [0, 2], 3: [2, 4] });

// ---- Page ------------------------------------------------------------------------------

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ margin: '28px 0' }}>
      <h2 style={{ font: '700 16px/1.3 system-ui, sans-serif', margin: '0 0 4px' }}>{title}</h2>
      {note && <p style={{ font: '13px/1.4 system-ui, sans-serif', margin: '0 0 10px', opacity: 0.75 }}>{note}</p>}
      {children}
    </section>
  );
}

function Live({ bathroom, reducedMotion }: { bathroom: Bathroom; reducedMotion?: boolean }) {
  const [picked, setPicked] = useState<number | undefined>();
  const [evaluation, setEvaluation] = useState<Evaluation | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [...l.slice(-4), s]);
  const grade = picked !== undefined ? evaluation?.slots[picked]?.grade : undefined;
  return (
    <div>
      <BathroomScene
        bathroom={bathroom}
        picked={picked}
        evaluation={evaluation}
        reducedMotion={reducedMotion}
        slotNumbers
        onPick={(i) => {
          add(`pick ${i + 1}`);
          setPicked(i);
        }}
        onWalkDone={() => {
          add('walk done');
          setEvaluation(fakeEvaluate(bathroom));
        }}
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, font: '13px system-ui, sans-serif' }}>
        <button
          type="button"
          onClick={() => {
            setPicked(undefined);
            setEvaluation(undefined);
            add('reset');
          }}
        >
          Reset
        </button>
        <span>{grade ? `Grade: ${grade}` : picked !== undefined ? 'walking…' : 'Pick a spot (click, or Tab + arrows + Enter)'}</span>
        <span style={{ opacity: 0.6 }}>{log.join(' · ')}</span>
      </div>
    </div>
  );
}

export function SceneGallery() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px', color: 'inherit' }}>
      <h1 style={{ font: '800 22px/1.2 system-ui, sans-serif' }}>Scene gallery</h1>

      <Section title="Crowded (10 slots): every quirk, some shoulder to shoulder" note="Quirks must read at a glance, even at phone width.">
        <BathroomScene bathroom={crowded} />
      </Section>
      <Section title="Interactive" note="Pick → walk in → fake reveal (gallery-only evaluator). Arrow keys move between free spots.">
        <Live bathroom={room([U(guy()), U(), U(), U(guy('talker')), U(), U(undefined, 'puddle'), U(), S()], 'left', [5])} />
      </Section>
      <Section title="Interactive, reduced motion" note="No walk, no sway: you appear instantly.">
        <Live bathroom={room([U(), U(guy('boss')), U(), U(), U(guy()), U()], 'right')} reducedMotion />
      </Section>

      <Section title="2 slots, door left" note="Tiny rooms keep fixture scale and get a narrower frame.">
        <BathroomScene bathroom={tiny2} />
      </Section>
      <Section title="3 slots, door right">
        <BathroomScene bathroom={tiny3} />
      </Section>
      <Section title="Basic: 6 urinals, door left">
        <BathroomScene bathroom={basic} slotNumbers />
      </Section>
      <Section title="Fixtures: low, puddle, broken, dividers (after 2 and 5), door right">
        <BathroomScene bathroom={fixtures} slotNumbers />
      </Section>
      <Section title="Stalls: occupied, free (ajar), boss in a stall; divider after 3">
        <BathroomScene bathroom={stalls} />
      </Section>
      <Section title="Quirks (10 slots): FaceTime →, talker, splasher, drunk ←, boss (tall), drunk → (bald); divider after 1">
        <BathroomScene bathroom={quirks} />
      </Section>
      <Section title="Looks: every hair style, shirt, pants, skin, height, bald">
        <BathroomScene bathroom={looksRow} />
      </Section>

      <Section title="Reveal: clear pick (far wall)">
        <BathroomScene bathroom={revealClearRoom} picked={5} evaluation={revealClear} />
      </Section>
      <Section title="Reveal: straw pick, best spot marked">
        <BathroomScene bathroom={revealStrawRoom} picked={3} evaluation={revealStraw} />
      </Section>
      <Section title="Reveal: doctor pick between a talker and the boss">
        <BathroomScene bathroom={revealDoctorRoom} picked={3} evaluation={revealDoctor} />
      </Section>
      <Section title="Reveal: amber pick next to a normal guy and a splasher (door right)">
        <BathroomScene bathroom={revealAmberRoom} picked={1} evaluation={revealAmber} />
      </Section>
      <Section title="Reveal: doctor pick in the FaceTime guy's frame (phone turned to you)">
        <BathroomScene bathroom={revealFaceTimeRoom} picked={3} evaluation={revealFaceTime} />
      </Section>
      <Section title="Puddle straddle: occupant (slot 1), you (slot 4), splasher at a puddle (slot 6)" note="Legs wide over the puddle, knees bent, arms down. Live: try slot 6 in the first interactive room.">
        <BathroomScene bathroom={puddleRoom} picked={3} evaluation={puddleEval} slotNumbers />
      </Section>
      <Section title="Reveal: downwind of the gassy guy (door right)">
        <BathroomScene bathroom={revealGassyRoom} picked={4} evaluation={revealGassy} />
      </Section>
      <Section title="Reveal: stall pick (you're in the stall)">
        <BathroomScene bathroom={revealStallRoom} picked={5} evaluation={revealStall} />
      </Section>
      <Section title="Read-only, no evaluation, reduced motion">
        <BathroomScene bathroom={quirks} reducedMotion disabled />
      </Section>
    </div>
  );
}

export default SceneGallery;
