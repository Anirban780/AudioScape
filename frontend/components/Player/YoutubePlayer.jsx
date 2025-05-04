import React from "react";
import YouTube from "react-youtube";
import { saveSongListen } from "../../utils/api";
import usePlayerStore from "../../store/usePlayerStore";

const YouTubePlayer = ({ trackId, onReady }) => {
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

  // Handle YouTube player state changes
  const handleStateChange = (event) => {
    const player = event.target;

    // Ensure the player exists and is initialized
    if (!player) {
      console.warn("Player is not ready yet.");
      return;
    }

    const state = event.data;
    console.debug("Player state changed:", state);

    if (state === 1) { // Playing
      if (player && player.unMute) {
        player.unMute();
        player.setVolume(100);
      }
      setIsPlaying(true);
      setDuration(player.getDuration());

      if (trackId) saveSongListen(trackId).catch(console.error);

    } 
    else if (state === 2 || state === 0) { // Paused or Ended
      setIsPlaying(false);
    } 
    else if (state === 5) { // Cueing state
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