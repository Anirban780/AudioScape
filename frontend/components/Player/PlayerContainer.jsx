import React, { useCallback, useEffect } from "react";
import FullScreenPlayer from "./FullScreenPlayer";
import YouTubePlayer from "./YouTubePlayer";
import MiniPlayer from "./MiniPlayer";
import usePlayerStore from "../../store/usePlayerStore";
import { generateQueue } from "../../utils/api";

const curatedGenres = [
  "lofi music", "pop hits", "indie rock", "anime music", "k-pop", "electronic", "jazz chill", "hip hop",
];

const getRandomGenre = (genres) => {
  return genres?.length > 0
    ? genres[Math.floor(Math.random() * genres.length)]
    : curatedGenres[Math.floor(Math.random() * curatedGenres.length)];
};

const PlayerContainer = ({ onClose, uid }) => {
  const {
    player,
    setPlayer,
    isPlayerReady,
    setIsPlayerReady,
    track,
    setTrack,
    queue,
    setQueue,
    setCurrentIndex,
    isLooping,
    isFullScreen,
    toggleFullScreen,
    nextTrack,
  } = usePlayerStore();

  // Generate queue when a new track is played
  useEffect(() => {
    if (track?.id && uid && queue.length === 0) {
      const keyword = getRandomGenre(track.genre);
      console.debug("Generating queue for track:", track.id, "with keyword:", keyword);

      const fetchQueue = async () => {
        try {
          const generatedQueue = await generateQueue(keyword, uid, track);
          if (Array.isArray(generatedQueue) && generatedQueue.length > 0) {
            setQueue(generatedQueue);
            setCurrentIndex(0);
          }
        } catch (err) {
          console.error("Queue generation failed", err);
        }
      };

      fetchQueue();
    }
  }, [track?.id, uid, queue.length, setQueue, setCurrentIndex]);

  // Auto-advance to next track when current track ends
  useEffect(() => {
    if (!player || !track?.id) return;

    const checkState = () => {
      const state = player.getPlayerState();
      if (state === 0) { // Ended
        if (isLooping) {
          player.seekTo(0);
          player.playVideo();
        } else {
          nextTrack();
        }
      }
    };

    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, [player, track?.id, isLooping, nextTrack]);

  const onPlayerReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    setIsPlayerReady(true);

    const currentTrack = usePlayerStore.getState().track;
    if (currentTrack?.id && ytPlayer.getVideoData().video_id !== currentTrack.id) {
      ytPlayer.loadVideoById({ videoId: currentTrack.id });
      ytPlayer.playVideo();
    }
  }, [setPlayer, setIsPlayerReady]);

  const handleClose = () => {
    console.debug("Closing player");
    if (onClose) onClose();
    setTrack(null);
    setQueue([]);
    setIsPlayerReady(false);
  };

  return (
    <>
      <YouTubePlayer trackId={track?.id} onReady={onPlayerReady} />
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
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default PlayerContainer;