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
  isLiked,
  size,
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
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center gap-4 max-w-full sm:max-w-[500px] mx-auto overflow-hidden px-2"
      )}
    >
      {/* Top Row: Shuffle, Prev, Play/Pause, Next, Loop */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={toggleShuffling}
          className={cn(
            "p-2 rounded-full transition-colors duration-200",
            isShuffling
              ? "text-green-500 bg-gray-700 hover:bg-green-200"
              : "text-gray-400 hover:text-white hover:bg-gray-600"
          )}
          title={isShuffling ? "Shuffle on" : "Shuffle off"}
        >
          <Shuffle size={size} />
        </button>

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

        <button
          onClick={toggleLooping}
          className={cn(
            "p-2 rounded-full transition-colors duration-200",
            isLooping
              ? "text-green-500 bg-gray-700 hover:bg-green-200"
              : "text-gray-400 hover:text-white hover:bg-gray-600"
          )}
          title={isLooping ? "Loop on" : "Loop off"}
        >
          <Repeat size={size} />
        </button>
      </div>

      {/* Bottom Row: Like, Volume (Only in Fullscreen) */}
      {isFullScreen && (
        <div className="flex items-center justify-center gap-6 mt-2">
          <button
            onClick={toggleLike}
            className={cn(
              "p-2 rounded-full transition-all duration-300 ease-in-out transform",
              isLiked
                ? " text-green-600 hover:text-white hover:bg-gray-500 shadow-lg scale-105"
                : "text-gray-500 hover:text-white hover:bg-green-400 hover:scale-105",
              "hover:shadow-md"
            )}
            aria-label="Like"
          >
            <ThumbsUp size={size} fill="none" strokeWidth={isLiked ? 2.5 : 2} />
          </button>


          <button
            onClick={toggleMute}
            aria-label="Toggle volume"
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            {isMuted ? <VolumeX size={size} /> : <Volume2 size={size} />}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;
