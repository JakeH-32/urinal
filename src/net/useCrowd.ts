// React hook over fetchDay. Inert (null, no requests) until the backend is configured.
import { useEffect, useRef, useState } from 'react';
import { communityEnabled, fetchDay, type DayCrowd } from './community';

/** Coming back to the tab refetches ("check back later"), at most this often. */
const REFOCUS_MIN_MS = 30_000;

/**
 * The crowd for Urinal #day. Fetches on mount, whenever `refreshKey` changes, and when the tab becomes
 * visible again. Keeps the last good result if a refetch fails. Never throws; late responses from a
 * superseded fetch (or after unmount) are dropped.
 */
export function useDayCrowd(day: number, refreshKey?: unknown): DayCrowd | null {
  const enabled = communityEnabled();
  const [state, setState] = useState<{ day: number; crowd: DayCrowd } | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const lastFetch = useRef(0);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current >= REFOCUS_MIN_MS) {
        setFocusTick((t) => t + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    lastFetch.current = Date.now();
    fetchDay(day).then(
      (crowd) => {
        if (live && crowd) setState({ day, crowd });
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [enabled, day, refreshKey, focusTick]);

  return enabled && state?.day === day ? state.crowd : null;
}
