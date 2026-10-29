import { describe, expect, it } from 'vitest';
import { parseHash, routeToHash, type Route } from './router';

describe('router', () => {
  it('parses every route', () => {
    expect(parseHash('')).toEqual({ name: 'menu' });
    expect(parseHash('#/')).toEqual({ name: 'menu' });
    expect(parseHash('#/daily')).toEqual({ name: 'daily' });
    expect(parseHash('#/daily/')).toEqual({ name: 'daily' });
    expect(parseHash('#/endless')).toEqual({ name: 'practice' });
    expect(parseHash('#/endless/K7Q2XM')).toEqual({ name: 'practice', code: 'K7Q2XM' });
    expect(parseHash('#/practice')).toEqual({ name: 'practice' }); // old links still work
    expect(parseHash('#/practice/K7Q2XM')).toEqual({ name: 'practice', code: 'K7Q2XM' });
    expect(parseHash('#/how')).toEqual({ name: 'how' });
    expect(parseHash('#/stats')).toEqual({ name: 'stats' });
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
    expect(parseHash('#/dev/scene')).toEqual({ name: 'devScene' });
    expect(parseHash('#/dev')).toEqual({ name: 'menu' });
    expect(parseHash('#/campaign/c1-l1')).toEqual({ name: 'menu' });
    expect(parseHash('#/practice/%E0%A4%A')).toEqual({ name: 'practice', code: '%E0%A4%A' });
  });

  it('round-trips', () => {
    const routes: Route[] = [
      { name: 'menu' },
      { name: 'daily' },
      { name: 'practice' },
      { name: 'practice', code: 'K7Q2XM' },
      { name: 'how' },
      { name: 'stats' },
      { name: 'settings' },
      { name: 'devScene' },
    ];
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r);
  });
});
