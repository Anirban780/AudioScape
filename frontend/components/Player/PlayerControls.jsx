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
import { cn } from "../../../utils/lib/utils";
import usePlayerStore from "../../store/usePlayerStore";

const PlayerControls = ({
  isPlaying,
  togglePlayPause,
  handleLike,
  isLiked,
  handleShuffle,
  isShuffling,
  size,
  handleNext,
  handlePrev,
  isMuted,
  toggleMute,
  isLooping,
  toggleLooping,
}) => {
  const { isFullScreen } = usePlayerStore();

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-6 max-w-[500px] mx-auto", // Centered container with a max width
        isFullScreen ? "flex-nowrap" : "flex-wrap"
      )}
    >
      {/* Left Side: Like and Shuffle Buttons - Only visible in Full Screen */}
      {isFullScreen && (
        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            className={cn(
              "p-2 rounded-full transition-colors duration-200",
              isLiked ? "text-white" : "text-gray-500 hover:text-white"
            )}
          >
            <ThumbsUp size={size + 2} fill="none" strokeWidth={isLiked ? 2.5 : 2} />
          </button>

          <button
            onClick={handleShuffle}
            className={cn(
              "p-2 rounded-full transition-colors duration-200",
              isShuffling
                ? "text-green-500 bg-gray-700 hover:bg-green-600" // Hover effect for "on" state
                : "text-gray-400 hover:text-white hover:bg-gray-600"
            )}
            title={isShuffling ? "Shuffle on" : "Shuffle off"}
          >
            <Shuffle size={size} />
          </button>
        </div>
      )}

      {/* Center: Play/Pause, Prev, Next - Always visible */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={handlePrev}
          className="p-2 text-gray-400 hover:text-green-400 transition-colors duration-200"
          aria-label="Previous"
        >
          <SkipBack size={size} />
        </button>

        <button
          onClick={togglePlayPause}
          className="p-4 rounded-full bg-gray-300/10 hover:bg-green-500/20 text-white transition-all duration-200"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={size + 6} /> : <Play size={size + 6} />}
        </button>

        <button
          onClick={handleNext}
          className="p-2 text-gray-400 hover:text-green-400 transition-colors duration-200"
          aria-label="Next"
        >
          <SkipForward size={size} />
        </button>
      </div>

      {/* Right Side: Volume and Loop - Only visible in Full Screen */}
      {isFullScreen && (
        <div className="flex items-center gap-6">
          <button
            onClick={toggleMute}
            aria-label="Toggle volume"
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            {isMuted ? <VolumeX size={size} /> : <Volume2 size={size} />}
          </button>

          <button
            onClick={toggleLooping}
            className={cn(
              "p-2 rounded-full transition-colors duration-200",
              isLooping
                ? "text-green-500 bg-gray-700 hover:bg-green-600" // Hover effect for "on" state
                : "text-gray-400 hover:text-white hover:bg-gray-600"
            )}
            title={isLooping ? "Loop on" : "Loop off"}
          >
            <Repeat size={size} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;
