import React, { useCallback, useEffect } from "react";
import FullScreenPlayer from "./FullScreenPlayer";
import YoutubePlayer from "./YoutubePlayer";
import MiniPlayer from "./MiniPlayer";
import usePlayerStore from "@/store/usePlayerStore";
import { generateQueue } from "@/utils/generateQueue";

const isValidKeyword = (keyword) => {
  if (!keyword) return false;
  const invalidKeywords = ["music", "new", "lyrics", "song", "video", "live", "official"];
  const cleaned = keyword.toLowerCase().trim();
  return !invalidKeywords.includes(cleaned);
};

const getRandomGenre = (genres) => {
  if (Array.isArray(genres) && genres.length > 0) {
    const cleanedGenres = genres
      .map((g) => g.toLowerCase().trim())
      .filter(isValidKeyword);

    if (cleanedGenres.length > 0) {
      return cleanedGenres[Math.floor(Math.random() * cleanedGenres.length)];
    }
  }

  return null;
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

  useEffect(() => {
    if (!player || !track?.id) return;

    const checkState = () => {
      if (!player) return;

      const state = player.getPlayerState();
      if (state === 0) {
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

    if (!ytPlayer) return;

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

    if (player) {
      try {
        if (typeof player.stopVideo === 'function') {
          player.stopVideo();
        }

        setTimeout(() => {
          try {
            if (player && typeof player.destroy === 'function') {
              player.destroy();
            }
          } catch (err) {
            console.warn("Error destroying player:", err);
          } finally {
            setPlayer(null);
            setIsPlayerReady(false);
          }
        }, 100);
      } catch (err) {
        console.error("Error during player cleanup:", err);
      }
    }

    setTrack(null);
    setQueue([]);

    if (onClose) onClose();
  };

  return (
    <>
      <YoutubePlayer trackId={track?.id} onReady={onPlayerReady} />
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
