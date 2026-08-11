import {
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  ThumbsUp,
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
 * WHAT THIS FILE DOES:
 * Control buttons toolbar for audio playback (Play/Pause, Skip Next, Skip Previous,
 * Shuffle toggle, Loop toggle, Like toggle, and Mute toggle).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Primary Tokens & Zero-Green Rule: Replaced all legacy `text-green-500` / `hover:text-green-400`
 *    elements with primary brand tokens (`var(--color-primary)`, `var(--color-state-active)`).
 * 2. Shared Control Layout: Reused in both MiniPlayer and FullScreenPlayer while adapting
 *    icon sizes via `size` prop and conditional fullscreen extras (`isFullScreen`).
 * 
 * HOW IT WORKS:
 * - Triggers Zustand store actions: `togglePlayPause`, `handleNext`, `handlePrev`,
 *   `toggleShuffling`, `toggleLooping`, `toggleMute`, `toggleLike`.
 */
const PlayerControls = ({
  isPlaying,
  togglePlayPause,
  isLiked,
  size = 20,
  handleNext,
  handlePrev,
  isMuted,
  toggleMute,
  isLooping,
  toggleLooping,
  isShuffling,
  toggleShuffling,
  toggleLike
}) => {
  const { isFullScreen } = usePlayerStore();

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 max-w-full sm:max-w-[500px] mx-auto px-2">
      <div className="flex items-center justify-center gap-5 sm:gap-6">
        {/* Shuffle Toggle Button */}
        <button
          onClick={toggleShuffling}
          className={cn(
            "p-2 rounded-full transition-all duration-200",
            isShuffling
              ? "text-[var(--color-primary)] bg-[var(--color-state-active)] font-semibold scale-105"
              : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)]"
          )}
          title={isShuffling ? "Shuffle on" : "Shuffle off"}
          aria-label={isShuffling ? "Disable shuffle" : "Enable shuffle"}
        >
          <Shuffle size={size} />
        </button>

        {/* Skip Previous Button */}
        <button
          onClick={handlePrev}
          className="p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
          aria-label="Previous track"
          title="Previous track"
        >
          <SkipBack size={size} />
        </button>

        {/* Primary Play / Pause Circle Button */}
        <button
          onClick={togglePlayPause}
          className="p-3.5 sm:p-4 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 transition-all shadow-lg transform hover:scale-105 active:scale-95"
          aria-label={isPlaying ? "Pause track" : "Play track"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={size + 4} className="fill-current" /> : <Play size={size + 4} className="fill-current ml-0.5" />}
        </button>

        {/* Skip Next Button */}
        <button
          onClick={handleNext}
          className="p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
          aria-label="Next track"
          title="Next track"
        >
          <SkipForward size={size} />
        </button>

        {/* Loop Toggle Button */}
        <button
          onClick={toggleLooping}
          className={cn(
            "p-2 rounded-full transition-all duration-200",
            isLooping
              ? "text-[var(--color-primary)] bg-[var(--color-state-active)] font-semibold scale-105"
              : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)]"
          )}
          title={isLooping ? "Loop on" : "Loop off"}
          aria-label={isLooping ? "Disable loop" : "Enable loop"}
        >
          <Repeat size={size} />
        </button>
      </div>

      {/* Fullscreen Player Auxiliary Controls */}
      {isFullScreen && (
        <div className="flex items-center justify-center gap-6 mt-2">
          {/* Favourite / Like Toggle Button */}
          <button
            onClick={toggleLike}
            className={cn(
              "p-2.5 rounded-full transition-all duration-200 transform",
              isLiked
                ? "text-[var(--color-secondary)] bg-pink-500/10 scale-105"
                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)]"
            )}
            aria-label="Like song"
            title={isLiked ? "Remove from favourites" : "Add to favourites"}
          >
            <ThumbsUp size={size} fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
          </button>

          {/* Mute Toggle Button */}
          <button
            onClick={toggleMute}
            aria-label="Toggle mute"
            title={isMuted ? "Unmute" : "Mute"}
            className="p-2.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)] rounded-full transition-colors"
          >
            {isMuted ? <VolumeX size={size} /> : <Volume2 size={size} />}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;
