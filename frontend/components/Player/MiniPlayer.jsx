import React, { useEffect, useRef, useState } from 'react';
import usePlayerStore from '../../store/usePlayerStore';
import { Rnd } from 'react-rnd';
import placeholder from '../../assets/placeholder.jpg';
import { Maximize2, Volume2, X } from 'lucide-react';
import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';
import VolumeBar from './VolumeBar';
import { useTheme } from '../../ThemeProvider';  // Make sure you're using next-themes for theme management

const MiniPlayer = ({ track, player, isPlayerReady, toggleFullScreen, onClose }) => {
  const {
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    duration,
    setDuration,
    volume,
    setVolume,
    isLiked,
    setIsLiked,
  } = usePlayerStore();

  const { theme } = useTheme();  // Fetch current theme
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const [showVolume, setShowVolume] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // For close button

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
  const handleToggleVolume = () => setShowVolume((prev) => !prev);
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose(); // This will call the parent onClose and reset the track
    }
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
      <div
        className={`bg-gray-900 text-white rounded-xl shadow-lg w-full h-full p-4 flex flex-col justify-between ${theme === 'dark' ? 'border-4 border-white' : ''
          }`} // Add white border in dark mode
      >
        <div className="flex justify-between items-center mini-player-header cursor-move">
          <div className="flex items-center gap-4">
            <img
              src={track?.thumbnail || placeholder}
              alt={track?.name}
              className="w-16 h-16 rounded object-cover"
            />

            <div>
              <p className="text-sm font-medium">{track?.name}</p>
              <p className="mt-1 text-xs text-gray-400">{track?.artist}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleFullScreen}
              onTouchEnd={(e) => {
                e.preventDefault(); // Prevents double triggering
                toggleFullScreen();
              }}
              className="p-1 hover:bg-gray-200 hover:text-black rounded-xl"
            >
              <Maximize2 size={18} />
            </button>

            <button
              onClick={handleClose}
              onTouchEnd={(e) => {
                e.preventDefault(); // Prevents duplicate event firing
                handleClose();
              }}
              className="p-1 hover:bg-red-600 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

        </div>

        <ProgressBar
          progress={progress}
          duration={duration}
          player={player}
          isReady={isPlayerReady}
          setProgress={setProgress}
          ref={progressRef}
        />

        <div className="flex justify-between items-center mx-4 mt-2">
          <PlayerControls
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            handleLike={handleLike}
            isLiked={isLiked}
            size={20}
          />

          <div className="relative flex items-center">
            <button onClick={handleToggleVolume} className="p-1 hover:text-gray-300">
              <Volume2 size={20} />
            </button>
            {showVolume && (
              <div className="absolute right-0 bottom-8 w-28 bg-gray-800 p-2 rounded-md shadow-md">
                <VolumeBar
                  volume={volume}
                  setVolume={setVolume}
                  player={player}
                  isReady={isPlayerReady}
                  ref={volumeRef}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Rnd>
  );
};

export default MiniPlayer;
