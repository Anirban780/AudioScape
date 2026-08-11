import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Home/Sidebar";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";
import { X, ListMusic } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import usePlayerStore from "@/store/usePlayerStore";
import TrackQueue from "./TrackQueue";
import { getValidThumbnailUrl } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * FULL SCREEN PLAYER VIEW (FullScreenPlayer.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Immersive expanded full-screen player view featuring large album artwork,
 * track title, artist name, progress seeker, controls toolbar, volume control,
 * and integrated TrackQueue drawer.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Surface Tokens: Replaced hardcoded `bg-black text-white` with
 *    semantic surface tokens (`bg-[var(--color-surface-base)]`, `text-[var(--color-on-surface)]`).
 * 2. Album Art Focus: Displays large 380px artwork with subtle ambient background blur.
 * 
 * HOW IT WORKS:
 * - Reads playback state and controls from `usePlayerStore`.
 * - Interacts with `TrackQueue` drawer component for queue inspection and song jumping.
 * - Toggle button invokes `toggleFullScreen()` to collapse back into MiniPlayer.
 */
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
      className={`fixed inset-0 z-50 flex flex-col md:flex-row bg-[var(--color-surface-base)] text-[var(--color-on-surface)] overflow-hidden ${
        isFullScreen ? 'w-full h-full' : ''
      }`}
    >
      {/* Left Sidebar Rail */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Fullscreen Stage */}
      <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
        {/* Top Control Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setShowQueue(true)}
            className="p-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:bg-[var(--color-state-hover)] rounded-full transition-colors md:hidden"
            title="Show Queue"
            aria-label="Show Queue"
          >
            <ListMusic size={18} />
          </button>
          <button
            onClick={handleFullScreenToggle}
            className="p-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:bg-red-500 hover:text-white rounded-full transition-colors"
            title="Exit Fullscreen"
            aria-label="Exit Fullscreen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Center Stage: Artwork, Info, Seekbar, Controls */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:space-y-8 space-y-6">
          <div className="relative group">
            <img
<<<<<<< HEAD
              src={track?.thumbnail || placeholder}
=======
              src={getValidThumbnailUrl(track?.thumbnail) || placeholder}
>>>>>>> staging
              alt={track?.name || "Track artwork"}
              className="w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] object-cover rounded-2xl shadow-2xl border border-[var(--color-border-strong)] transition-transform duration-300 group-hover:scale-102"
            />
          </div>

          <div className="text-center max-w-xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight line-clamp-1">
              {track?.name || "No Track Selected"}
            </h2>
            <p className="text-sm md:text-base text-[var(--color-on-surface-variant)] mt-1 line-clamp-1">
              {track?.artist || "Unknown Artist"}
            </p>
          </div>

          <div className="w-full max-w-2xl px-4 md:px-8">
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
            size={24}
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

      {/* Track Queue Drawer */}
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
