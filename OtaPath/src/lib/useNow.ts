"use client";

/**
 * useNow — a live clock for "…s ago" labels and lit-state decay.
 * useSyncExternalStore keeps the snapshot stable between ticks;
 * the server snapshot is a fixed epoch so prerender + hydration
 * agree byte-for-byte (Next flags raw Date.now() as unstable).
 * subscribe is memoized — a new function each render would make
 * React resubscribe continuously.
 */

import { useCallback, useSyncExternalStore } from "react";

/** fixed epoch used for SSR/prerender determinism (~Oct 2025) */
export const FIXED_EPOCH = 1_760_000_000_000;

let cache = Date.now();

export function useNow(intervalMs = 2000): number {
  const subscribe = useCallback(
    (cb: () => void) => {
      const id = setInterval(() => {
        cache = Date.now();
        cb();
      }, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs]
  );
  return useSyncExternalStore(subscribe, () => cache, () => FIXED_EPOCH);
}
