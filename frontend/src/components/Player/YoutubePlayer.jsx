import React from "react";
import YouTube from "react-youtube";
import { saveSongListen } from "@/utils/api";
import usePlayerStore from "@/store/usePlayerStore";

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
 * 
 * HOW IT WORKS:
 * - `handleStateChange`: Sets `isPlaying` and `duration` in `usePlayerStore`.
 * - On `state === 0` (ENDED): Calls `onTrackEnd()` prop to advance queue cleanly.
 */
const YouTubePlayer = ({ trackId, onReady, onTrackEnd }) => {
  const { setIsPlaying, setDuration } = usePlayerStore();

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
      // PLAYING
      if (player && player.unMute) {
        player.unMute();
      }
      setIsPlaying(true);
      setDuration(player.getDuration());

      if (trackId) saveSongListen(trackId).catch(console.error);
    } 
    else if (state === 2) {
      // PAUSED
      setIsPlaying(false);
    }
    else if (state === 0) {
      // ENDED
      setIsPlaying(false);
      if (typeof onTrackEnd === 'function') {
        onTrackEnd();
      }
    }
    else if (state === 5) {
      // CUED
      setIsPlaying(false);
      setDuration(player.getDuration());
    }
  };

  return (
    <div className="hidden">
      <YouTube
        videoId={trackId}
        opts={opts}
        onReady={onReady}
        onStateChange={handleStateChange}
      />
    </div>
  );
};

export default YouTubePlayer;
