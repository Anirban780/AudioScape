import { useState, useEffect, useCallback } from "react";
import useQuotaStore from "@/store/useQuotaStore";

/**
 * ============================================================================
 * CUSTOM HOOK: YOUTUBE API QUOTA DASHBOARD & ROTATION STATE (useQuotaDashboard)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Connects UI components (QuotaStatusPill, QuotaDashboardModal, SearchBar)
 * to the centralized `useQuotaStore`:
 * 1. Synchronized State: All components share the exact same live telemetry.
 * 2. Dynamic Update: Updates "5 left" badge dynamically when searches occur.
 * 3. Selective Notifications: Only manual refresh in the modal triggers toasts;
 *    background and typing syncs remain completely silent.
 * 4. Countdown Ticker: Ticks every second towards local midnight reset (12:00 AM).
 * ============================================================================
 */

function getSecondsUntilLocalMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
}

export function useQuotaDashboard({ enabled = true } = {}) {
  const {
    data,
    history,
    isLoading,
    isRefreshing,
    error,
    lastRefreshed,
    userSearchesLeft,
    userSearchesMade,
    globalSearchesLeft,
    globalSearchesMade,
    isThresholdActive,
    isGlobalCapReached,
    canSearch,
    fetchQuota,
    setUserSearchesLeft,
  } = useQuotaStore();

  const [countdownSeconds, setCountdownSeconds] = useState(() => {
    return data?.resetTime?.resetsInSeconds != null
      ? data.resetTime.resetsInSeconds
      : getSecondsUntilLocalMidnight();
  });

  // Sync countdown whenever backend resetTime arrives
  useEffect(() => {
    if (data?.resetTime?.resetsInSeconds != null) {
      setCountdownSeconds(data.resetTime.resetsInSeconds);
    }
  }, [data?.resetTime?.resetsInSeconds]);

  // Initial load when enabled
  useEffect(() => {
    if (enabled) {
      fetchQuota({ silent: true });
    }
  }, [enabled, fetchQuota]);

  // 1-Second Countdown Ticker towards local midnight (12:00 AM)
  useEffect(() => {
    if (!enabled) return;

    const ticker = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Re-fetch once quota resets at local midnight
          fetchQuota({ silent: true });
          return getSecondsUntilLocalMidnight();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [enabled, fetchQuota]);

  /**
   * Manual refresh handler exposed to UI buttons (QuotaDashboardModal).
   * Passes isManual: true so that ONLY manual clicks show the refreshed notification!
   */
  const handleManualRefresh = useCallback(async () => {
    await fetchQuota({ isManual: true });
  }, [fetchQuota]);

  /**
   * Silent/Search refresh handler.
   */
  const handleSilentRefresh = useCallback(async (notifySearchSuccess = false) => {
    await fetchQuota({ silent: true, notifySearchSuccess });
  }, [fetchQuota]);

  // Calculated Metrics
  const totalLimit = data?.totalLimit || 20000;
  const totalConsumed = data?.totalUnitsConsumed || 0;
  const totalPercent = Math.min(100, Math.round((totalConsumed / totalLimit) * 100 * 10) / 10);

  const keyALimit = data?.keyA?.limit || 10000;
  const keyAConsumed = data?.keyA?.unitsConsumed || 0;
  const keyAPercent = Math.min(100, Math.round((keyAConsumed / keyALimit) * 100 * 10) / 10);

  const keyBLimit = data?.keyB?.limit || 10000;
  const keyBConsumed = data?.keyB?.unitsConsumed || 0;
  const keyBPercent = Math.min(100, Math.round((keyBConsumed / keyBLimit) * 100 * 10) / 10);

  const getStatusColor = (percent) => {
    if (percent >= 80) return "red";
    if (percent >= 60) return "amber";
    return "emerald";
  };

  const hours = Math.floor(countdownSeconds / 3600);
  const minutes = Math.floor((countdownSeconds % 3600) / 60);
  const seconds = countdownSeconds % 60;
  const formattedCountdown = `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  const formattedResetTime = data?.resetTime?.localResetTime || "12:00 AM";

  return {
    data,
    history,
    isLoading,
    isRefreshing,
    error,
    lastRefreshed,
    autoRefreshEnabled: false,
    countdownSeconds,
    formattedCountdown,
    formattedResetTime,
    totalPercent,
    keyAPercent,
    keyBPercent,
    statusColor: getStatusColor(totalPercent),
    userSearchesLeft,
    userSearchesMade,
    globalSearchesLeft,
    globalSearchesMade,
    isThresholdActive,
    isGlobalCapReached,
    canSearch,
    refresh: handleManualRefresh,
    silentRefresh: handleSilentRefresh,
    setUserSearchesLeft,
    toggleAutoRefresh: () => {},
  };
}

export default useQuotaDashboard;
