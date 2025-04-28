import React, { useState, useCallback, useEffect } from "react";
import FullScreenPlayer from "./FullScreenPlayer";
import YouTubePlayer from "./YoutubePlayer";
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
  const [player, setPlayer] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const {
    track,
    setTrack,
    queue,
    setQueue,
    currentIndex,
    setCurrentIndex,
    isLooping,
    isFullScreen,
    toggleFullScreen,
    nextTrack
  } = usePlayerStore();

  // Generate queue when a new track is played
  useEffect(() => {
    if (track?.id && uid && queue.length === 0) {
      const keyword = getRandomGenre(track.genre);

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
  }, [player, track?.id, queue, currentIndex, setTrack, setCurrentIndex, isLooping]);

  // Handle player ready
  const onPlayerReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    setIsPlayerReady(true);

    if (track?.id) {
      ytPlayer.loadVideoById({ videoId: track.id });
      ytPlayer.playVideo();
    }
  }, [track?.id]);

  // Load new video when track changes
  useEffect(() => {
    if (isPlayerReady && player && track?.id) {
      try {
        player.loadVideoById({ videoId: track.id });
        player.playVideo();
      } catch (err) {
        console.error("Failed to load and play video", err);
      }
    }
  }, [track?.id, isPlayerReady, player]);

  const handleClose = () => {
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
