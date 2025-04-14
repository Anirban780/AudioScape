import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../Home/Sidebar";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";
import VolumeBar from "./VolumeBar";
import { X, ListMusic } from "lucide-react";
import placeholder from "../../assets/placeholder.jpg";
import usePlayerStore from "./../../store/usePlayerStore";
import clsx from "clsx";

const FullScreenPlayer = ({ track, player, isPlayerReady, onClose }) => {
  const {
    isPlaying, setIsPlaying, progress, setProgress, duration,
    setDuration, volume, setVolume, isLiked, setIsLiked,
    queue, currentIndex, setCurrentIndex, setTrack,

  } = usePlayerStore();

  const progressRef = useRef(null);
  const volumeRef = useRef(null);
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
  }, [player, isPlayerReady]);


  const togglePlayPause = () => {
    if (!player || !isPlayerReady) return;
    isPlaying ? player.pauseVideo?.() : player.playVideo?.();
    setIsPlaying(!isPlaying);
  };

  const handleLike = () => setIsLiked(!isLiked);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-black text-white overflow-hidden">
      {/* Sidebar (Desktop only) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
        {/* Top Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setShowQueue(true)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors md:hidden"
            title="Show Queue"
          >
            <ListMusic size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 hover:bg-red-500 rounded-full transition-colors"
            title="Exit Fullscreen"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:space-y-10 space-y-6">
          {/* Track Thumbnail */}
          <img
            src={track?.thumbnail || placeholder}
            alt={track?.name}
            className="w-[250px] h-[250px] md:w-[380px] md:h-[380px] object-cover rounded-xl shadow-2xl"
          />

          {/* Track Info */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-semibold">
              {track?.name || "No Track Selected"}
            </h2>
            <p className="text-md md:text-lg text-gray-400">
              {track?.artist || "Unknown Artist"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-3xl px-4 md:px-10">
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
          <PlayerControls
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            handleLike={handleLike}
            isLiked={isLiked}
            size={30}
            handleNext={usePlayerStore.getState().nextTrack}
            handlePrev={usePlayerStore.getState().prevTrack}
          />

          {/* Volume Control */}
          <div className="w-full flex justify-center pb-4 md:pb-6">
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

      {/* Queue Drawer (Mobile toggle, visible by default on Desktop) */}
      <div
        className={clsx(
          "fixed md:static top-0 right-0 h-full w-80 bg-gray-900 p-4 border-l border-gray-700 z-50 transform transition-transform duration-300 ease-in-out",
          {
            "translate-x-0": showQueue,
            "translate-x-full md:translate-x-0": !showQueue,
          }
        )}
      >
        {/* Hide button on mobile */}
        <div className="flex justify-between items-center mb-4 md:hidden">
          <h3 className="text-lg font-semibold">Up Next</h3>
          <button
            onClick={() => setShowQueue(false)}
            className="p-1 bg-gray-800 hover:bg-gray-700 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-semibold mb-4 hidden md:block">UP NEXT</h3>
        {/* Queue Content */}
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          {queue && queue.length > 0 ? (
              queue.map((qTrack, index) => (
                <div
                  key={qTrack.id || index}
                  className={clsx(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors",
                    {
                      "bg-gray-800": index === currentIndex,
                    }
                  )}

                  onClick={() => {
                    setCurrentIndex(index);
                    setTrack(qTrack);
                  }}
                >
                  <img
                    src={qTrack.thumbnail || placeholder}
                    alt={qTrack.name}
                    className="w-12 h-12 object-cover rounded-md"
                  />

                  <div className="flex flex-col overflow-hidden">
                    <p className="font-medium truncate">{qTrack.name}</p>
                    <p className="text-sm text-gray-400 truncate">{qTrack.artist}</p>
                  </div>

                </div>
              ))
            ) : (
              <p className="text-gray-400">No tracks in queue</p>
            )
          }



        </div>
      </div>
    </div>
  );
};

export default FullScreenPlayer;
