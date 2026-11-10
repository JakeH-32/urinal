// Legendary rooms: handmade, absurd, and about 1 in 2,000 Endless rooms. Each is a Sighting.
// Same rules as every other room; `answer` is checked against the engine in src/engine/setpieces.test.ts.
import type { SetPiece } from '../types';

export type LegendId = 'legend-team' | 'legend-bigfoot' | 'legend-sumo' | 'legend-mirror' | 'legend-wolves' | 'legend-triplets' | 'legend-chili';

export const LEGENDARY_ROOMS: (SetPiece & { id: LegendId })[] = [
  {
    id: 'legend-team',
    difficulty: 6,
    venue: 'Arena, halftime',
    premise: 'The entire starting five came in together.',
    layout: 'Rk Rk Rk _ _ _ Rk Rk',
    door: 'right',
    people: [
      { name: 'The point guard', blurb: 'Seven feet tall. Plays point anyway.' },
      { name: 'The shooting guard', blurb: 'Hasn’t missed a free throw all season. Mentions it.' },
      { name: 'The small forward', blurb: 'Six foot eleven. The small one.' },
      { name: 'The power forward', blurb: 'Ducked under the door frame. Still hit it.' },
      { name: 'The center', blurb: 'Could see over the dividers. Doesn’t.' },
    ],
    answer: 5,
  },
  {
    id: 'legend-bigfoot',
    difficulty: 6,
    venue: 'Rest stop, Pacific Northwest',
    premise: 'They exist. All four of them.',
    layout: 'Bf _ Bf _ _ _ Bf _ Bf',
    door: 'left',
    people: [
      { name: 'Bigfoot', blurb: 'Blurry in every photo. Clear as day in here.' },
      { name: 'Uncle Bigfoot', blurb: 'The blurry one in the famous photo. Won’t confirm.' },
      { name: 'Bigfoot Jr.', blurb: 'Forty-one. Still “Junior.”' },
      { name: 'Grandpa Bigfoot', blurb: 'Has been dodging cameras since 1967.' },
    ],
    answer: 5,
  },
  {
    id: 'legend-sumo',
    difficulty: 6,
    venue: 'Sumo tournament, intermission',
    premise: 'Two champions. One urinal between them.',
    layout: 'Sm Sm Sm _ Sm Sm Sm',
    door: 'right',
    answer: 4,
  },
  {
    id: 'legend-mirror',
    difficulty: 6,
    venue: 'A hall of mirrors',
    premise: 'Every one of them is you.',
    layout: 'Dp _ Dp _ _ _ Dp _ Dp',
    door: 'right',
    people: [
      { name: 'You', blurb: 'You.' },
      { name: 'Also you', blurb: 'Also you.' },
      { name: 'You again', blurb: 'Still you.' },
      { name: 'Another you', blurb: 'Somehow, you.' },
    ],
    answer: 5,
  },
  {
    id: 'legend-wolves',
    difficulty: 6,
    venue: 'Mascot convention',
    premise: 'Every team sent their wolf.',
    layout: 'Q Q _ _ _ Q Q _ Q Q',
    door: 'right',
    answer: 4,
  },
  {
    id: 'legend-triplets',
    difficulty: 6,
    venue: 'Triplets convention',
    premise: 'Two sets of triplets. Nobody can tell them apart.',
    layout: 'J J J _ _ _ J J J',
    door: 'left',
    answer: 5,
  },
  {
    id: 'legend-chili',
    difficulty: 6,
    venue: 'Chili cook-off, after the judging',
    premise: 'All six judges. They tried every chili.',
    layout: '_ G _ G G G _ G G _',
    door: 'right',
    people: [
      { name: 'Judge #1', blurb: 'Gave the ghost pepper entry a ten.' },
      { name: 'Judge #2', blurb: 'Went back for seconds on the five-bean.' },
      { name: 'Judge #3', blurb: 'Asked for extra onions. Twice.' },
      { name: 'Judge #4', blurb: 'Judged the cornbread too. Thoroughly.' },
      { name: 'Judge #5', blurb: 'Has a scorecard and a single regret.' },
      { name: 'Judge #6', blurb: 'Declared it a six-way tie. Sealed his fate.' },
    ],
    answer: 1,
  },
];
