import React, { useEffect, useRef, useState } from 'react';
import usePlayerStore from '@/store/usePlayerStore';
import { Rnd } from 'react-rnd';
import placeholder from '@/assets/placeholder.jpg';
import { Maximize2, X } from 'lucide-react';
import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';
import { getValidThumbnailUrl } from '@/utils/youtubeUtils';

/**
 * ============================================================================
 * FLOATING MINI PLAYER (MiniPlayer.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Floating, draggable mini player window (`react-rnd`) rendered at the bottom-right
 * of the screen during active audio playback.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Glassmorphic Overlay: Replaced hardcoded `bg-gray-900 border-white` with
 *    `bg-[var(--color-surface-overlay)]/90 backdrop-blur-md` and `border-[var(--color-border-strong)]`
 *    for a sleek, premium floating glass widget look.
 * 2. Draggable Window Handle: Uses `react-rnd` with header handle `mini-player-header` so
 *    users can reposition the player anywhere on screen without covering workspace elements.
 * 3. Responsive Touch Boundaries: Bound to `window` with min-width constraints.
 * 
 * HOW IT WORKS:
 * - Polls `player.getCurrentTime()` every 1s to update `progress` in Zustand store.
 * - Invokes `setIsFullScreen(true)` to transition into FullScreenPlayer view mode.
 */
const MiniPlayer = ({ track, player, isPlayerReady, onClose }) => {
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

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <Rnd
      default={{
        x: typeof window !== 'undefined' ? window.innerWidth - 400 : 800,
        y: typeof window !== 'undefined' ? window.innerHeight - 280 : 500,
        width: 380,
        height: 250,
      }}
      minWidth={300}
      minHeight={200}
      bounds="window"
      dragHandleClassName="mini-player-header"
      className="z-50"
    >
      {/* Floating Glassmorphic Container */}
      <div className="rounded-2xl shadow-2xl w-full h-full p-4 flex flex-col justify-between transition-all duration-200 bg-[var(--color-surface-overlay)]/90 backdrop-blur-md text-[var(--color-on-surface)] border border-[var(--color-border-strong)]">
        {/* Header Bar (Draggable Handle) */}
        <div className="flex justify-between items-center mini-player-header cursor-move select-none">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
<<<<<<< HEAD
              src={track?.thumbnail || placeholder}
=======
              src={getValidThumbnailUrl(track?.thumbnail) || placeholder}
>>>>>>> staging
              alt={track?.name || "Track artwork"}
              className="w-14 h-14 rounded-xl object-cover shadow-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-[var(--color-on-surface)]">
                {track?.name || "No track active"}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                {track?.artist || "Unknown artist"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setIsFullScreen(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsFullScreen(true);
              }}
              aria-label="Expand to full screen player"
              title="Expand player"
              className="p-1.5 hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-lg transition-colors"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={handleClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleClose();
              }}
              aria-label="Close mini player"
              title="Close player"
              className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress Seeker */}
        <ProgressBar
          progress={progress}
          duration={duration}
          player={player}
          isReady={isPlayerReady}
          setProgress={setProgress}
          ref={progressRef}
        />

        {/* Controls Toolbar */}
        <div className="flex justify-between items-center w-full mt-1">
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
            volume={volume}
            setVolume={setVolume}
          />
        </div>
      </div>
    </Rnd>
  );
};

export default MiniPlayer;
