import { Pause, Play, SkipBack, SkipForward, ThumbsUp } from "lucide-react";

const PlayerControls = ({ isPlaying, togglePlayPause, handleLike, isLiked }) => (
    <div className="flex items-center justify-center gap-4">
        <button onClick={handleLike} className={`p-2 rounded-full ${isLiked ? "text-white" : "text-gray-500 hover:text-white"}`}>
            <ThumbsUp size={22} fill="none" strokeWidth={isLiked ? 2.5 : 2} />
        </button>
        <button className="p-2 hover:text-green-500 transition-colors">
            <SkipBack size={20} />
        </button>
        <button
            onClick={togglePlayPause}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20"
        >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button className="p-2 hover:text-green-500 transition-colors">
            <SkipForward size={20} />
        </button>
    </div>
);

export default PlayerControls;
