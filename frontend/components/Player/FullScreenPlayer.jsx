import React, { useEffect, useRef } from "react";
import Sidebar from "../Home/Sidebar";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";
import VolumeBar from "./VolumeBar";
import { X } from "lucide-react";
import placeholder from "../../assets/placeholder.jpg";
import usePlayerStore from "./../../store/usePlayerStore";

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
        isLiked,
        setIsLiked,
    } = usePlayerStore();

    const progressRef = useRef(null);
    const volumeRef = useRef(null);

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
    }, [player, isPlayerReady]);


    const togglePlayPause = () => {
        if (!player || !isPlayerReady) return;
        if (isPlaying) {
            player.pauseVideo?.();
        } else {
            player.playVideo?.();
        }
        setIsPlaying(!isPlaying);
    };


    const handleLike = () => setIsLiked(!isLiked);


    return (
        <div className="fixed inset-0 z-50 flex bg-black text-white overflow-y-auto">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
                {/* Exit Fullscreen Button */}
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-800 hover:bg-red-500 rounded-full transition-colors"
                        title="Exit Fullscreen"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10">
                    {/* Large Thumbnail */}
                    <img
                        src={track?.thumbnail || placeholder}
                        alt={track?.name}
                        className="w-[380px] h-[380px] object-cover rounded-xl shadow-2xl"
                    />
                    {/* Track Info */}
                    <div className="text-center">
                        <h2 className="text-3xl font-semibold">
                            {track?.name || "No Track Selected"}
                        </h2>
                        <p className="text-lg text-gray-400">
                            {track?.artist || "Unknown Artist"}
                        </p>
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
                    {/* Player Controls */}
                    <PlayerControls
                        isPlaying={isPlaying}
                        togglePlayPause={togglePlayPause}
                        handleLike={handleLike}
                        isLiked={isLiked}
                    />
                    {/* Volume Bar */}
                    <div className="w-full flex justify-center mt-auto pb-6">
                        <div className="w-40">
                            <VolumeBar
                                volume={volume}
                                setVolume={setVolume}
                                player={player}
                                ref={volumeRef}
                                isReady={isPlayerReady}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar (Queue Placeholder) */}
            <div className="w-80 bg-gray-900 p-4 overflow-y-auto border-l border-gray-700">
                <h3 className="text-lg font-semibold mb-4">UP NEXT</h3>
                <p className="text-gray-400">No tracks in queue</p>
            </div>
        </div>
    );
};

export default FullScreenPlayer;
