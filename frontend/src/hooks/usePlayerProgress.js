import { useEffect } from 'react';
import usePlayerStore from '@/store/usePlayerStore';

/**
 * ============================================================================
 * USE PLAYER PROGRESS HOOK (usePlayerProgress.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Reusable React hook for polling current playback position (seconds) and duration
 * from the underlying YouTube iFrame API player instance.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. DRY Principle: Replaces duplicated `setInterval` polling blocks in `MiniPlayer.jsx`
 *    and `FullScreenPlayer.jsx`.
 * 2. Automatic Cleanup: Clears polling interval cleanly whenever player instance, ready state,
 *    or view mode changes.
 * 3. Store Synchronization: Directly updates `progress` and `duration` in `usePlayerStore`.
 * 
 * HOW IT WORKS:
 * - Polls `player.getCurrentTime()` and `player.getDuration()` every 1000ms.
 * - Safely guards against `NaN` values and uninitialized player instances.
 * 
 * @param {Object|null} player - YouTube iFrame API player instance
 * @param {boolean} isPlayerReady - Boolean indicating player initialization status
 * @param {number} [intervalMs=1000] - Polling interval frequency in milliseconds
 */
export const usePlayerProgress = (player, isPlayerReady, intervalMs = 1000) => {
  const { setProgress, setDuration } = usePlayerStore();

  useEffect(() => {
    if (!player || !isPlayerReady) return;

    const pollProgress = () => {
      try {
        if (typeof player.getCurrentTime === 'function') {
          const current = player.getCurrentTime();
          if (typeof current === 'number' && !isNaN(current)) {
            setProgress(current);
          }
        }

        if (typeof player.getDuration === 'function') {
          const dur = player.getDuration();
          if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
            setDuration(dur);
          }
        }
      } catch (err) {
        console.warn('Error polling YouTube player progress:', err);
      }
    };

    // Immediate initial check
    pollProgress();

    const interval = setInterval(pollProgress, intervalMs);
    return () => clearInterval(interval);
  }, [player, isPlayerReady, setProgress, setDuration, intervalMs]);
};

export default usePlayerProgress;
