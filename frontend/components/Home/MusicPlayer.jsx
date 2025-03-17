import React, { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import placeholder from "../../assets/placeholder.jpg";

const MusicPlayer = ({ track }) => {
    const [player, setPlayer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(50);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [manualProgress, setManualProgress] = useState(null);
    const [playerState, setPlayerState] = useState(-1);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const progressRef = useRef(null);
    const volumeRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Initialize player and set up event listeners
    const onPlayerReady = (event) => {
        const ytPlayer = event.target;
        setPlayer(ytPlayer);
        setIsPlayerReady(true);
        
        // Set initial volume
        ytPlayer.setVolume(volume);
        
        // Always make sure it's paused on init
        ytPlayer.pauseVideo();
        setIsPlaying(false);
        
        // Listen for YouTube player state changes
        ytPlayer.addEventListener('onStateChange', (state) => {
            setPlayerState(state.data);
            
            // Update isPlaying based on actual player state
            if (state.data === 1) { // 1 = playing
                setIsPlaying(true);
                startProgressTracking(ytPlayer);
            } else if (state.data === 2 || state.data === 0) { // 2 = paused, 0 = ended
                setIsPlaying(false);
                stopProgressTracking();
            }
        });
    };

    // Load new track
    useEffect(() => {
        if (player && track?.id && isPlayerReady) {
          try {
            // Make sure player is ready and track ID is valid
            if (typeof player.cueVideoById === 'function' && track.id.trim() !== '') {
              player.cueVideoById(track.id);
              player.pauseVideo();
              setIsPlaying(false);
              setProgress(0);
              setManualProgress(null);
            }
          } catch (error) {
            console.error("Error loading track:", error);
          }
        }
      }, [track, player, isPlayerReady]);

      // Add this useEffect to handle a case where the player doesn't initialize properly
      useEffect(() => {
        if (player === null && isPlayerReady === false) {
          // Set a timeout to check if player is still null after some time
          const timer = setTimeout(() => {
            console.log("Player initialization timeout - trying to reinitialize");
            // Force a re-render of the YouTube component
            setKey(prev => prev + 1);
          }, 3000);
          
          return () => clearTimeout(timer);
        }
      }, [player, isPlayerReady]);
      
      
    // Persist player and track state in localStorage
    useEffect(() => {
        // Try to load saved state on initial render
        const loadSavedState = () => {
            try {
                const savedVolume = localStorage.getItem('musicPlayerVolume');
                if (savedVolume) {
                    setVolume(parseInt(savedVolume, 10));
                }
            } catch (error) {
                console.error("Error loading saved player state:", error);
            }
        };
        
        loadSavedState();
    }, []);

    // Save volume when it changes
    useEffect(() => {
        try {
            localStorage.setItem('musicPlayerVolume', volume.toString());
        } catch (error) {
            console.error("Error saving player state:", error);
        }
    }, [volume]);

    // Start tracking progress
    const startProgressTracking = (ytPlayer) => {
        stopProgressTracking(); // Clear any existing interval
        
        progressIntervalRef.current = setInterval(() => {
            if (!isDraggingProgress && ytPlayer) {
                try {
                    const currentTime = ytPlayer.getCurrentTime() || 0;
                    const videoDuration = ytPlayer.getDuration() || 0;
                    setProgress(currentTime);
                    setDuration(videoDuration);
                } catch (error) {
                    console.error("Error updating progress:", error);
                }
            }
        }, 250); // Update more frequently for smoother tracking
    };

    // Stop tracking progress
    const stopProgressTracking = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    // Handle manual progress application
    useEffect(() => {
        if (isPlaying && player && manualProgress !== null) {
            player.seekTo(manualProgress);
            setProgress(manualProgress);
            setManualProgress(null);
        }
    }, [isPlaying, player, manualProgress]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopProgressTracking();
        };
    }, []);

    const togglePlayPause = () => {
        if (!player || !isPlayerReady) return;
        
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    };

    const handleProgressMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingProgress(true);
        stopProgressTracking();
    };

    const handleProgressMouseUp = (e) => {
        e.preventDefault();
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, pos * duration));
        
        if (player && isPlayerReady) {
            if (isPlaying) {
                player.seekTo(newTime);
                setProgress(newTime);
                startProgressTracking(player);
            } else {
                setManualProgress(newTime);
                setProgress(newTime);
                // Also seek the player even when paused
                player.seekTo(newTime);
            }
        }
        setIsDraggingProgress(false);
    };

    const handleProgressMouseMove = (e) => {
        if (isDraggingProgress && progressRef.current) {
            const rect = progressRef.current.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = pos * duration;
            setProgress(newTime);
        }
    };

    const handleVolumeMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingVolume(true);
    };

    const handleVolumeMouseUp = (e) => {
        e.preventDefault();
        const rect = volumeRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newVolume = Math.round(pos * 100);
        
        if (player && isPlayerReady) {
            player.setVolume(newVolume);
            setVolume(newVolume);
        }
        setIsDraggingVolume(false);
    };

    const handleVolumeMouseMove = (e) => {
        if (isDraggingVolume && volumeRef.current) {
            const rect = volumeRef.current.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newVolume = Math.round(pos * 100);
            
            if (player && isPlayerReady) {
                player.setVolume(newVolume);
                setVolume(newVolume);
            }
        }
    };

    // Touch support for mobile devices
    const handleProgressTouchStart = (e) => {
        e.preventDefault();
        setIsDraggingProgress(true);
        stopProgressTracking();
    };

    const handleProgressTouchMove = (e) => {
        if (isDraggingProgress && progressRef.current) {
            const rect = progressRef.current.getBoundingClientRect();
            const touch = e.touches[0];
            const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            const newTime = pos * duration;
            setProgress(newTime);
        }
    };

    const handleProgressTouchEnd = (e) => {
        const rect = progressRef.current.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        
        if (player && isPlayerReady) {
            if (isPlaying) {
                player.seekTo(newTime);
                setProgress(newTime);
                startProgressTracking(player);
            } else {
                setManualProgress(newTime);
                setProgress(newTime);
                // Also seek the player even when paused
                player.seekTo(newTime);
            }
        }
        setIsDraggingProgress(false);
    };

    // Global mouse and touch event listeners
    useEffect(() => {
        const handleMouseUp = () => {
            if (isDraggingProgress) {
                setIsDraggingProgress(false);
                if (player && isPlaying && isPlayerReady) {
                    startProgressTracking(player);
                }
            }
            if (isDraggingVolume) {
                setIsDraggingVolume(false);
            }
        };
        
        const handleMouseMove = (e) => {
            if (isDraggingProgress) {
                handleProgressMouseMove(e);
            }
            if (isDraggingVolume) {
                handleVolumeMouseMove(e);
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDraggingProgress, isDraggingVolume, isPlaying, player, isPlayerReady]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const opts = {
        height: "0",
        width: "0",
        playerVars: {
            autoplay: 0, // Do not autoplay
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            enablejsapi: 1,
            playsinline: 1,
        },
    };
    return (
        <div className="relative w-full max-w-5xl mx-auto bg-gray-900 text-white p-8 rounded-xl shadow-2xl overflow-hidden">
            {track?.thumbnail && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-50"
                    style={{ backgroundImage: `url(${track.thumbnail})` }}
                />
            )}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-lg"></div>
            
            <div className="relative flex flex-col items-center space-y-5">
                <div className="flex items-center gap-5">
                    <img
                        src={track?.thumbnail || placeholder}
                        alt={track?.name || "No Track"}
                        className="w-32 h-32 md:w-50 md:h-40 rounded-lg shadow-lg"
                    />
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold">{track?.name || "No Track Selected"}</h2>
                        <p className="text-md md:text-xl text-gray-300">{track?.artist || "Unknown Artist"}</p>
                    </div>
                </div>
                
                {/* Play/Pause Controls */}
                <div className="flex items-center gap-6 mt-8">
                    <button 
                        onClick={() => {/* Previous track logic */}} 
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-300"
                        disabled={!isPlayerReady}
                    >
                        <SkipBack size={28} />
                    </button>
                    <button 
                        onClick={togglePlayPause} 
                        className="p-4 bg-blue-500 hover:bg-blue-400 rounded-full transition-colors duration-300"
                        disabled={!isPlayerReady}
                    >
                        {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                    </button>
                    <button 
                        onClick={() => {/* Next track logic */}} 
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-300"
                        disabled={!isPlayerReady}
                    >
                        <SkipForward size={24} />
                    </button>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full flex flex-col items-center space-y-2">
                    <div 
                        ref={progressRef}
                        className={`relative w-full h-2 bg-gray-700 rounded-full overflow-hidden ${isPlayerReady ? 'cursor-pointer' : 'cursor-not-allowed'} group`}
                        onMouseDown={isPlayerReady ? handleProgressMouseDown : undefined}
                        onMouseUp={isPlayerReady ? handleProgressMouseUp : undefined}
                        onTouchStart={isPlayerReady ? handleProgressTouchStart : undefined}
                        onTouchMove={isPlayerReady ? handleProgressTouchMove : undefined}
                        onTouchEnd={isPlayerReady ? handleProgressTouchEnd : undefined}
                    >
                        <div 
                            className="absolute h-full bg-blue-500 transition-transform duration-100 ease-out"
                            style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
                        ></div>
                        <div 
                            className={`absolute w-4 h-4 bg-white rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-md transition-opacity duration-300 ${isDraggingProgress ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'}`}
                            style={{ left: duration ? `${(progress / duration) * 100}%` : "0%" }}
                        ></div>
                    </div>
                    <div className="flex justify-between w-full text-sm text-gray-300">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
                
                {/* Volume Controls */}
                <div className="flex items-center gap-3 w-full max-w-xs">
                    <button 
                        onClick={() => {
                            const newVolume = volume === 0 ? 50 : 0;
                            if (player && isPlayerReady) player.setVolume(newVolume);
                            setVolume(newVolume);
                        }} 
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-300"
                        disabled={!isPlayerReady}
                    >
                        {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    
                    <div 
                        ref={volumeRef}
                        className={`relative w-full h-2 bg-gray-700 rounded-full overflow-hidden ${isPlayerReady ? 'cursor-pointer' : 'cursor-not-allowed'} group`}
                        onMouseDown={isPlayerReady ? handleVolumeMouseDown : undefined}
                        onMouseUp={isPlayerReady ? handleVolumeMouseUp : undefined}
                    >
                        <div 
                            className="absolute h-full bg-blue-500 transition-transform duration-100 ease-out"
                            style={{ width: `${volume}%` }}
                        ></div>
                        <div 
                            className={`absolute w-3 h-3 bg-white rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-md transition-opacity duration-300 ${isDraggingVolume ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'}`}
                            style={{ left: `${volume}%` }}
                        ></div>
                    </div>
                    
                    <span className="text-xs text-gray-300 w-8 text-right">{volume}%</span>
                </div>
                
                {/* YouTube Component (Hidden) */}
                <div className="hidden">
                    <YouTube
                        videoId={track?.id || ""}
                        opts={opts}
                        onReady={onPlayerReady}
                    />
                </div>
            </div>
        </div>
    );
}

export default MusicPlayer