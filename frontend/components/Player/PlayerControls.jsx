import { Pause, Play, SkipBack, SkipForward, ThumbsUp } from "lucide-react";

const PlayerControls = ({ isPlaying, togglePlayPause, handleLike, isLiked, size }) => (
  <div className="flex items-center justify-center gap-4 sm:gap-6">
    
    {/* Like Button */}
    <button
      onClick={handleLike}
      className={`p-3 rounded-full transition-colors duration-200 ${
        isLiked ? "text-white" : "text-gray-500 hover:text-white"
      }`}
    >
      <ThumbsUp size={size + 2} fill="none" strokeWidth={isLiked ? 2.5 : 2} />
    </button>

    {/* Skip Back */}
    <button
      className="p-2 text-gray-400 hover:text-green-400 transition-colors duration-200"
      aria-label="Previous"
    >
      <SkipBack size={size} />
    </button>

    {/* Play / Pause */}
    <button
      onClick={togglePlayPause}
      className="p-3 rounded-full bg-gray-300/10 hover:bg-green-500/20 text-white transition-all duration-200"
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <Pause size={size + 4} /> : <Play size={size + 4} />}
    </button>

    {/* Skip Forward */}
    <button
      className="p-2 text-gray-400 hover:text-green-400 transition-colors duration-200"
      aria-label="Next"
    >
      <SkipForward size={size} />
    </button>
  </div>
);

export default PlayerControls;
