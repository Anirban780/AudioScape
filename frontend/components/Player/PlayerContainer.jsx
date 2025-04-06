import React, { useState, useRef, useCallback, useEffect } from "react";
import MusicPlayer from "./MusicPlayer";
import FullScreenPlayer from "./FullScreenPlayer";
import YouTubePlayer from "./YouTubePlayer";

const PlayerContainer = ({ initialTrack }) => {
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
      player.stopVideo();
      player.loadVideoById({ videoId: track.id });
    }
  }, [track?.id, player, isPlayerReady]);

  const toggleFullScreen = () => setIsFullScreen((prev) => !prev);

  return (
    <>
      <YouTubePlayer
        trackId={track?.id}
        onReady={onPlayerReady}
        setIsPlaying={() => { }} // no longer needed
        setDuration={() => { }}  // no longer needed
      />
      {isFullScreen ? (
        <FullScreenPlayer
          track={track}
          player={player}
          isPlayerReady={isPlayerReady}
          onClose={toggleFullScreen}
        />
      ) : (
        <MusicPlayer
          track={track}
          player={player}
          isPlayerReady={isPlayerReady}
          toggleFullScreen={toggleFullScreen}
        />
      )}
    </>
  );
};

export default PlayerContainer;
