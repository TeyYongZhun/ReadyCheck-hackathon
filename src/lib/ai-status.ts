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

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAiOffline(): boolean {
  return useSyncExternalStore(subscribe, () => status === 'offline', () => false);
}

/** The last AI call's outcome, for the presenter's status pill. */
export function useAiStatus(): AiStatus {
  return useSyncExternalStore(subscribe, () => status, () => 'unknown' as const);
}
