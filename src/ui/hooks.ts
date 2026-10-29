import { useEffect, useRef, useState } from 'react';
import { useSave } from '../state/SaveContext';

function mediaReduced(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** OS preference OR the in-game setting. */
export function useReducedMotion(): boolean {
  const { save } = useSave();
  const [os, setOs] = useState(mediaReduced);
  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    if (!mq) return;
    const on = () => setOs(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return save.settings.reducedMotion || os;
}

/** Animate 0 -> target with an ease-out. Returns target immediately when disabled. */
export function useCountUp(target: number, enabled: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || !Number.isFinite(target) || target === 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);
  if (!enabled || !Number.isFinite(target) || target === 0) return target;
  return value;
}

/** Re-render every `ms` milliseconds; returns Date.now(). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(h);
  }, [ms]);
  return now;
}

/** Cycle through a list every `ms` ms, starting at a random item. */
export function useRotating<T>(items: readonly T[], ms: number, enabled = true): T | undefined {
  const [i, setI] = useState(() => (items.length ? Math.floor(Math.random() * items.length) : 0));
  const len = useRef(items.length);
  len.current = items.length;
  useEffect(() => {
    if (!enabled) return;
    const h = window.setInterval(() => setI((x) => (len.current ? (x + 1) % len.current : 0)), ms);
    return () => window.clearInterval(h);
  }, [ms, enabled]);
  return items.length ? items[i % items.length] : undefined;
}

export function pickRandom<T>(items: readonly T[], fallback: T): T {
  return items.length ? items[Math.floor(Math.random() * items.length)] : fallback;
}
