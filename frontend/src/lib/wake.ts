import { useEffect, useState } from 'react';

export const WAKE_THRESHOLD_MS = 4000;
export const WAKE_ESTIMATE_MS = 60000;

let startedAt: number | null = null;
let pending = 0;
let timer: number | undefined;

const listeners = new Set<(value: number | null) => void>();

function emit() {
  for (const listener of listeners) listener(startedAt);
}

export function trackRequest<T>(run: () => Promise<T>): Promise<T> {
  pending += 1;
  if (pending === 1 && startedAt === null) {
    timer = window.setTimeout(() => {
      if (pending > 0) {
        startedAt = Date.now();
        emit();
      }
    }, WAKE_THRESHOLD_MS);
  }

  return run().finally(() => {
    pending -= 1;
    if (pending === 0) {
      window.clearTimeout(timer);
      if (startedAt !== null) {
        startedAt = null;
        emit();
      }
    }
  });
}

export function useWaking() {
  const [since, setSince] = useState<number | null>(startedAt);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    listeners.add(setSince);
    return () => {
      listeners.delete(setSince);
    };
  }, []);

  useEffect(() => {
    if (since === null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Date.now() - since);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [since]);

  if (since === null) return { waking: false, remaining: 0, progress: 0 };

  const total = WAKE_ESTIMATE_MS - WAKE_THRESHOLD_MS;
  return {
    waking: true,
    remaining: Math.max(0, Math.ceil((total - elapsed) / 1000)),
    progress: Math.min(1, elapsed / total),
  };
}
