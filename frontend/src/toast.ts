/** Tiny transient-message store (Chalk-style bottom toast). */
import { useSyncExternalStore } from 'react';

export type Toast = { id: number; message: string; kind: 'info' | 'error' };

let current: Toast | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

export function notify(message: string, kind: Toast['kind'] = 'info', ms = 4000): void {
  current = { id: nextId++, message, kind };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, ms);
  emit();
}

function emit(): void {
  for (const fn of Array.from(listeners)) fn();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
    () => current,
  );
}
