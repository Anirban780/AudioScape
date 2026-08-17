import React, { useCallback, useEffect, useRef } from "react";
import FullScreenPlayer from "./FullScreenPlayer";
import YoutubePlayer from "./YoutubePlayer";
import MiniPlayer from "./MiniPlayer";
import usePlayerStore from "@/store/usePlayerStore";
import { generateQueueFromBackend, extendQueueFromBackend } from "@/utils/api";

const isValidKeyword = (keyword) => {
  if (!keyword) return false;
  const invalidKeywords = ["music", "new", "lyrics", "song", "video", "live", "official"];
  const cleaned = keyword.toLowerCase().trim();
  return !invalidKeywords.includes(cleaned);
};

const getRandomGenre = (genres) => {
  if (Array.isArray(genres) && genres.length > 0) {
    const cleanedGenres = genres
      .map((g) => (typeof g === "string" ? g.toLowerCase().trim() : ""))
      .filter(isValidKeyword);

    if (cleanedGenres.length > 0) {
      return cleanedGenres[Math.floor(Math.random() * cleanedGenres.length)];
    }
  }
  return null;
};

/**
 * ============================================================================
 * PLAYER CONTAINER ORCHESTRATOR (PlayerContainer.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Parent orchestrator managing audio playback lifecycle, hidden YouTube iFrame embed,
 * server-side queue generation, continuous radio auto-refill, and view switching
 * between MiniPlayer and FullScreenPlayer.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Audio Lifecycle: Keeps YouTube iFrame mounted continuously while toggling
 *    between MiniPlayer and FullScreenPlayer without interrupting playback.
 * 2. Event-Driven Track End: Replaced legacy polling interval with single `onTrackEnd`
 *    callback from `YoutubePlayer.jsx`, eliminating state race conditions.
 * 3. Server-Authoritative Queue: Uses NestJS `generateQueueFromBackend` and `extendQueueFromBackend`
 *    for zero-quota TF-IDF recommendations and continuous auto-refill.
 * 
 * HOW IT WORKS:
 * - When a new track starts with empty queue: calls `generateQueueFromBackend(track.id, keyword)`.
 * - When playback nears queue end (`currentIndex >= queue.length - 2`): calls `extendQueueFromBackend`
 *   to append fresh non-duplicate recommendations seamlessly.
 * - On track completion (`onTrackEnd`): re-seeks if looping, else calls `nextTrack()`.
 */
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
    currentIndex,
    setCurrentIndex,
    isLooping,
    isFullScreen,
    toggleFullScreen,
    nextTrack,
    isAutoRefillEnabled,
  } = usePlayerStore();

  const isExtendingRef = useRef(false);

  // STEP 1: Initial Queue Generation from NestJS Backend
  useEffect(() => {
    if (track?.id && queue.length === 0) {
      const keyword = getRandomGenre(track.genre);
      console.debug("Generating backend queue for track:", track.id, "keyword:", keyword);

      const fetchQueue = async () => {
        try {
          const generatedQueue = await generateQueueFromBackend(track.id, keyword);
          if (Array.isArray(generatedQueue) && generatedQueue.length > 0) {
            setQueue(generatedQueue);
            setCurrentIndex(0);
          }
        } catch (err) {
          console.error("Backend queue generation failed:", err);
        }
      };

      fetchQueue();
    }
  }, [track?.id, queue.length, setQueue, setCurrentIndex]);

  // STEP 2: Continuous Radio Auto-Refill near Queue End
  useEffect(() => {
    if (
      !isAutoRefillEnabled ||
      isExtendingRef.current ||
      queue.length === 0 ||
      currentIndex < queue.length - 2
    ) {
      return;
    }

    const extendQueue = async () => {
      isExtendingRef.current = true;
      try {
        const keyword = getRandomGenre(track?.genre);
        const existingTrackIds = queue.map((t) => t.id || t.videoId).filter(Boolean);
        const extension = await extendQueueFromBackend(existingTrackIds, keyword);

        if (Array.isArray(extension) && extension.length > 0) {
          console.debug(`[Radio Auto-Refill] Appended ${extension.length} new tracks to queue.`);
          setQueue([...queue, ...extension]);
        }
      } catch (err) {
        console.error("Queue auto-refill failed:", err);
      } finally {
        isExtendingRef.current = false;
      }
    };

    extendQueue();
  }, [currentIndex, queue, isAutoRefillEnabled, track?.genre, setQueue]);

  // STEP 3: Single Event-Driven Track Completion Handler
  const handleTrackEnd = useCallback(() => {
    if (isLooping) {
      if (player && typeof player.seekTo === "function") {
        player.seekTo(0);
        player.playVideo?.();
      }
    } else {
      nextTrack();
    }
  }, [isLooping, nextTrack, player]);

  const onPlayerReady = useCallback((event) => {
    const ytPlayer = event.target;

    if (!ytPlayer) return;

    setPlayer(ytPlayer);
    setIsPlayerReady(true);

    const currentTrack = usePlayerStore.getState().track;
    if (currentTrack?.id && ytPlayer.getVideoData()?.video_id !== currentTrack.id) {
      ytPlayer.loadVideoById({ videoId: currentTrack.id });
      ytPlayer.playVideo();
    }
  }, [setPlayer, setIsPlayerReady]);

  const handleClose = () => {
    console.debug("Closing player and cleaning up resources");

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
      <YoutubePlayer
        trackId={track?.id}
        onReady={onPlayerReady}
        onTrackEnd={handleTrackEnd}
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
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default PlayerContainer;
