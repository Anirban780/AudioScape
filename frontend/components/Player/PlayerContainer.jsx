import React, { useState, useRef, useCallback, useEffect } from "react";
import MusicPlayer from "./MusicPlayer";
import FullScreenPlayer from "./FullScreenPlayer";
import YouTubePlayer from "./YoutubePlayer";
import MiniPlayer from "./MiniPlayer";

const PlayerContainer = ({ initialTrack, onClose }) => {
  const [track, setTrack] = useState(initialTrack);
  const [player, setPlayer] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    setTrack(initialTrack);
  }, [initialTrack]);

  const onPlayerReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    setIsPlayerReady(true);

    if (track?.id) {
      ytPlayer.cueVideoById({ videoId: track.id });
    }

  }, [track?.id]);

  useEffect(() => {
    if (isPlayerReady && player && track?.id) {
      const iframe = player.getIframe?.();
      const iframeSrc = iframe?.src;
  
      // If iframe or its src is not ready, delay execution slightly
      if (!iframe || !iframeSrc) {
        console.warn("Player iframe not ready yet. Retrying in 100ms...");
        setTimeout(() => {
          if (player?.loadVideoById) {
            player.loadVideoById({ videoId: track.id });
          }
        }, 100);
        return;
      }
  
      try {
        if (typeof player.stopVideo === "function") {
          player.stopVideo();
        }
        if (typeof player.loadVideoById === "function") {
          player.loadVideoById({ videoId: track.id });
        }
      } catch (err) {
        console.error("Error operating on YouTube Player", err);
      }
    }
  }, [track?.id, player, isPlayerReady]);
  

  const toggleFullScreen = () => setIsFullScreen((prev) => !prev);

  const handleClose = () => {
    if (onClose) onClose(); // Call the onClose function passed as prop
    setTrack(null); // Optionally reset the track here as well
  };

  return (
    <>
      <YouTubePlayer
        trackId={track?.id}
        onReady={onPlayerReady}
      />
      
      {isFullScreen ? (
        <FullScreenPlayer
          track={track}
          player={player}
          isPlayerReady={isPlayerReady}
          onClose={toggleFullScreen}
        />
      ) : (
        <MiniPlayer
          track={track}
          player={player}
          isPlayerReady={isPlayerReady}
          toggleFullScreen={toggleFullScreen}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default PlayerContainer;
