import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastTone = 'default' | 'success' | 'danger';

export interface ToastOptions {
  tone?: ToastTone;
  durationMs?: number;
}

type ToastFn = (message: ReactNode, opts?: ToastOptions) => void;

interface ToastItem {
  id: number;
  message: ReactNode;
  tone: ToastTone;
  durationMs: number;
}

const ToastContext = createContext<ToastFn>(() => {});

/** Show a toast: `toast('Copied!')`. Safe to call outside a provider (noop). */
export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((message, opts = {}) => {
    const item: ToastItem = {
      id: nextId.current++,
      message,
      tone: opts.tone ?? 'default',
      durationMs: opts.durationMs ?? 3000,
    };
    setItems((list) => [...list, item].slice(-MAX_TOASTS));
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const h = window.setTimeout(() => onDismiss(item.id), item.durationMs);
    return () => window.clearTimeout(h);
  }, [item.id, item.durationMs, onDismiss]);
  return (
    <button type="button" className={`toast toast--${item.tone}`} onClick={() => onDismiss(item.id)}>
      {item.message}
    </button>
  );
}
