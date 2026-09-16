import { toast } from "sonner";

/**
 * ============================================================================
 * CENTRALIZED NOTIFICATION SERVICE (notify.js) - Workstream B & Subtask J5
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Provides a standardized singleton interface for triggering toast notifications
 * across the entire AudioScape application. Supports standard notifications (success,
 * error, info, warning, loading), actionable notifications with "Undo" callbacks,
 * promise lifecycle tracking, and specialized domain notifications (playback errors,
 * rate limiting alerts, music playback feedback).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Universal Accessibility: Usable seamlessly both within React components and
 *    outside the React render tree (e.g. in Zustand stores like usePlayerStore,
 *    plain ES modules like googleAuth, and asynchronous event handlers).
 * 2. Visual-Only Policy: Configured strictly without intrusive audio chimes to protect
 *    and prioritize uninterrupted music playback.
 * 3. Graceful Durations Hierarchy:
 *    - Standard Success/Info: 4,000 ms
 *    - Actionable / Undo: 6,000 ms
 *    - Error / Watchdog failure alerts: 7,000 ms
 *    - Rate-limit alerts: Up to 10,000 ms (or remaining reset window)
 * 4. Undo Support: Powers optimistic UI rollbacks (e.g. restoring unliked songs,
 *    restoring deleted playlist tracks, restoring cleared queue).
 * ============================================================================
 */

export const notify = {
  /**
   * Displays a success toast notification.
   * @param {string} message - Headline notification message
   * @param {Object} [options] - Additional Sonner toast options (description, duration, id, etc.)
   * @returns {string|number} Toast ID
   */
  success: (message, options = {}) => {
    return toast.success(message, {
      duration: 4000,
      ...options,
    });
  },

  /**
   * Displays an error toast notification with extended visibility.
   * @param {string} message - Error headline message
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  error: (message, options = {}) => {
    return toast.error(message, {
      duration: 7000,
      ...options,
    });
  },

  /**
   * Displays an informative toast notification.
   * @param {string} message - Informative message
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  info: (message, options = {}) => {
    return toast.info(message, {
      duration: 4000,
      ...options,
    });
  },

  /**
   * Displays a warning toast notification.
   * @param {string} message - Warning message
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  warning: (message, options = {}) => {
    return toast.warning(message, {
      duration: 5000,
      ...options,
    });
  },

  /**
   * Displays a persistent loading toast indicator.
   * @param {string} message - Loading message
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  loading: (message, options = {}) => {
    return toast.loading(message, {
      ...options,
    });
  },

  /**
   * Tracks an asynchronous promise and displays loading, success, or error states.
   * @param {Promise} promise - Promise to monitor
   * @param {Object} messages - { loading, success, error } strings or render functions
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  promise: (promise, messages, options = {}) => {
    return toast.promise(promise, {
      ...messages,
      ...options,
    });
  },

  /**
   * Dismisses a specific active toast or all active toasts if no ID is passed.
   * @param {string|number} [toastId] - Optional toast ID to dismiss
   */
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  /**
   * Displays an interactive toast with a primary action button.
   * @param {string} message - Notification message
   * @param {Object} actionConfig - { label: string, onClick: Function }
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  action: (message, { label = "Action", onClick = () => {} } = {}, options = {}) => {
    return toast(message, {
      duration: 6000,
      action: {
        label,
        onClick,
      },
      ...options,
    });
  },

  /**
   * Displays an interactive "Undo" toast with a 6-second grace window for reversible operations.
   * Used for optimistic favorites removal, playlist track removal, and queue clearing.
   * 
   * @param {string} message - Reversible action message (e.g. "Removed from favourites")
   * @param {Function} onUndo - Callback executed when user clicks "Undo"
   * @param {Object} [options] - Additional options (e.g. description, icon)
   * @returns {string|number} Toast ID
   */
  undo: (message, onUndo, options = {}) => {
    return toast(message, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          if (typeof onUndo === "function") {
            onUndo();
          }
        },
      },
      ...options,
    });
  },

  /**
   * Specialized playback watchdog failure alert (Workstream J5).
   * Displays playback error message with an optional 1-click "Skip Track" action.
   * 
   * @param {string} reasonMessage - Watchdog or iFrame error explanation
   * @param {Function} [onSkip] - Optional callback to advance to the next track in queue
   * @param {Object} [options] - Additional options
   * @returns {string|number} Toast ID
   */
  playbackError: (reasonMessage, onSkip = null, options = {}) => {
    const toastConfig = {
      id: "playback-error-watchdog",
      duration: 7000,
      description: onSkip ? "Skipping to next available track..." : undefined,
      ...options,
    };

    if (typeof onSkip === "function") {
      toastConfig.action = {
        label: "Skip Track",
        onClick: onSkip,
      };
    }

    return toast.error(reasonMessage, toastConfig);
  },

  /**
   * Specialized rate-limit alert for search or quota throttling.
   * Prevents spamming toasts by anchoring to a singleton ID.
   * 
   * @param {number|string} retryAfter - Seconds or description until rate limit resets
   * @param {string} [customMsg] - Optional custom message
   * @returns {string|number} Toast ID
   */
  rateLimit: (retryAfter = 60, customMsg = null) => {
    const message = customMsg || `Search limit reached. Please retry in ${retryAfter}s.`;
    return toast.error(message, {
      id: "rate-limit-toast",
      duration: typeof retryAfter === "number" ? Math.min(retryAfter * 1000, 10000) : 7000,
    });
  },

  /**
   * Visual-only playback confirmation toast.
   * @param {string} title - Song or track title
   * @param {string} [artist] - Artist or channel name
   * @returns {string|number} Toast ID
   */
  trackPlaying: (title, artist = "") => {
    return toast.success(`Playing: ${title}`, {
      duration: 4000,
      description: artist ? `by ${artist}` : undefined,
    });
  },

  /**
   * Queue addition confirmation toast.
   * @param {string} title - Song or track title
   * @returns {string|number} Toast ID
   */
  queueAdded: (title) => {
    return toast.success(`Added to queue`, {
      description: title,
      duration: 3500,
    });
  },
};

// Also export the raw toast instance for low-level extensibility
export { toast };
export default notify;
