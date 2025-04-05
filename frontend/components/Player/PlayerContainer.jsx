import React, { useState, useRef, useCallback } from "react";
import YouTube from "react-youtube";
import MusicPlayer from "./MusicPlayer";
import FullScreenPlayer from "./FullScreenPlayer";

const PlayerContainer = ({ initialTrack }) => {
  const [track, setTrack] = useState(initialTrack);
  const [player, setPlayer] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const playerRef = useRef(null);

  const onPlayerReady = useCallback((event) => {
    const ytPlayer = event.target;
    playerRef.current = ytPlayer;
    setPlayer(ytPlayer);
    setIsPlayerReady(true);
    ytPlayer.pauseVideo();
  }, []);

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0,
    },
  };

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <>
      <YouTube
        videoId={track?.id}
        opts={opts}
        onReady={onPlayerReady}
        className="hidden"
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
