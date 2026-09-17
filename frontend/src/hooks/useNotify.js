import { useMemo } from "react";
import { notify, toast } from "@/utils/notify";

/**
 * ============================================================================
 * NOTIFICATION HOOK (useNotify.js) - Workstream B
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * React hook wrapper around the centralized `notify` service.
 * Allows components to consume standardized toast methods with stable reference
 * equality across renders.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Ergonomics: Provides idiomatic React hook access (`const notify = useNotify();`).
 * 2. Stable Callbacks: Wraps notify methods with useMemo so that passing notify
 *    to child components or effect dependencies does not cause unwanted re-renders.
 * 3. Feature Parity: Exposes all core and specialized notification actions:
 *    success, error, info, warning, loading, promise, action, undo, dismiss,
 *    playbackError, rateLimit, trackPlaying, and queueAdded.
 * ============================================================================
 */
export function useNotify() {
  return useMemo(() => ({
    success: notify.success,
    error: notify.error,
    info: notify.info,
    warning: notify.warning,
    loading: notify.loading,
    promise: notify.promise,
    action: notify.action,
    undo: notify.undo,
    dismiss: notify.dismiss,
    playbackError: notify.playbackError,
    rateLimit: notify.rateLimit,
    trackPlaying: notify.trackPlaying,
    queueAdded: notify.queueAdded,
    toast,
  }), []);
}

export default useNotify;
