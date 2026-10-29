import { describe, expect, it } from 'vitest';
import { SEED_MASK, createRng, decodePracticeCode, encodePracticeCode, seedFrom } from './rng';

describe('practice codes', () => {
  it('round-trips 6 Crockford chars', () => {
    const rng = createRng(7);
    for (let k = 0; k < 1000; k++) {
      const seed = rng.int(0, SEED_MASK);
      const code = encodePracticeCode(seed);
      expect(code).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
      expect(decodePracticeCode(code)).toBe(seed);
    }
    expect(encodePracticeCode(0)).toBe('000000');
    expect(encodePracticeCode(SEED_MASK)).toBe('ZZZZZZ');
  });

  it('is forgiving: lowercase, O->0, I/L->1, whitespace, p- prefix', () => {
    const seed = decodePracticeCode('K7Q201');
    expect(seed).not.toBeNull();
    expect(decodePracticeCode('k7q2o1')).toBe(seed);
    expect(decodePracticeCode(' K7Q2OI ')).toBe(seed);
    expect(decodePracticeCode('K7Q20L')).toBe(seed);
    expect(decodePracticeCode('p-K7Q201')).toBe(seed);
  });

  it('rejects junk', () => {
    expect(decodePracticeCode('')).toBeNull();
    expect(decodePracticeCode('K7Q2X')).toBeNull();
    expect(decodePracticeCode('K7Q2XMM')).toBeNull();
    expect(decodePracticeCode('K7Q2XU')).toBeNull();
    expect(decodePracticeCode('K7Q2X!')).toBeNull();
  });
});

describe('rng', () => {
  it('is deterministic', () => {
    const a = createRng(seedFrom('x'));
    const b = createRng(seedFrom('x'));
    for (let k = 0; k < 20; k++) expect(a.next()).toBe(b.next());
    expect(createRng(5).fork('a').next()).toBe(createRng(5).fork('a').next());
  });
});
