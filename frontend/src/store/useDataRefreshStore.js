import { create } from 'zustand';
import { useEffect, useRef } from 'react';

/**
 * ============================================================================
 * DATA REFRESH & INVALIDATION STORE (useDataRefreshStore.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Provides a lightweight, global event bus / data invalidation system for AudioScape.
 * When mutating API calls occur (e.g. liking/unliking a song, recording a listen event),
 * this store increments domain-specific invalidation counters. Consumer components can
 * subscribe to these counters and automatically refetch their data after a debounced
 * delay (default 5000ms / 5s), preventing stale UI state without full page refreshes.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Debounced Batching: Liking multiple tracks in rapid succession triggers only a single
 *    backend refetch after the user stops clicking (saving API bandwidth and DB load).
 * 2. Backend Latency Buffer: The 5-second delay gives backend database writes and async
 *    indexing jobs time to commit before the client queries fresh data.
 * 3. Decoupled Architecture: Eliminates complex prop drilling or tight coupling between
 *    player controls, player store, and individual page view components.
 * 
 * USAGE:
 * // 1. Trigger invalidation from API / action functions:
 * useDataRefreshStore.getState().invalidate('favorites');
 * useDataRefreshStore.getState().invalidate('history');
 * 
 * // 2. Subscribe to invalidations inside a UI component:
 * useRefreshOn('favorites', fetchFavoriteSongs, 5000);
 */

export const useDataRefreshStore = create((set) => ({
  // Invalidation counters per domain
  counters: {
    favorites: 0,
    history: 0,
    recommendations: 0,
  },

  /**
   * Increments the invalidation counter for a given domain,
   * signaling any listening components that their data is stale.
   * 
   * @param {'favorites' | 'history' | 'recommendations'} domain 
   */
  invalidate: (domain) => set((state) => ({
    counters: {
      ...state.counters,
      [domain]: (state.counters[domain] || 0) + 1,
    },
  })),
}));

/**
 * Custom React Hook: useRefreshOn
 * 
 * Listens for invalidation signals on a specific domain counter and executes the callback
 * after a debounced delay. Skips execution on initial mount.
 * 
 * @param {'favorites' | 'history' | 'recommendations'} domain - The invalidation domain to watch
 * @param {Function} refetchCallback - Function to re-query component data
 * @param {number} [delay=5000] - Debounce delay in milliseconds (default: 5000ms)
 */
export const useRefreshOn = (domain, refetchCallback, delay = 5000) => {
  const counter = useDataRefreshStore((state) => state.counters[domain] || 0);
  const isFirstMount = useRef(true);
  const callbackRef = useRef(refetchCallback);

  // Keep callback ref updated to prevent stale closures
  useEffect(() => {
    callbackRef.current = refetchCallback;
  }, [refetchCallback]);

  useEffect(() => {
    // Skip initial mount so we don't trigger unnecessary duplicate fetches
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Set debounced timer to fire refetch
    const timer = setTimeout(() => {
      if (typeof callbackRef.current === 'function') {
        callbackRef.current();
      }
    }, delay);

    // Cleanup timer if counter changes before delay expires (debounce)
    return () => clearTimeout(timer);
  }, [counter, domain, delay]);
};

export default useDataRefreshStore;
