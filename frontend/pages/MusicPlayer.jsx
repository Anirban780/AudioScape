import React, { useEffect, useRef, useState } from "react";
import {
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import placeholder from "../assets/placeholder.jpg";
import { Button } from "@/components/ui/button";


const MusicPlayer = ({ track }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(50);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (track && audioRef.current) {
            audioRef.current.src = track.preview_url;
            audioRef.current.volume = volume / 100;
            audioRef.current.play().catch((err) => console.error("Playback Error:", err));
            setIsPlaying(true);
        }
    }, [track]);


    const togglePlayPause = () => {
        if (!track || !audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch((err) => console.error("Playback Error:", err));
        }

        setIsPlaying(!isPlaying);
    };

    const handleProgressChange = (e) => {
        if (!audioRef.current) return;

        const newTime = (e.target.value / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setProgress(e.target.value);
    };

    const handleVolumeChange = (e) => {
        if (!audioRef.current) return;

        const newVolume = e.target.value;
        audioRef.current.volume = newVolume / 100;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;

        const newProgress =
            (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(newProgress);
    };


    return (
        <Card className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex items-center justify-between">
            <CardContent className="flex items-center gap-4 w-full">
                {/* Track Info */}
                {track ? (
                    <>
                        <img
                            src={track.albumArt || placeholder}
                            alt={track.name}
                            className="w-16 h-16 rounded-md"
                        />
                        <div>
                            <p className="text-lg font-semibold">{track.name}</p>
                            <p className="text-sm text-gray-400">{track.artist}</p>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-400">No Track selected</p>
                )}

                {/* Playback Controls */}
                <div className="flex gap-4 items-center mx-auto">
                    <SkipBack size={20} className="cursor-pointer text-gray-400 hover:text-white" />

                    <Button onClick={togglePlayPause} className="p-2 bg-green-500 rounded-full">
                        {isPlaying ? (
                            <Pause size={20} className="text-white" />
                        ) : (
                            <Play size={20} className="text-white" />
                        )}
                    </Button>

                    <SkipForward size={20} className="cursor-pointer text-gray-400 hover:text-white" />
                </div>

                {/* Seek Bar */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleProgressChange}
                    className="w-40 md:w-60 cursor-pointer"
                />

                {/* Volume Controls */}
                <div className="flex gap-2 items-center">
                    <Button onClick={() => handleVolumeChange({ target: { value: isMuted ? volume : 0 } })}>
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </Button>

                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-24 md:w-32 cursor-pointer"
                    />
                </div>
            </CardContent>

            {/* Audio Element */}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
            />
        </Card>
    );
};

export default MusicPlayer;
