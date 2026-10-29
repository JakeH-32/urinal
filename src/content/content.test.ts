import { describe, expect, it } from 'vitest';
import { QUIRKS } from './index';

// Random-pool people can land at any venue, so they must not be tied to a specific event.
// (Event-bound characters belong in set pieces, where venue and people are written together.)
const EVENT_WORDS = /\b(groom|bride|wedding|best man|birthday|toast|speech|eulogy|funeral|reception|open bar|tailgat\w*|halftime|interview(ing)? you at|office party|santa)\b/i;

describe('quirk people pools', () => {
  for (const [quirk, text] of Object.entries(QUIRKS)) {
    it(`${quirk}: nobody is tied to one event`, () => {
      const bad = text.people.filter((p) => EVENT_WORDS.test(`${p.name} ${p.blurb}`)).map((p) => p.name);
      expect(bad).toEqual([]);
    });
  }
});
