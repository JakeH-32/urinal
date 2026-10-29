import { afterEach, describe, expect, it, vi } from 'vitest';
import { SFX_NAMES, type SfxName } from './sfx';

const NAMES: readonly SfxName[] = SFX_NAMES;

async function freshSfx() {
  vi.resetModules();
  return (await import('./sfx')).sfx;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sfx without WebAudio (Node / SSR)', () => {
  it('every play() is a safe no-op returning a stop function', async () => {
    const sfx = await freshSfx();
    expect(typeof (globalThis as { AudioContext?: unknown }).AudioContext).toBe('undefined');
    for (const name of NAMES) {
      const stop = sfx.play(name);
      expect(typeof stop).toBe('function');
      expect(() => stop()).not.toThrow();
      expect(() => stop()).not.toThrow();
    }
    expect(() => sfx.setMuted(true)).not.toThrow();
    expect(() => sfx.setMuted(false)).not.toThrow();
    expect(() => sfx.unlock()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// A strict fake AudioContext: validates params the way browsers do.
// ---------------------------------------------------------------------------

function check(v: number, t: number) {
  if (!Number.isFinite(v)) throw new TypeError(`non-finite value ${v}`);
  if (!Number.isFinite(t) || t < 0) throw new RangeError(`bad time ${t}`);
}

class FakeParam {
  value: number;
  events: string[] = [];
  constructor(v = 0) {
    this.value = v;
  }
  setValueAtTime(v: number, t: number) {
    check(v, t);
    this.events.push('set');
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    check(v, t);
    this.events.push('lin');
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    check(v, t);
    if (v <= 0) throw new RangeError('exponential ramp to non-positive value');
    this.events.push('exp');
    return this;
  }
  setTargetAtTime(v: number, t: number, c: number) {
    check(v, t);
    if (!(c > 0)) throw new RangeError('bad time constant');
    return this;
  }
  cancelScheduledValues(t: number) {
    check(0, t);
    return this;
  }
}

class FakeNode {
  connected: unknown[] = [];
  connect(dest: unknown) {
    if (!dest) throw new TypeError('connect to nothing');
    this.connected.push(dest);
    return dest;
  }
  disconnect() {}
}

class FakeSource extends FakeNode {
  started = false;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(t = 0) {
    if (this.started) throw new Error('InvalidStateError: start() twice');
    check(0, t);
    this.started = true;
    ctxState.started++;
  }
  stop(t = 0) {
    if (!this.started) throw new Error('InvalidStateError: stop() before start()');
    check(0, t);
    this.stoppedAt = t;
  }
}

class FakeOsc extends FakeSource {
  type = 'sine';
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
}

class FakeBufferSource extends FakeSource {
  buffer: unknown = null;
  loop = false;
  playbackRate = new FakeParam(1);
}

class FakeGain extends FakeNode {
  gain = new FakeParam(1);
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
  gain = new FakeParam(0);
}

class FakeCompressor extends FakeNode {
  threshold = new FakeParam(-24);
  knee = new FakeParam(30);
  ratio = new FakeParam(12);
  attack = new FakeParam(0.003);
  release = new FakeParam(0.25);
}

class FakeBuffer {
  sampleRate: number;
  data: Float32Array;
  constructor(_ch: number, len: number, sr: number) {
    this.sampleRate = sr;
    this.data = new Float32Array(len);
  }
  getChannelData() {
    return this.data;
  }
}

const ctxState = { created: 0, started: 0, sources: [] as FakeSource[] };

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state = 'suspended';
  destination = new FakeNode();
  constructor() {
    ctxState.created++;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    const o = new FakeOsc();
    ctxState.sources.push(o);
    return o;
  }
  createBufferSource() {
    const s = new FakeBufferSource();
    ctxState.sources.push(s);
    return s;
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createDynamicsCompressor() {
    return new FakeCompressor();
  }
  createBuffer(ch: number, len: number, sr: number) {
    return new FakeBuffer(ch, len, sr);
  }
}

describe('sfx with a (fake) AudioContext', () => {
  it('creates the context lazily, once, and synthesizes every sound without errors', async () => {
    ctxState.created = 0;
    ctxState.started = 0;
    ctxState.sources = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const sfx = await freshSfx();
    expect(ctxState.created).toBe(0);

    for (const name of NAMES) {
      const before = ctxState.started;
      const stop = sfx.play(name);
      expect(typeof stop).toBe('function');
      expect(ctxState.started, `${name} scheduled nothing`).toBeGreaterThan(before);
      stop();
      stop();
    }
    expect(ctxState.created).toBe(1);
    // Every source that was created got started (no leaked, never-started nodes).
    expect(ctxState.sources.every((s) => s.started)).toBe(true);
  });

  it('has exactly the Urinal sound set', () => {
    expect([...NAMES].sort()).toEqual(['amber', 'clear', 'click', 'doctor', 'dryer', 'flush', 'step', 'straw']);
  });

  it('every sound is a short one-shot (nothing loops)', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const sfx = await freshSfx();
    for (const name of NAMES) {
      ctxState.sources = [];
      sfx.play(name);
      const ends = ctxState.sources.map((s) => s.stoppedAt ?? Infinity);
      expect(Math.max(...ends), name).toBeLessThan(name === 'flush' || name === 'dryer' ? 1.7 : 0.9);
    }
  });

  it('stop() cuts a sound short', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const sfx = await freshSfx();
    ctxState.sources = [];
    const stop = sfx.play('flush');
    stop();
    expect(ctxState.sources.every((s) => s.stoppedAt !== null && s.stoppedAt < 0.2)).toBe(true);
  });

  it('muting skips synthesis entirely', async () => {
    ctxState.started = 0;
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const sfx = await freshSfx();
    sfx.unlock();
    sfx.setMuted(true);
    expect(sfx.isMuted()).toBe(true);
    const before = ctxState.started;
    sfx.play('amber')();
    expect(ctxState.started).toBe(before);
    sfx.setMuted(false);
    sfx.play('amber');
    expect(ctxState.started).toBeGreaterThan(before);
  });

  it('never throws if the AudioContext constructor explodes', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('nope');
        }
      },
    );
    const sfx = await freshSfx();
    expect(() => sfx.unlock()).not.toThrow();
    for (const name of NAMES) expect(typeof sfx.play(name)).toBe('function');
  });
});
