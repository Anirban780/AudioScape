import React, { useState, useRef, useEffect } from "react";
import {
    Pause,
    Play,
    SkipBack,
    SkipForward,
    ThumbsUp,
    X
} from "lucide-react";
import ProgressBar from "./ProgressBar";
import VolumeBar from "./VolumeBar";
import placeholder from "../../assets/placeholder.jpg";
import Sidebar from "../Home/Sidebar";

const FullScreenPlayer = ({ track, player, isPlayerReady, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(50);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    const progressRef = useRef(null);
    const volumeRef = useRef(null);

    const togglePlayPause = () => {
        if (!player || !isPlayerReady) return;
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
        setIsPlaying((prev) => !prev);
    };

    const handleLike = async () => {
        if (!track?.id) return;
        setIsLiked((prev) => !prev);
        // await saveLikeSong(track.id); // Uncomment when function is defined
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (player && isPlayerReady) {
                const current = player.getCurrentTime();
                const total = player.getDuration();
                setProgress(current);
                setDuration(total);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [player, isPlayerReady]);

    return (
        <div className="fixed inset-0 z-50 flex bg-black text-white">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
                {/* Exit Button */}
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-800 hover:bg-red-500 rounded-full transition-colors"
                        title="Exit Fullscreen"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
                    <img
                        src={track?.thumbnail || placeholder}
                        alt={track?.name}
                        className="w-110 h-126 object-cover rounded-md shadow-lg"
                    />

                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">{track?.name || "No Track Selected"}</h2>
                        <p className="text-gray-400">{track?.artist || "Unknown Artist"}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full px-6 md:px-20 max-w-4xl">
                        <ProgressBar
                            progress={progress}
                            duration={duration}
                            player={player}
                            isReady={isPlayerReady}
                            ref={progressRef}
                            setProgress={setProgress}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center items-center gap-6">
                        <button
                            onClick={handleLike}
                            className={`p-2 rounded-full ${isLiked ? "text-white" : "text-gray-500 hover:text-white"}`}
                        >
                            <ThumbsUp size={22} fill="none" strokeWidth={isLiked ? 2.5 : 2} />
                        </button>

                        <button
                            onClick={() => player?.seekTo(0, true)}
                            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                            title="Previous"
                        >
                            <SkipBack size={24} />
                        </button>

                        <button
                            onClick={togglePlayPause}
                            className="p-3 bg-green-600 hover:bg-green-500 rounded-full transition-colors"
                            title="Play / Pause"
                        >
                            {isPlaying ? (
                                <Pause size={28} className="text-white" />
                            ) : (
                                <Play size={28} className="text-white" />
                            )}
                        </button>

                        <button
                            onClick={() => { }}
                            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                            title="Next"
                        >
                            <SkipForward size={24} />
                        </button>
                    </div>

                    {/* Volume Bar at bottom center */}
                    <div className="w-full flex justify-center mt-auto pb-6">
                        <div className="w-40">
                            <VolumeBar
                                volume={volume}
                                setVolume={setVolume}
                                player={player}
                                isReady={isPlayerReady}
                                ref={volumeRef}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue (Right Sidebar) */}
            <div className="w-80 bg-gray-800 p-4 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">UP NEXT</h3>
                <p className="text-gray-400">No tracks in queue</p>
                {/* Replace with actual queue */}
            </div>
        </div>
    );
};

export default FullScreenPlayer;
