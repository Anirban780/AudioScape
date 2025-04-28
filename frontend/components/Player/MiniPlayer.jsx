import React, { useEffect, useRef, useState } from 'react';
import usePlayerStore from '../../store/usePlayerStore';
import { Rnd } from 'react-rnd';
import placeholder from '../../assets/placeholder.jpg';
import { Maximize2, X } from 'lucide-react';
import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';

const MiniPlayer = ({ track, player, isPlayerReady, onClose }) => {
  const {
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    duration,
    setDuration,
    isMuted,
    toggleMute,
    isLiked,
    setIsLiked,
    isLooping,
    toggleLooping,
    isShuffling,
    toggleShuffling,
    setIsFullScreen,
  } = usePlayerStore();

  const progressRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

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

  const handleLike = () => setIsLiked(!isLiked);

  useEffect(() => {
    if (!player) return;

    isMuted ? player.mute() : player.unMute();
  }, [isMuted, player]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.(); // Reset track from parent
  };

  if (!isVisible) return null;

  return (
    <Rnd
      default={{
        x: window.innerWidth - 400,
        y: window.innerHeight - 300,
        width: 380,
        height: 260,
      }}
      minWidth={300}
      minHeight={200}
      bounds="window"
      dragHandleClassName="mini-player-header"
      className="z-50"
    >
      <div className="rounded-xl shadow-lg w-full h-full p-4 flex flex-col justify-between transition-all duration-200 bg-gray-900 text-white border-3 border-white">
        {/* Header */}
        <div className="flex justify-between items-center mini-player-header cursor-move">
          <div className="flex items-center gap-4">
            <img
              src={track?.thumbnail || placeholder}
              alt={track?.name}
              className="w-16 h-16 rounded object-cover"
            />
            <div>
              <p className="text-sm font-medium line-clamp-1">{track?.name}</p>
              <p className="mt-1 text-xs text-gray-400 line-clamp-1">{track?.artist}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsFullScreen(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsFullScreen(true);
              }}
              aria-label="Expand to full screen"
              className="p-1 hover:bg-gray-200 hover:text-black rounded-xl"
            >
              <Maximize2 size={18} />
            </button>
            <button
              onClick={handleClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleClose();
              }}
              aria-label="Close mini player"
              className="p-1 hover:bg-red-600 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          progress={progress}
          duration={duration}
          player={player}
          isReady={isPlayerReady}
          setProgress={setProgress}
          ref={progressRef}
        />

        {/* Controls */}
        <div className="flex sm:flex-row justify-center items-center sm:justify-between gap-4 sm:gap-0 mx-auto mt-2">
          <PlayerControls
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            handleLike={handleLike}
            isLiked={isLiked}
            size={18}
            handleNext={usePlayerStore.getState().nextTrack}
            handlePrev={usePlayerStore.getState().prevTrack}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isLooping={isLooping}
            toggleLooping={toggleLooping}
            isShuffling={isShuffling}
            toggleShuffling={toggleShuffling}
          />
        </div>
      </div>
    </Rnd>
  );
};

export default MiniPlayer;
