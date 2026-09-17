import { useEffect } from 'react';
import usePlayerStore from '@/store/usePlayerStore';

/**
 * ============================================================================
 * USE KEYBOARD SHORTCUTS HOOK (useKeyboardShortcuts.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Global keyboard shortcuts listener for audio playback controls and viewport navigation.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Accessibility & UX: Enables standard media keys and hotkeys for power users:
 *    - `Space`: Toggle play/pause (smartly ignores text inputs/textareas).
 *    - `ArrowRight`: Seek forward 5 seconds.
 *    - `ArrowLeft`: Seek backward 5 seconds.
 *    - `Shift + ArrowRight`: Next track.
 *    - `Shift + ArrowLeft`: Previous track.
 *    - `KeyM`: Toggle mute.
 *    - `ArrowUp`: Volume +5%.
 *    - `ArrowDown`: Volume -5%.
 *    - `Escape`: Exit fullscreen mode if active.
 * 2. Form Input Safety: Automatically ignores keystrokes when user is typing in
 *    `<input>`, `<textarea>`, `<select>`, or `contenteditable` elements.
 * 
 * HOW IT WORKS:
 * - Attaches `keydown` event listener to `window`.
 * - Intercepts relevant key codes, invokes `e.preventDefault()`, and triggers Zustand store actions.
 * 
 * @param {boolean} [enabled=true] - Toggle boolean to selectively disable shortcuts
 */
export const useKeyboardShortcuts = (enabled = true) => {
  const {
    player,
    isPlayerReady,
    isPlaying,
    togglePlayPause,
    setIsPlaying,
    nextTrack,
    prevTrack,
    toggleMute,
    volume,
    setVolume,
    isFullScreen,
    setIsFullScreen,
    progress,
    duration,
  } = usePlayerStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore keystrokes when typing in input fields
      const target = e.target;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isInput) return;

      switch (e.code) {
        // Spacebar: Play/Pause Toggle
        case 'Space': {
          e.preventDefault();
          if (player && isPlayerReady) {
            isPlaying ? player.pauseVideo?.() : player.playVideo?.();
            setIsPlaying(!isPlaying);
          } else {
            togglePlayPause();
          }
          break;
        }

        // Right Arrow: Seek forward 5s (or Next Track if Shift is pressed)
        case 'ArrowRight': {
          e.preventDefault();
          if (e.shiftKey) {
            nextTrack();
          } else if (player && isPlayerReady && typeof duration === 'number') {
            const newTime = Math.min(duration, progress + 5);
            player.seekTo?.(newTime, true);
          }
          break;
        }

        // Left Arrow: Seek backward 5s (or Previous Track if Shift is pressed)
        case 'ArrowLeft': {
          e.preventDefault();
          if (e.shiftKey) {
            prevTrack();
          } else if (player && isPlayerReady) {
            const newTime = Math.max(0, progress - 5);
            player.seekTo?.(newTime, true);
          }
          break;
        }

        // Key M: Mute / Unmute Toggle
        case 'KeyM': {
          e.preventDefault();
          toggleMute();
          break;
        }

        // Up Arrow: Volume +5%
        case 'ArrowUp': {
          e.preventDefault();
          const newVol = Math.min(100, volume + 5);
          if (player && isPlayerReady) {
            player.setVolume?.(newVol);
          }
          setVolume(newVol);
          break;
        }

        // Down Arrow: Volume -5%
        case 'ArrowDown': {
          e.preventDefault();
          const newVol = Math.max(0, volume - 5);
          if (player && isPlayerReady) {
            player.setVolume?.(newVol);
          }
          setVolume(newVol);
          break;
        }

        // Escape: Exit Fullscreen Player
        case 'Escape': {
          if (isFullScreen) {
            e.preventDefault();
            setIsFullScreen(false);
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    player,
    isPlayerReady,
    isPlaying,
    togglePlayPause,
    setIsPlaying,
    nextTrack,
    prevTrack,
    toggleMute,
    volume,
    setVolume,
    isFullScreen,
    setIsFullScreen,
    progress,
    duration,
  ]);
};

export default useKeyboardShortcuts;
