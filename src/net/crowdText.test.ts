import { describe, expect, it } from 'vitest';
import type { DayCrowd } from './community';
import { daySummaryText, pctText, reviewCrowdText, roundCrowdText } from './crowdText';

const rc = (bySlot: number[]) => ({ total: bySlot.reduce((a, b) => a + b, 0), bySlot });
const day = (players: number, ...pts: number[]): DayCrowd => {
  const points = new Array(19).fill(0);
  for (const p of pts) points[p] += 1;
  return { players, rounds: [null, null, null, null, null, null], points };
};

describe('pctText', () => {
  it('rounds, but never says 0% or 100% for a share that is neither', () => {
    expect(pctText(3, 8)).toBe('38%');
    expect(pctText(0, 8)).toBe('0%');
    expect(pctText(1, 300)).toBe('<1%');
    expect(pctText(999, 1000)).toBe('99%');
    expect(pctText(5, 5)).toBe('100%');
    expect(pctText(1, 0)).toBe('0%');
  });
});

describe('roundCrowdText', () => {
  it('says you are first when nobody else has played this round', () => {
    expect(roundCrowdText(rc([0, 0, 1]), 2)).toBe('You’re the first one in today.');
    // The server hasn't caught up with your pick yet: still just you.
    expect(roundCrowdText(rc([]), 2)).toBe('You’re the first one in today.');
  });

  it('reads naturally with two players', () => {
    expect(roundCrowdText(rc([0, 0, 2]), 2)).toBe('The other player picked #3 too.');
    expect(roundCrowdText(rc([1, 0, 1]), 2)).toBe('The other player went with #1.');
    expect(roundCrowdText(rc([1, 0, 0]), 2)).toBe('The other player went with #1.');
  });

  it('handles everyone agreeing', () => {
    expect(roundCrowdText(rc([0, 0, 3]), 2)).toBe('All 3 players picked #3.');
  });

  it('says when you picked with the crowd', () => {
    expect(roundCrowdText(rc([1, 0, 3, 1]), 2)).toBe('You picked with the crowd: 60% chose #3.');
  });

  it('names the most popular spot when it was not yours', () => {
    expect(roundCrowdText(rc([0, 0, 0, 3, 0, 0, 6, 1]), 3)).toBe('30% of players picked this spot. Most went with #7 (60%).');
    expect(roundCrowdText(rc([0, 0, 0, 1, 0, 0, 3, 1]), 3)).toBe('Nobody else picked this spot. Most went with #7 (60%).');
    // A plurality isn't "most".
    expect(roundCrowdText(rc([2, 3, 4, 3]), 0)).toBe('17% of players picked this spot. The crowd favorite was #3 (33%).');
  });

  it('notices when you found the Clear spot and the crowd did not', () => {
    expect(roundCrowdText(rc([0, 0, 0, 2, 0, 0, 6, 2]), 3, [3])).toBe('Only 20% of players found this spot. Most went with #7 (60%).');
    expect(roundCrowdText(rc([0, 1, 4]), 1, [1])).toBe('Nobody else found this spot. Most went with #3 (80%).');
  });

  it('handles a tie for the top spot', () => {
    expect(roundCrowdText(rc([2, 2, 1]), 0)).toBe('40% of players picked this spot. Just as many went with #2.');
  });

  it('prefers a Clear spot when naming a tied favourite', () => {
    expect(roundCrowdText(rc([1, 3, 3, 0]), 0, [2])).toBe('Nobody else picked this spot. The crowd favorite was #3 (43%).');
    expect(roundCrowdText(rc([1, 3, 3, 0]), 0)).toBe('Nobody else picked this spot. The crowd favorite was #2 (43%).');
  });

  it('returns nothing for a bad pick', () => {
    expect(roundCrowdText(rc([1, 2]), -1)).toBe('');
  });
});

describe('daySummaryText', () => {
  it('says check back later when you are the only one done', () => {
    expect(daySummaryText(day(1, 12), 12)).toEqual({ main: 'You’re the first one done today. Check back later.', note: null });
    expect(daySummaryText(day(3, 12), 12)).toEqual({
      main: 'You’re the first one done today. Check back later.',
      note: '3 players so far today',
    });
    // Your own finish hasn't landed yet.
    expect(daySummaryText(day(0), 12).main).toBe('You’re the first one done today. Check back later.');
  });

  it('reads naturally against one other player', () => {
    expect(daySummaryText(day(2, 12, 9), 12).main).toBe('Better hydrated than the other player today.');
    expect(daySummaryText(day(2, 12, 15), 12).main).toBe('The other player was better hydrated today.');
    expect(daySummaryText(day(2, 12, 12), 12).main).toBe('Exactly as hydrated as the other player today.');
    expect(daySummaryText(day(2, 12, 12), 12).note).toBe('2 players today');
  });

  it('gives a percentage with more players, plus a count note', () => {
    expect(daySummaryText(day(5, 10, 5, 5, 10, 15), 10)).toEqual({ main: 'Better hydrated than 63% of players today.', note: '5 players today' });
    expect(daySummaryText(day(7, 10, 5, 5, 10, 15), 10).note).toBe('5 of 7 players finished');
    // You aren't in the histogram yet: you're added before comparing.
    expect(daySummaryText(day(3, 5, 15), 10).main).toBe('Better hydrated than 50% of players today.');
  });
});

describe('reviewCrowdText', () => {
  it('summarises one round in a compact line', () => {
    expect(reviewCrowdText(rc([0, 0, 0, 1, 0, 0, 4]), 3)).toBe('You: #4 · Most: #7 (80%)');
    expect(reviewCrowdText(rc([1, 0, 0, 0, 0, 0, 4]), 6)).toBe('You: #7 · With the crowd (80%)');
    expect(reviewCrowdText(rc([2, 2, 1]), 0)).toBe('You: #1 · Tied with #2 (40%)');
    expect(reviewCrowdText(rc([0, 3]), 1)).toBe('You: #2 · Everyone (100%)');
    expect(reviewCrowdText(rc([0, 1]), 1)).toBe('You: #2 · Nobody else yet');
  });
});
