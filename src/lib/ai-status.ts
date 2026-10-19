import { useSyncExternalStore } from 'react';

type AiStatus = 'unknown' | 'connected' | 'offline';

let status: AiStatus = 'unknown';
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function markAiConnected(): void {
  if (status === 'connected') return;
  status = 'connected';
  notify();
}

export function markAiOffline(): void {
  if (status === 'offline') return;
  status = 'offline';
  notify();
}

export function useAiOffline(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status === 'offline',
    () => false,
  );
}
