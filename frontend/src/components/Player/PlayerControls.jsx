import React from "react";
import {
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import usePlayerStore from "@/store/usePlayerStore";

/**
 * ============================================================================
 * PLAYER CONTROLS TOOLBAR (PlayerControls.jsx)
 * ============================================================================
 * 
 * FIXES APPLIED:
 * 1. Pure Mute/Unmute Toggle Button: Speaker icon button calls `toggleMute()` directly,
 *    switching between `Volume2` and `VolumeX` with instant store & YouTube player sync.
 * 2. Heart Shape Like Button with pink hover and active fill.
 * 3. Mini Mode Customization (`isMini={true}`).
 */
const PlayerControls = ({
  isPlaying,
  togglePlayPause,
  isLiked,
  size,
  handleNext,
  handlePrev,
  isLooping,
  toggleLooping,
  isShuffling,
  toggleShuffling,
  toggleLike,
  isMini = false,
}) => {
  const { isFullScreen, isMuted, toggleMute } = usePlayerStore();
  const iconSize = size || (isFullScreen ? 24 : 20);

  return (
    <div className="relative flex items-center justify-center gap-3 sm:gap-5 py-1 select-none w-full">
      
      {/* 1. Pure Mute / Unmute Toggle Button */}
      <button
        onClick={toggleMute}
        className={cn(
          "p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 shadow-sm flex items-center justify-center shrink-0 active:scale-95 cursor-pointer",
          isMuted
            ? "text-red-400 bg-red-500/15 border-red-500/40 shadow-[0_0_12px_rgba(248,113,113,0.25)]"
            : "text-[var(--color-on-surface-variant)] bg-[var(--color-surface-overlay)]/60 border-[var(--color-border-default)]/40 hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]/40"
        )}
        title={isMuted ? "Unmute audio (M)" : "Mute audio (M)"}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
      >
        {isMuted ? <VolumeX size={iconSize} /> : <Volume2 size={iconSize} />}
      </button>

      {/* 2. Shuffle Toggle Button (FullScreen / Normal mode only) */}
      {!isMini && (
        <button
          onClick={toggleShuffling}
          className={cn(
            "p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 shadow-sm flex items-center justify-center shrink-0 active:scale-95 cursor-pointer",
            isShuffling
              ? "text-[var(--color-primary)] bg-[var(--color-state-active)] border-[var(--color-primary)]/60 shadow-[0_0_15px_rgba(167,139,250,0.35)] font-bold scale-105"
              : "text-[var(--color-on-surface-variant)] bg-[var(--color-surface-overlay)]/60 border-[var(--color-border-default)]/40 hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]/40"
          )}
          title={isShuffling ? "Shuffle on" : "Shuffle off"}
          aria-label={isShuffling ? "Disable shuffle" : "Enable shuffle"}
        >
          <Shuffle size={iconSize} />
        </button>
      )}

      {/* 3. Skip Previous Button */}
      <button
        onClick={handlePrev}
        className="p-2.5 sm:p-3 rounded-2xl bg-[var(--color-surface-overlay)]/60 border border-[var(--color-border-default)]/40 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-state-hover)] transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
        aria-label="Previous track"
        title="Previous track (Shift + ←)"
      >
        <SkipBack size={iconSize} />
      </button>

      {/* 4. PERFECT 1:1 CIRCLE PLAY / PAUSE BUTTON */}
      <button
        onClick={togglePlayPause}
        className={cn(
          "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[var(--color-primary)] via-[#c084fc] to-[#e8ddff] text-white shadow-[0_0_20px_rgba(167,139,250,0.4)] ring-2 ring-white/25 ring-inset shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        )}
        aria-label={isPlaying ? "Pause track" : "Play track"}
        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
      >
        {isPlaying ? (
          <Pause size={iconSize + 4} className="fill-current" />
        ) : (
          <Play size={iconSize + 4} className="fill-current ml-0.5" />
        )}
      </button>

      {/* 5. Skip Next Button */}
      <button
        onClick={handleNext}
        className="p-2.5 sm:p-3 rounded-2xl bg-[var(--color-surface-overlay)]/60 border border-[var(--color-border-default)]/40 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-state-hover)] transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
        aria-label="Next track"
        title="Next track (Shift + →)"
      >
        <SkipForward size={iconSize} />
      </button>

      {/* 6. Loop Toggle Button (FullScreen / Normal mode only) */}
      {!isMini && (
        <button
          onClick={toggleLooping}
          className={cn(
            "p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 shadow-sm flex items-center justify-center shrink-0 active:scale-95 cursor-pointer",
            isLooping
              ? "text-[var(--color-primary)] bg-[var(--color-state-active)] border-[var(--color-primary)]/60 shadow-[0_0_15px_rgba(167,139,250,0.35)] font-bold scale-105"
              : "text-[var(--color-on-surface-variant)] bg-[var(--color-surface-overlay)]/60 border-[var(--color-border-default)]/40 hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]/40"
          )}
          title={isLooping ? "Loop on" : "Loop off"}
          aria-label={isLooping ? "Disable loop" : "Enable loop"}
        >
          <Repeat size={iconSize} />
        </button>
      )}

      {/* 7. HEART SHAPE LIKE BUTTON */}
      <button
        onClick={toggleLike}
        className={cn(
          "p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 shadow-sm flex items-center justify-center shrink-0 active:scale-95 cursor-pointer",
          isLiked
            ? "text-pink-500 bg-pink-500/15 border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.35)] scale-105"
            : "text-[var(--color-on-surface-variant)] bg-[var(--color-surface-overlay)]/60 border-[var(--color-border-default)]/40 hover:text-pink-400 hover:bg-[var(--color-state-hover)] hover:border-pink-500/30"
        )}
        aria-label="Like song"
        title={isLiked ? "Remove from favourites" : "Add to favourites"}
      >
        <Heart size={iconSize} fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
      </button>
    </div>
  );
};

export default PlayerControls;
