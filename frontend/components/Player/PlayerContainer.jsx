// PlayerContainer.jsx
import React, { useState, useCallback, useEffect } from "react";
import MusicPlayer from "./MusicPlayer";
import FullScreenPlayer from "./FullScreenPlayer";
import YouTubePlayer from "./YoutubePlayer";
import MiniPlayer from "./MiniPlayer";
import usePlayerStore from "../../store/usePlayerStore";
import { generateQueue } from "../../utils/api";

const curatedGenres = [
  "lofi music", "pop hits", "indie rock", "anime music", "k-pop", "electronic", "jazz chill", "hip hop"
];

const getRandomGenre = (genres) => {
  return genres?.length > 0
    ? genres[Math.floor(Math.random() * genres.length)]
    : curatedGenres[Math.floor(Math.random() * curatedGenres.length)];
};

const PlayerContainer = ({ onClose, uid }) => {
  const [player, setPlayer] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isQueueFetched, setIsQueueFetched] = useState(false);

  const { track, setTrack, setQueue, setCurrentIndex } = usePlayerStore();

  // Generate queue when new track is played
  useEffect(() => {
    if (track?.id && uid && !isQueueFetched) {
      const keyword = getRandomGenre(track.genre);

      const fetchQueue = async () => {
        try {
          const generatedQueue = await generateQueue(keyword, uid, track);
          if (Array.isArray(generatedQueue) && generatedQueue.length > 0) {
            setQueue(generatedQueue);
            setCurrentIndex(0);
            setIsQueueFetched(true);
          }
        } catch (err) {
          console.error("Queue generation failed", err);
        }
      };

      fetchQueue();
    }
  }, [track?.id, track?.genre, uid, isQueueFetched, setQueue, setCurrentIndex]);

  // Reset queue when song ends
  useEffect(() => {
    let playerStateCheck;

    const onSongEnd = () => {
      setIsQueueFetched(false);
      setQueue([]);
    };

    if (player && player.getPlayerState) {
      playerStateCheck = setInterval(() => {
        if (player.getPlayerState() === 0) {
          onSongEnd();
          clearInterval(playerStateCheck);
        }
      }, 1000);
    }

    return () => {
      if (playerStateCheck) clearInterval(playerStateCheck);
    };
  }, [player, setQueue]);

  // Handle player readiness
  const onPlayerReady = useCallback((event) => {
    console.log("YouTube player is ready.");
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    setIsPlayerReady(true);
  
    if (track?.id) {
      console.log("Loading video with ID: ", track.id);
      ytPlayer.loadVideoById({ videoId: track.id });
      ytPlayer.playVideo();  // Start video immediately
    }
  }, [track?.id]);
  

  // Handle track switching
  useEffect(() => {
    if (isPlayerReady && player && track?.id) {
      try {
        // First, load the new video (track)
        player.loadVideoById({ videoId: track.id });
  
        // Add a 5-second delay before playing the track
        const delay = 5000; // 5 seconds
  
        const playAfterDelay = setTimeout(() => {
          try {
            player.playVideo();
          } catch (err) {
            console.error("Failed to play video after delay", err);
          }
        }, delay);
  
        // Cleanup the timeout if the effect reruns
        return () => clearTimeout(playAfterDelay);
  
      } catch (err) {
        console.error("Failed to load and play video", err);
      }
    }
  }, [track?.id, isPlayerReady, player]);
  
  
  

  const toggleFullScreen = () => setIsFullScreen((prev) => !prev);

  const handleClose = () => {
    if (onClose) onClose();
    setTrack(null);
    setIsPlayerReady(false);
    setIsQueueFetched(false);
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
          toggleFullScreen={toggleFullScreen}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default PlayerContainer;
