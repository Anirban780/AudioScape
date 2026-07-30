import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Home/Sidebar";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";
import { X, ListMusic } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import usePlayerStore from "@/store/usePlayerStore";
import TrackQueue from "./TrackQueue";

const FullScreenPlayer = ({ track, player, isPlayerReady, onClose }) => {
  const {
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    duration,
    setDuration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isLiked,
    toggleLike,
    queue,
    currentIndex,
    setCurrentIndex,
    setTrack,
    isFullScreen,
    toggleFullScreen,
    isLooping,
    toggleLooping,
    isShuffling,
    toggleShuffling,
  } = usePlayerStore();

  const progressRef = useRef(null);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlayerReady) {
        const current = player.getCurrentTime?.();
        const dur = player.getDuration?.();
        if (!isNaN(current)) setProgress(current);
        if (!isNaN(dur)) setDuration(dur);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, isPlayerReady, setProgress, setDuration]);

  const togglePlayPause = () => {
    if (!player || !isPlayerReady) return;
    isPlaying ? player.pauseVideo?.() : player.playVideo?.();
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!player || !isPlayerReady) return;

    if (isMuted) {
      player.mute?.();
    } else {
      player.unMute?.();
      if (typeof volume === 'number') {
        player.setVolume?.(volume);
      }
    }
  }, [isMuted, player, isPlayerReady, volume]);

  const handleFullScreenToggle = () => {
    toggleFullScreen();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col md:flex-row bg-black text-white overflow-hidden ${isFullScreen ? 'w-full h-full' : ''}`}
    >
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setShowQueue(true)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors md:hidden"
            title="Show Queue"
          >
            <ListMusic size={20} />
          </button>
          <button
            onClick={handleFullScreenToggle}
            className="p-2 bg-gray-800 hover:bg-red-500 rounded-full transition-colors"
            title="Exit Fullscreen"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:space-y-10 space-y-6">
          <img
            src={track?.thumbnail || placeholder}
            alt={track?.name}
            className="w-[250px] h-[250px] md:w-[380px] md:h-[380px] object-cover rounded-xl shadow-2xl"
          />

          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-semibold">
              {track?.name || "No Track Selected"}
            </h2>
            <p className="text-md md:text-lg text-gray-400">
              {track?.artist || "Unknown Artist"}
            </p>
          </div>

          <div className="w-full max-w-3xl px-4 md:px-10">
            <ProgressBar
              progress={progress}
              duration={duration}
              player={player}
              isReady={isPlayerReady}
              ref={progressRef}
              setProgress={setProgress}
            />
          </div>

          <PlayerControls
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            isLiked={isLiked}
            size={30}
            handleNext={usePlayerStore.getState().nextTrack}
            handlePrev={usePlayerStore.getState().prevTrack}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isLooping={isLooping}
            toggleLooping={toggleLooping}
            isShuffling={isShuffling}
            toggleShuffling={toggleShuffling}
            toggleLike={toggleLike}
            volume={volume}
            setVolume={setVolume}
          />
        </div>
      </div>

      <TrackQueue
        queue={queue}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        setTrack={setTrack}
        showQueue={showQueue}
        setShowQueue={setShowQueue}
      />
    </div>
  );
};

export default FullScreenPlayer;
