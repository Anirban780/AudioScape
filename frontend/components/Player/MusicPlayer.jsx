import React, { useState, useRef, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";
import VolumeBar from "./VolumeBar";
import placeholder from "../../assets/placeholder.jpg";
import { Maximize2 } from "lucide-react";

const MusicPlayer = ({ track, player, isPlayerReady, toggleFullScreen }) => {
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
    setIsLiked((prev) => !prev);
    // await saveLikeSong(track.id); // Define this function to store like
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
    <div className="text-white">
      <div className="w-full max-w-4xl mx-auto p-6 rounded-2xl bg-gradient-to-b from-gray-900 to-black shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <img
              src={track?.thumbnail || placeholder}
              alt={track?.name}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105 shadow-lg"
            />
            <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold tracking-tight">
                  {track?.name || "No Track"}
                </h2>
                <p className="text-sm text-gray-400">
                  {track?.artist || "Unknown Artist"}
                </p>
              </div>
              <button
                onClick={toggleFullScreen}
                className="p-2 rounded hover:bg-white/10 transition"
                title="Toggle Full Screen"
              >
                <Maximize2 size={18} />
              </button>
            </div>

            <ProgressBar
              progress={progress}
              duration={duration}
              player={player}
              isReady={isPlayerReady}
              ref={progressRef}
              setProgress={setProgress}
            />

            <PlayerControls
              isPlaying={isPlaying}
              togglePlayPause={togglePlayPause}
              handleLike={handleLike}
              isLiked={isLiked}
            />

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
  );
};

export default MusicPlayer;
