import { create } from 'zustand';
import { fetchQuotaSummary, fetchQuotaHistory } from '@/utils/api';
import { notify } from '@/utils/notify';

/**
 * ============================================================================
 * GLOBAL QUOTA TELEMETRY STORE (useQuotaStore.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Centralized singleton store managing live YouTube Data API quota metrics,
 * daily search limits (5 per user per day), and multi-component synchronization.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Synchronized UI: Ensures the navbar QuotaStatusPill ("5 left"), SearchBar budget
 *    enforcement, and QuotaDashboardModal always reflect the exact same live state.
 * 2. Deduplicated Notifications: Separates silent background synchronization from explicit
 *    manual user refresh actions, preventing unwanted toasts during active typing or search.
 * 3. Atomic Updates: Updates `userSearchesLeft` dynamically across the app immediately
 *    upon search execution or telemetry response.
 * ============================================================================
 */

export const useQuotaStore = create((set, get) => ({
  data: null,
  history: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastRefreshed: null,

  // Direct access selectors
  userSearchesLeft: 5,
  userSearchesMade: 0,
  globalSearchesLeft: 150,
  globalSearchesMade: 0,
  isThresholdActive: false,
  isGlobalCapReached: false,
  canSearch: true,

  /**
   * Directly sets user searches left (e.g. from response headers).
   */
  setUserSearchesLeft: (count) => {
    set((state) => {
      const left = Math.max(0, count);
      return {
        userSearchesLeft: left,
        canSearch: left > 0 && !state.isGlobalCapReached,
        data: state.data ? { ...state.data, userSearchesLeft: left } : state.data,
      };
    });
  },

  /**
   * Resets the store state to initial defaults (useful for testing and session clears).
   */
  reset: () => {
    set({
      data: null,
      history: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastRefreshed: null,
      userSearchesLeft: 5,
      userSearchesMade: 0,
      globalSearchesLeft: 150,
      globalSearchesMade: 0,
      isThresholdActive: false,
      isGlobalCapReached: false,
      canSearch: true,
    });
  },

  /**
   * Fetches latest quota telemetry from backend.
   * @param {Object} options
   * @param {boolean} [options.isManual=false] - True when clicked by user on dashboard refresh button
   * @param {boolean} [options.silent=false] - True when called in background
   * @param {boolean} [options.notifySearchSuccess=false] - True when called after an intentional search succeeds
   */
  fetchQuota: async ({ isManual = false, silent = false, notifySearchSuccess = false } = {}) => {
    if (get().isRefreshing) return;

    if (isManual) {
      set({ isRefreshing: true, error: null });
    } else if (!get().data && !silent) {
      set({ isLoading: true, error: null });
    }

    try {
      const [summaryRes, historyRes] = await Promise.allSettled([
        fetchQuotaSummary(),
        fetchQuotaHistory(7),
      ]);

      if (summaryRes.status === "fulfilled") {
        const summary = summaryRes.value;
        const userLeft = summary?.userSearchesLeft ?? (summary?.searchStatus?.userSearchesLeft ?? 5);
        const userMade = summary?.userSearchesMade ?? (summary?.searchStatus?.userSearchesMade ?? 0);
        const globalLeft = summary?.globalSearchesLeft ?? (summary?.searchStatus?.globalSearchesLeft ?? 150);
        const globalMade = summary?.globalSearchesMade ?? (summary?.searchStatus?.globalSearchesMade ?? 0);
        const isThreshold = Boolean(summary?.isThresholdActive ?? summary?.searchStatus?.isThresholdActive);
        const isCap = Boolean(summary?.searchStatus?.isGlobalCapReached ?? (globalLeft === 0));

        set({
          data: summary,
          userSearchesLeft: userLeft,
          userSearchesMade: userMade,
          globalSearchesLeft: globalLeft,
          globalSearchesMade: globalMade,
          isThresholdActive: isThreshold,
          isGlobalCapReached: isCap,
          canSearch: userLeft > 0 && !isCap,
          lastRefreshed: new Date(),
          error: null,
        });

        // 1. If manual refresh from QuotaDashboardModal, show refresh success toast
        if (isManual) {
          notify.success("YouTube quota telemetry refreshed");
        }
        // 2. If intentional search succeeded, show exactly ONE telemetry notification
        else if (notifySearchSuccess) {
          notify.success(`YouTube quota telemetry updated: ${userLeft} live searches left today`, {
            id: "search-telemetry-toast",
          });
        }
      } else {
        throw summaryRes.reason;
      }

      if (historyRes.status === "fulfilled") {
        set({ history: historyRes.value.days || [] });
      }
    } catch (err) {
      const errMsg = err?.message || "Failed to load quota telemetry";
      set({ error: errMsg });
      if (isManual) {
        notify.error(`Quota refresh failed: ${errMsg}`);
      }
    } finally {
      set({ isLoading: false, isRefreshing: false });
    }
  },
}));

export default useQuotaStore;
