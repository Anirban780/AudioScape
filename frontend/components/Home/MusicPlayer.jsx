import React, { useState, useEffect, useRef, useCallback } from "react";
import YouTube from "react-youtube";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
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

    // Handle player ready event
    const onPlayerReady = useCallback((event) => {
        const ytPlayer = event.target;
        setPlayer(ytPlayer);
        setIsPlayerReady(true);
        ytPlayer.setVolume(volume);
        ytPlayer.setPlaybackQuality("small"); // Forces 144p resolution
        ytPlayer.pauseVideo();
    }, [volume]);

    // Cue video when track changes
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

    // Load saved volume from localStorage
    useEffect(() => {
        const savedVolume = localStorage.getItem('musicPlayerVolume');
        if (savedVolume) setVolume(parseInt(savedVolume, 10));
    }, []);

    // Save volume to localStorage
    useEffect(() => {
        localStorage.setItem('musicPlayerVolume', volume.toString());
    }, [volume]);

    // Update progress continuously while playing
    useEffect(() => {
        let intervalId;
        if (isPlaying && player && duration > 0) {
            intervalId = setInterval(() => {
                const currentTime = player.getCurrentTime() || 0;
                setProgress(currentTime);
            }, 100); // Update every 100ms
        }
        return () => clearInterval(intervalId);
    }, [isPlaying, player, duration]);

    // Toggle play/pause with immediate state update
    const togglePlayPause = () => {
        if (!player || !isPlayerReady) {
            console.log('Player not ready');
            return;
        }
        if (isPlaying) {
            player.pauseVideo();
            setIsPlaying(false);
        } else {
            player.playVideo();
            setIsPlaying(true);
        }
    };

    // Handle progress slider interaction
    const handleProgressInteraction = useCallback((clientX, isEnd = false) => {
        if (!progressRef.current || !player || !isPlayerReady) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        setProgress(newTime);
        if (isEnd) player.seekTo(newTime, true);
    }, [player, duration, isPlayerReady]);

    // Handle volume slider interaction
    const handleVolumeChange = useCallback((clientX) => {
        if (!volumeRef.current || !player || !isPlayerReady) return;
        const rect = volumeRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newVolume = Math.round(pos * 100);
        player.setVolume(newVolume);
        setVolume(newVolume);
    }, [player, isPlayerReady]);

    // Mouse event handlers for progress slider
    const handleMouseDown = useCallback((e) => {
        setIsDraggingProgress(true);
        handleProgressInteraction(e.clientX);
    }, [handleProgressInteraction]);

    const handleMouseMove = useCallback((e) => {
        if (isDraggingProgress) handleProgressInteraction(e.clientX);
    }, [isDraggingProgress, handleProgressInteraction]);

    const handleMouseUp = useCallback((e) => {
        if (isDraggingProgress) {
            handleProgressInteraction(e.clientX, true);
            setIsDraggingProgress(false);
        }
    }, [isDraggingProgress, handleProgressInteraction]);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Format time for display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    // YouTube player options
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
            iv_load_policy: 3, 
            fs: 0, 
            disablekb: 1, 
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
                        if (state === 1) { // Playing
                            setIsPlaying(true);
                            setDuration(event.target.getDuration());

                            if (track?.id) {
                                saveSongListen(track.id).catch((err) => console.error("Error saving song listen:", err));
                            }
                            
                            event.target.setPlaybackQuality("small"); // Ensure 144p while playing
                        } else if (state === 2) { // Paused
                            setIsPlaying(false);
                        } else if (state === 5) { // Cued
                            setDuration(event.target.getDuration());
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default MusicPlayer;
