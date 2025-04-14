import React, { useState, useCallback, useEffect } from "react";
import MusicPlayer from "./MusicPlayer";
import FullScreenPlayer from "./FullScreenPlayer";
import YouTubePlayer from "./YoutubePlayer";
import MiniPlayer from "./MiniPlayer";
import usePlayerStore from "../../store/usePlayerStore";
import { generateQueue } from "../../utils/api";

// List of curated fallback genres
const curatedGenres = [
  "lofi music", "pop hits", "indie rock", "anime music", "k-pop", "electronic", "jazz chill", "hip hop",
];

const getRandomGenre = (genres) => {
  if (genres && genres.length > 0) {
    // If genre exists, pick a random genre from the provided genre array
    return genres[Math.floor(Math.random() * genres.length)];
  }
  else {
    // If no genre is provided, fallback to a random genre from curatedGenres
    return curatedGenres[Math.floor(Math.random() * curatedGenres.length)];
  }
};

const PlayerContainer = ({ initialTrack, onClose, uid }) => {
  const [track, setTrack] = useState(initialTrack);
  const [player, setPlayer] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isQueueFetched, setIsQueueFetched] = useState(false);

  const { setQueue, setCurrentIndex } = usePlayerStore();

  // Update track when initialTrack prop changes
  useEffect(() => {
    setTrack(initialTrack);
  }, [initialTrack]);

  // When track changes, set the queue based on the new track (or any logic you need)
  useEffect(() => {
    if(track?.id && uid && !isQueueFetched) {
        const keyword = getRandomGenre(track?.genre);

        const fetchQueue = async() => {
            const generatedQueue = await generateQueue(keyword, uid);
            //console.log("Generated Queue:", generatedQueue);  

            if(Array.isArray(generatedQueue) && generatedQueue.length > 0) {
              setQueue(generatedQueue);
              setCurrentIndex(0);
              setIsQueueFetched(true);
            }
        };
        
        fetchQueue();
    }
  }, [track?.id, track?.genre, uid, setQueue, setCurrentIndex, isQueueFetched]);

  //reset queue when the song stops
  useEffect(() => {
    const onSongEnd = () => {
      setIsQueueFetched(false);
      setQueue([]);
    }

    let playerStateCheck;

    if(player && player.getPlayerState) {
      playerStateCheck = setInterval(() => {
        const state = player.getPlayerState();

        if(state === 0) {
          onSongEnd();
          clearInterval(playerStateCheck); // Stop checking when song ends
        }
      }, 1000);
    }

    return () => {
      if (playerStateCheck) clearInterval(playerStateCheck);  // Cleanup interval on unmount
    };

  }, [player, setQueue]);

  // Handle player readiness
  const onPlayerReady = useCallback((event) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);
    setIsPlayerReady(true);

    if (track?.id) {
      ytPlayer.cueVideoById({ videoId: track.id });
    }

  }, [track?.id]);

  // Handle track change logic when a new track is selected
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
    setIsPlayerReady(false);
    setIsQueueFetched(false);
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
