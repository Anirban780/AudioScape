import React, { useState, useEffect, useRef, useCallback } from "react";
import YouTube from "react-youtube";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import placeholder from "../../assets/placeholder.jpg";
import { saveSongListen } from "../../utils/api";

const MusicPlayer = ({ track }) => {
    const [player, setPlayer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(50);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const progressRef = useRef(null);
    const volumeRef = useRef(null);
    const rafRef = useRef(null);

    const onPlayerReady = useCallback((event) => {
        const ytPlayer = event.target;
        setPlayer(ytPlayer);
        setIsPlayerReady(true);
        ytPlayer.setVolume(volume);
        ytPlayer.pauseVideo();
    }, [volume]);

    const updateProgress = useCallback(() => {
        if (player && !isDraggingProgress && player.getPlayerState() === 1) {
            const currentTime = player.getCurrentTime() || 0;
            setProgress(currentTime);
            rafRef.current = requestAnimationFrame(updateProgress);
        }
    }, [player, isDraggingProgress]);

    const startProgressTracking = useCallback(() => {
        if (player && !rafRef.current) {
            rafRef.current = requestAnimationFrame(updateProgress);
        }
    }, [player, updateProgress]);

    const stopProgressTracking = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (player && track?.id && isPlayerReady) {
            const timer = setTimeout(() => {
                player.cueVideoById(track.id);
                player.pauseVideo();
                setProgress(0);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [track, player, isPlayerReady]);

    useEffect(() => {
        const savedVolume = localStorage.getItem('musicPlayerVolume');
        if (savedVolume) setVolume(parseInt(savedVolume, 10));
    }, []);

    useEffect(() => {
        localStorage.setItem('musicPlayerVolume', volume.toString());
    }, [volume]);

    useEffect(() => () => stopProgressTracking(), [stopProgressTracking]);

    const togglePlayPause = () => {
        if (!player || !isPlayerReady) return;
        isPlaying ? player.pauseVideo() : player.playVideo();
    };

    const handleProgressInteraction = useCallback((clientX, isEnd = false) => {
        if (!progressRef.current || !player || !isPlayerReady) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        setProgress(newTime);
        if (isEnd && player) {
            player.seekTo(newTime, true);
            if (player.getPlayerState() === 1) startProgressTracking();
        }
    }, [player, duration, isPlayerReady, startProgressTracking]);

    const handleVolumeChange = useCallback((clientX) => {
        if (!volumeRef.current || !player || !isPlayerReady) return;
        const rect = volumeRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newVolume = Math.round(pos * 100);
        player.setVolume(newVolume);
        setVolume(newVolume);
    }, [player, isPlayerReady]);

    const handleMouseDown = useCallback((e) => {
        setIsDraggingProgress(true);
        stopProgressTracking();
        handleProgressInteraction(e.clientX);
    }, [handleProgressInteraction]);

    const handleMouseMove = useCallback((e) => {
        if (isDraggingProgress) {
            handleProgressInteraction(e.clientX);
        }
    }, [isDraggingProgress, handleProgressInteraction]);

    const handleMouseUp = useCallback((e) => {
        if (isDraggingProgress) {
            handleProgressInteraction(e.clientX, true);
            setIsDraggingProgress(false);
        }
    }, [isDraggingProgress, handleProgressInteraction]);

    const handleTouchStart = useCallback((e) => {
        setIsDraggingProgress(true);
        stopProgressTracking();
        handleProgressInteraction(e.touches[0].clientX);
    }, [handleProgressInteraction]);

    const handleTouchMove = useCallback((e) => {
        if (isDraggingProgress) {
            e.preventDefault();
            handleProgressInteraction(e.touches[0].clientX);
        }
    }, [isDraggingProgress, handleProgressInteraction]);

    const handleTouchEnd = useCallback((e) => {
        if (isDraggingProgress) {
            handleProgressInteraction(e.changedTouches[0].clientX, true);
            setIsDraggingProgress(false);
        }
    }, [isDraggingProgress, handleProgressInteraction]);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const opts = {
        height: "0",
        width: "0",
        playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            enablejsapi: 1,
            playsinline: 1,
        },
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-gray-900 to-black text-white p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                    <img
                        src={track?.thumbnail || placeholder}
                        alt={track?.name || "No Track"}
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105 shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                <div className="flex-1 w-full space-y-4">
                    <div className="text-center sm:text-left">
                        <h2 className="text-xl font-semibold tracking-tight">{track?.name || "No Track Selected"}</h2>
                        <p className="text-sm text-gray-400">{track?.artist || "Unknown Artist"}</p>
                    </div>

                    <div className="space-y-2">
                        <div
                            ref={progressRef}
                            className="relative h-1 bg-gray-800 rounded-full cursor-pointer group"
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                        >
                            <div
                                className="absolute h-full bg-green-500 rounded-full transition-all duration-150 ease-out"
                                style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
                            />
                            <div
                                className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow-md transition-all duration-150 ease-out group-hover:scale-125"
                                style={{
                                    left: duration ? `${(progress / duration) * 100}%` : "0%",
                                    transform: 'translateX(-50%)',
                                    opacity: isDraggingProgress || progress > 0 ? 1 : 0,
                                    visibility: isDraggingProgress || progress > 0 ? 'visible' : 'hidden'
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>{formatTime(progress)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button className="p-2 hover:text-green-500 transition-colors">
                            <SkipBack size={20} />
                        </button>
                        <button
                            onClick={togglePlayPause}
                            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200"
                            disabled={!isPlayerReady}
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                        </button>
                        <button className="p-2 hover:text-green-500 transition-colors">
                            <SkipForward size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 max-w-xs mx-auto">
                        <Volume2 size={16} className="text-gray-400" />
                        <div
                            ref={volumeRef}
                            className="relative h-1 bg-gray-800 rounded-full cursor-pointer flex-1 group"
                            onMouseDown={(e) => {
                                setIsDraggingVolume(true);
                                handleVolumeChange(e.clientX);
                            }}
                            onMouseMove={(e) => isDraggingVolume && handleVolumeChange(e.clientX)}
                            onMouseUp={() => setIsDraggingVolume(false)}
                        >
                            <div
                                className="absolute h-full bg-green-500 rounded-full transition-all duration-150 ease-out"
                                style={{ width: `${volume}%` }}
                            />
                            <div
                                className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow-md transition-all duration-150 ease-out group-hover:scale-125"
                                style={{
                                    left: `${volume}%`,
                                    transform: 'translateX(-50%)',
                                    opacity: isDraggingVolume || volume > 0 ? 1 : 0
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden">
                <YouTube
                    videoId={track?.id || ""}
                    opts={opts}
                    onReady={onPlayerReady}
                    onStateChange={(event) => {
                        const state = event.data;
                        setIsPlaying(state === 1);
                        if (state === 1) {
                            saveSongListen(track.id).catch(console.error);
                            startProgressTracking();
                            console.log(track.id);
                        } else {
                            stopProgressTracking();
                        }
                        if (state === 5) {
                            setDuration(event.target.getDuration());
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default MusicPlayer;