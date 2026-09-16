import React, { useRef, useEffect, useCallback } from "react";
import YouTube from "react-youtube";
import { saveSongListen } from "@/utils/api";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * YOUTUBE IFRAME AUDIO PLAYER ENGINE (YoutubePlayer.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Hidden YouTube IFrame API audio player handling streaming without video UI.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Audio Engine: Keeps YouTube iFrame persistent across MiniPlayer and
 *    FullScreenPlayer view switches.
 * 2. Event Delegation: Listens for playback state events (PLAYING, PAUSED, ENDED)
 *    and delegates completion to `onTrackEnd` callback to eliminate state race conditions.
 * 3. Accurate Source Attribution & Dedup: Captures track playback source and prevents
 *    duplicate play counts when users pause and resume the same song.
 * 4. Subtask J5 Loading Watchdog & Error Fallback: Detects unplayable/restricted tracks
 *    (YouTube error codes 2, 5, 100, 101, 150) and prolonged loading/buffering timeouts (9s),
 *    alerting the user and automatically advancing to the next track in the queue.
 * 
 * HOW IT WORKS:
 * - `handleStateChange`: Sets `isPlaying` and `duration` in `usePlayerStore`.
 * - On `state === 1` (PLAYING): Clears watchdog, logs listen event once per track using `recordedTrackRef`.
 * - On `state === 0` (ENDED): Calls `onTrackEnd()` prop to advance queue cleanly.
 * - On `onError` or 9s watchdog timeout: Triggers informative toast and auto-skips to next track.
 */
const YouTubePlayer = ({ trackId, onReady, onTrackEnd }) => {
  const { setIsPlaying, setDuration, track, playbackSource, nextTrack } = usePlayerStore();
  const recordedTrackRef = useRef(null);
  const watchdogTimerRef = useRef(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const triggerSkipFallback = useCallback((reasonMessage) => {
    clearWatchdog();
    toast.error(reasonMessage, { id: "playback-error-watchdog" });
    if (typeof onTrackEnd === "function") {
      onTrackEnd();
    } else {
      nextTrack();
    }
  }, [clearWatchdog, onTrackEnd, nextTrack]);

  const startWatchdog = useCallback(() => {
    clearWatchdog();
    // 9-second timeout for stream resolution
    watchdogTimerRef.current = setTimeout(() => {
      console.warn(`[YoutubePlayer] Watchdog timed out waiting for track ${trackId} to play.`);
      triggerSkipFallback("Playback error: This track took too long to load. Skipping to next track...");
    }, 9000);
  }, [clearWatchdog, trackId, triggerSkipFallback]);

  useEffect(() => {
    // Reset recorded track and arm watchdog whenever video ID changes
    recordedTrackRef.current = null;
    if (trackId) {
      startWatchdog();
    }

    return () => {
      clearWatchdog();
    };
  }, [trackId, startWatchdog, clearWatchdog]);

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      enablejsapi: 1,
      playsinline: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      origin: window.location.origin,
    },
  };

  const handleStateChange = (event) => {
    const player = event.target;

    if (!player) {
      console.warn("Player is not ready yet.");
      return;
    }

    const state = event.data;

    if (state === 1) {
      // PLAYING — Disarm watchdog timer
      clearWatchdog();

      if (player && player.unMute) {
        player.unMute();
      }
      setIsPlaying(true);
      setDuration(player.getDuration());

      // Deduplicate: record once per track, avoiding artificial playCount spikes on pause/resume
      if (trackId && recordedTrackRef.current !== trackId) {
        recordedTrackRef.current = trackId;
        const source = track?.source || playbackSource || "SEARCH";
        saveSongListen(trackId, source, track).catch(console.error);
      }
    } 
    else if (state === 2) {
      // PAUSED — Disarm watchdog timer
      clearWatchdog();
      setIsPlaying(false);
    }
    else if (state === 3) {
      // BUFFERING — Ensure watchdog is active
      if (!watchdogTimerRef.current) {
        startWatchdog();
      }
    }
    else if (state === 0) {
      // ENDED
      clearWatchdog();
      setIsPlaying(false);
      if (typeof onTrackEnd === "function") {
        onTrackEnd();
      }
    }
    else if (state === 5) {
      // CUED
      clearWatchdog();
      setIsPlaying(false);
      setDuration(player.getDuration());
    }
  };

  const handlePlayerError = (event) => {
    clearWatchdog();
    const errorCode = event?.data;
    console.warn(`[YoutubePlayer] YouTube API error emitted for track ${trackId}:`, errorCode);

    const isRestricted = errorCode === 101 || errorCode === 150;
    const errorMsg = isRestricted
      ? "Playback error: This track is embed-restricted by the publisher. Skipping to next track..."
      : `Playback error: Track unavailable (error ${errorCode || 'unknown'}). Skipping to next track...`;

    triggerSkipFallback(errorMsg);
  };

  return (
    <div className="hidden">
      <YouTube
        videoId={trackId}
        opts={opts}
        onReady={onReady}
        onStateChange={handleStateChange}
        onError={handlePlayerError}
      />
    </div>
  );
};

export default YouTubePlayer;
