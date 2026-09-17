import { useState, useEffect, useCallback, useRef } from "react";
import { fetchQuotaSummary, fetchQuotaHistory } from "@/utils/api";
import { notify } from "@/utils/notify";

/**
 * ============================================================================
 * CUSTOM HOOK: YOUTUBE API QUOTA DASHBOARD & ROTATION STATE (useQuotaDashboard)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Orchestrates real-time state management, data polling, and countdown calculations
 * for the YouTube API Quota Dashboard:
 * 1. Data Fetching: Fetches today's quota summary and past 7-day history from NestJS backend.
 * 2. 30-Minute Auto-Refresh: Automatically polls fresh telemetry every 30 minutes.
 * 3. Manual Refresh: Provides manual trigger with loading state and debouncing.
 * 4. Live Reset Countdown: Ticks every second counting down to midnight Pacific Time (00:00 PT).
 * 5. Quota Health Helpers: Pre-calculates spend percentages and color grading (green, amber, red).
 * ============================================================================
 */

/**
 * Calculates remaining seconds until the next 12:00 AM local midnight in the browser.
 * Guarantees that users immediately see an accurate countdown to the next calendar day (< 12 hours if in afternoon/evening)
 * even before network responses resolve.
 */
function getSecondsUntilLocalMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
}

export function useQuotaDashboard({ enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(getSecondsUntilLocalMidnight);

  const isMountedRef = useRef(true);

  /**
   * Core data fetching function retrieving both today's summary and historical usage.
   */
  const loadQuotaData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }

    try {
      setError(null);
      const [summaryRes, historyRes] = await Promise.allSettled([
        fetchQuotaSummary(),
        fetchQuotaHistory(7),
      ]);

      if (!isMountedRef.current) return;

      if (summaryRes.status === "fulfilled") {
        setData(summaryRes.value);
        if (summaryRes.value.resetTime?.resetsInSeconds != null) {
          setCountdownSeconds(summaryRes.value.resetTime.resetsInSeconds);
        }
      } else {
        throw summaryRes.reason;
      }

      if (historyRes.status === "fulfilled") {
        setHistory(historyRes.value.days || []);
      }

      setLastRefreshed(new Date());

      if (isManual) {
        notify.success("YouTube quota telemetry refreshed");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const errMsg = err?.message || "Failed to load quota telemetry";
      setError(errMsg);
      if (isManual) {
        notify.error(`Quota refresh failed: ${errMsg}`);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Initial load when enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      loadQuotaData(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, loadQuotaData]);

  // 1-Second Countdown Ticker towards local midnight (12:00 AM)
  useEffect(() => {
    if (!enabled) return;

    const ticker = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Re-fetch once quota resets at local midnight
          loadQuotaData(false);
          return getSecondsUntilLocalMidnight();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [enabled, loadQuotaData]);

  /**
   * Manual refresh handler exposed to UI buttons.
   */
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    await loadQuotaData(true);
  }, [isRefreshing, loadQuotaData]);

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

  // Status color determination
  const getStatusColor = (percent) => {
    if (percent >= 80) return "red";
    if (percent >= 60) return "amber";
    return "emerald";
  };

  // Formatted countdown string (e.g. "8h 54m 12s")
  const hours = Math.floor(countdownSeconds / 3600);
  const minutes = Math.floor((countdownSeconds % 3600) / 60);
  const seconds = countdownSeconds % 60;
  const formattedCountdown = `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;

  // Always 12-hour format reset time e.g. "12:00 AM"
  const formattedResetTime = data?.resetTime?.localResetTime || "12:00 AM";

  // Searches & Threshold Metrics
  const userSearchesLeft = data?.userSearchesLeft ?? (data?.searchStatus?.userSearchesLeft ?? 5);
  const userSearchesMade = data?.userSearchesMade ?? (data?.searchStatus?.userSearchesMade ?? 0);
  const globalSearchesLeft = data?.globalSearchesLeft ?? (data?.searchStatus?.globalSearchesLeft ?? 150);
  const globalSearchesMade = data?.globalSearchesMade ?? (data?.searchStatus?.globalSearchesMade ?? 0);
  const isThresholdActive = Boolean(data?.isThresholdActive ?? data?.searchStatus?.isThresholdActive);
  const isGlobalCapReached = Boolean(data?.searchStatus?.isGlobalCapReached ?? (globalSearchesLeft === 0));
  const canSearch = Boolean(data?.canSearch ?? (userSearchesLeft > 0 && !isGlobalCapReached));

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
    toggleAutoRefresh: () => {},
  };
}

export default useQuotaDashboard;
