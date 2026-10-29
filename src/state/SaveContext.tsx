// SaveData context: one source of truth, persisted on every update.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SaveData } from '../types';
import { STORAGE_KEY, getDefaultStorage, loadSave, resetProgress, saveSave } from './storage';

export interface SaveContextValue {
  save: SaveData;
  /** Apply a pure transform and persist. Synchronous: consecutive calls compose. */
  update(fn: (save: SaveData) => SaveData): void;
  /** Wipe progress (settings survive). */
  reset(): void;
}

const SaveContext = createContext<SaveContextValue | null>(null);

export function SaveProvider({ children, storage }: { children: ReactNode; storage?: Storage | null }) {
  const store = useMemo(() => (storage === undefined ? getDefaultStorage() : storage), [storage]);
  const [save, setSave] = useState<SaveData>(() => loadSave(store));
  const saveRef = useRef(save);

  const update = useCallback(
    (fn: (s: SaveData) => SaveData) => {
      const prev = saveRef.current;
      const next = fn(prev);
      if (next === prev) return;
      saveRef.current = next;
      setSave(next);
      saveSave(next, store);
    },
    [store],
  );

  const reset = useCallback(() => update((s) => resetProgress(s)), [update]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = loadSave(store);
      saveRef.current = next;
      setSave(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);

  const value = useMemo<SaveContextValue>(() => ({ save, update, reset }), [save, update, reset]);
  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSave() must be used inside <SaveProvider>');
  return ctx;
}
