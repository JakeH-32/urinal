// Tiny WebAudio synth: every sound is generated on the fly (no audio files).
// Safe everywhere: with no AudioContext (Node tests, SSR, ancient browsers) every call is a no-op.

/** One sound per grade (clear/straw/amber/doctor), so `sfx.play(grade)` works. */
export type SfxName = 'click' | 'step' | 'clear' | 'straw' | 'amber' | 'doctor' | 'flush' | 'dryer';

export const SFX_NAMES: readonly SfxName[] = ['click', 'step', 'clear', 'straw', 'amber', 'doctor', 'flush', 'dryer'];

type Stop = () => void;
const noop: Stop = () => {};
const MASTER_VOLUME = 0.5;
/** Exponential ramps can't hit 0. */
const SILENT = 0.0001;

interface AudioGlobals {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let broken = false;
let noiseBuf: AudioBuffer | null = null;

function getContext(): AudioContext | null {
  if (ctx || broken) return ctx;
  const g = globalThis as unknown as AudioGlobals;
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (typeof Ctor !== 'function') return null;
  try {
    const c = new Ctor();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 12;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    const m = c.createGain();
    m.gain.value = muted ? 0 : MASTER_VOLUME;
    m.connect(comp);
    comp.connect(c.destination);
    ctx = c;
    master = m;
  } catch {
    broken = true;
    ctx = null;
    master = null;
  }
  return ctx;
}

function wake(c: AudioContext): void {
  if (c.state !== 'suspended') return;
  try {
    const p = c.resume() as Promise<void> | undefined;
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignore */
  }
}

function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = Math.floor(c.sampleRate * 1.5);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic LCG noise (no Math.random so tests are stable).
  let seed = 0x2f6b3f;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  noiseBuf = buf;
  return buf;
}

// ---------------------------------------------------------------------------
// Voices: one per play() call, owning its nodes so stop() can cut it short.
// ---------------------------------------------------------------------------

interface Voice {
  c: AudioContext;
  out: GainNode;
  /** Start time (slightly in the future to avoid clicks). */
  t: number;
  sources: AudioScheduledSourceNode[];
  live: number;
  stopped: boolean;
}

function voice(c: AudioContext, dest: AudioNode): Voice {
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(dest);
  return { c, out, t: c.currentTime + 0.01, sources: [], live: 0, stopped: false };
}

function addSource(v: Voice, node: AudioScheduledSourceNode, start: number, stop?: number): void {
  node.start(start);
  if (stop !== undefined) node.stop(stop);
  v.sources.push(node);
  v.live++;
  node.onended = () => {
    v.live--;
    if (v.live <= 0) {
      try {
        v.out.disconnect();
      } catch {
        /* already gone */
      }
    }
  };
}

function stopVoice(v: Voice, fade = 0.05): void {
  if (v.stopped) return;
  v.stopped = true;
  const now = v.c.currentTime;
  try {
    const g = v.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fade);
  } catch {
    /* ignore */
  }
  for (const s of v.sources) {
    try {
      s.stop(now + fade + 0.02);
    } catch {
      /* already stopped */
    }
  }
}

const stopper = (v: Voice): Stop => () => stopVoice(v);

/** Attack to peak, optional hold, exponential decay to silence at t + dur. */
function env(g: AudioParam, t: number, peak: number, attack: number, dur: number, hold = 0): void {
  const a = Math.min(attack, dur * 0.5);
  g.setValueAtTime(SILENT, t);
  g.linearRampToValueAtTime(Math.max(SILENT, peak), t + a);
  if (hold > 0 && a + hold < dur) g.setValueAtTime(Math.max(SILENT, peak), t + a + hold);
  g.exponentialRampToValueAtTime(SILENT, t + dur);
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Glide target at the end of the note (exponential). */
  to?: number;
  /** Linear frequency waypoints: [offset seconds from note start, Hz]. */
  path?: [number, number][];
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  hold?: number;
  detune?: number;
  dest?: AudioNode;
}

function tone(v: Voice, o: ToneOpts): OscillatorNode {
  const { c } = v;
  const t = v.t + (o.at ?? 0);
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.path) for (const [dt, hz] of o.path) osc.frequency.linearRampToValueAtTime(Math.max(1, hz), t + dt);
  else if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const amp = c.createGain();
  env(amp.gain, t, o.gain, o.attack ?? 0.005, o.dur, o.hold);
  osc.connect(amp);
  amp.connect(o.dest ?? v.out);
  addSource(v, osc, t, t + o.dur + 0.03);
  return osc;
}

interface NoiseOpts {
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  hold?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  /** Loop forever (until the voice is stopped); envelope = fade-in only. */
  loop?: boolean;
  dest?: AudioNode;
}

function noise(v: Voice, o: NoiseOpts): { filter: BiquadFilterNode; amp: GainNode } {
  const { c } = v;
  const t = v.t + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.loop = !!o.loop;
  const filter = c.createBiquadFilter();
  filter.type = o.filter ?? 'lowpass';
  filter.frequency.setValueAtTime(o.freq ?? 1000, t);
  filter.Q.value = o.q ?? 0.8;
  const amp = c.createGain();
  if (o.loop) {
    amp.gain.setValueAtTime(SILENT, t);
    amp.gain.linearRampToValueAtTime(o.gain, t + (o.attack ?? 0.3));
  } else {
    env(amp.gain, t, o.gain, o.attack ?? 0.002, o.dur, o.hold);
  }
  src.connect(filter);
  filter.connect(amp);
  amp.connect(o.dest ?? v.out);
  addSource(v, src, t, o.loop ? undefined : t + o.dur + 0.03);
  return { filter, amp };
}

/** LFO wobbling an AudioParam by +-depth at rate Hz. */
function lfo(v: Voice, param: AudioParam, rate: number, depth: number, at = 0, dur?: number, type: OscillatorType = 'sine'): void {
  const { c } = v;
  const t = v.t + at;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(rate, t);
  const g = c.createGain();
  g.gain.value = depth;
  osc.connect(g);
  g.connect(param);
  addSource(v, osc, t, dur === undefined ? undefined : t + dur);
}

// ---------------------------------------------------------------------------
// The sounds
// ---------------------------------------------------------------------------

type Maker = (c: AudioContext, dest: AudioNode) => Stop;

function buzzer(c: AudioContext, dest: AudioNode, hz: number, dur: number, times: number): Stop {
  const v = voice(c, dest);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.Q.value = 1;
  lp.connect(v.out);
  for (let i = 0; i < times; i++) {
    const at = i * (dur + 0.08);
    tone(v, { type: 'square', at, freq: hz, dur, gain: 0.22, attack: 0.005, hold: dur * 0.7, dest: lp });
    tone(v, { type: 'sawtooth', at, freq: hz * 1.06, dur, gain: 0.12, attack: 0.005, hold: dur * 0.7, dest: lp });
  }
  return stopper(v);
}

const SOUNDS: Record<SfxName, Maker> = {
  click(c, dest) {
    const v = voice(c, dest);
    tone(v, { type: 'square', freq: 2400, to: 1300, dur: 0.035, gain: 0.1, attack: 0.001 });
    noise(v, { dur: 0.025, gain: 0.1, filter: 'highpass', freq: 3500 });
    return stopper(v);
  },

  /** One footstep on tile: a soft heel thud plus a short scuff. */
  step(c, dest) {
    const v = voice(c, dest);
    tone(v, { type: 'triangle', freq: 120, to: 70, dur: 0.07, gain: 0.35, attack: 0.002 });
    noise(v, { dur: 0.05, gain: 0.18, filter: 'bandpass', freq: 1800, q: 1.2 });
    noise(v, { at: 0.03, dur: 0.06, gain: 0.06, filter: 'highpass', freq: 4000 });
    return stopper(v);
  },

  /** Clear: pleasant two-note chime (a major sixth up). */
  clear(c, dest) {
    const v = voice(c, dest);
    [659.25, 1046.5].forEach((hz, i) => {
      tone(v, { at: i * 0.11, freq: hz, dur: 0.7, gain: 0.2, attack: 0.004 });
      tone(v, { at: i * 0.11, freq: hz * 2, dur: 0.35, gain: 0.04, attack: 0.004 });
      tone(v, { at: i * 0.11, type: 'triangle', freq: hz / 2, dur: 0.3, gain: 0.05, attack: 0.004 });
    });
    return stopper(v);
  },

  /** Straw: neutral single ding. */
  straw(c, dest) {
    const v = voice(c, dest);
    tone(v, { freq: 587.33, dur: 0.5, gain: 0.2, attack: 0.003 });
    tone(v, { freq: 587.33 * 2.76, dur: 0.18, gain: 0.04, attack: 0.002 });
    return stopper(v);
  },

  /** Amber: low buzzer, two detuned waves through a lowpass. */
  amber(c, dest) {
    return buzzer(c, dest, 110, 0.42, 1);
  },

  /** See a Doctor: the same buzzer, lower and doubled. */
  doctor(c, dest) {
    return buzzer(c, dest, 82.4, 0.3, 2);
  },

  /** Flush: a filtered noise swell that sweeps down, then a gurgle and a refill hiss. */
  flush(c, dest) {
    const v = voice(c, dest);
    const t = v.t;
    const rush = noise(v, { dur: 1.5, gain: 0.45, attack: 0.08, hold: 0.5, filter: 'bandpass', freq: 2600, q: 0.9 });
    rush.filter.frequency.linearRampToValueAtTime(3200, t + 0.2);
    rush.filter.frequency.exponentialRampToValueAtTime(350, t + 1.4);
    const swirl = noise(v, { dur: 1.3, gain: 0.25, attack: 0.15, hold: 0.4, filter: 'lowpass', freq: 500, q: 4 });
    lfo(v, swirl.filter.frequency, 6, 180, 0, 1.3);
    // Gurgle: a few quick falling blips near the end.
    for (let i = 0; i < 3; i++) {
      tone(v, { at: 0.9 + i * 0.12, freq: 420 - i * 60, to: 160, dur: 0.1, gain: 0.12, attack: 0.004 });
    }
    noise(v, { at: 1.0, dur: 0.5, gain: 0.05, attack: 0.1, filter: 'highpass', freq: 5000 });
    return stopper(v);
  },

  /** Hand dryer: broadband whoosh with a motor whine. */
  dryer(c, dest) {
    const v = voice(c, dest);
    noise(v, { dur: 1.2, gain: 0.35, attack: 0.12, hold: 0.85, filter: 'bandpass', freq: 1400, q: 0.5 });
    const whine = tone(v, { type: 'sawtooth', freq: 180, to: 210, dur: 1.2, gain: 0.03, attack: 0.15, hold: 0.8 });
    lfo(v, whine.frequency, 9, 4, 0, 1.2);
    return stopper(v);
  },
};

export const sfx = {
  /** Play a sound; returns a stop function that cuts it short. */
  play(name: SfxName): () => void {
    if (muted) return noop;
    try {
      const c = getContext();
      const make = SOUNDS[name];
      if (!c || !master || !make) return noop;
      wake(c);
      const stop = make(c, master);
      let done = false;
      return () => {
        if (done) return;
        done = true;
        try {
          stop();
        } catch {
          /* ignore */
        }
      };
    } catch {
      return noop;
    }
  },
  setMuted(m: boolean): void {
    muted = !!m;
    if (!ctx || !master) return;
    try {
      const g = master.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.015);
    } catch {
      try {
        master.gain.value = muted ? 0 : MASTER_VOLUME;
      } catch {
        /* ignore */
      }
    }
  },
  isMuted(): boolean {
    return muted;
  },
  /** Call from a user gesture to unlock the AudioContext on mobile. */
  unlock(): void {
    try {
      const c = getContext();
      if (!c) return;
      wake(c);
      // iOS: play one silent sample inside the gesture.
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  },
};
