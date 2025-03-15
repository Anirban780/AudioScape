import React, { useEffect, useState } from 'react'
import YouTube from 'react-youtube';
import placeholder from "../../assets/placeholder.jpg"
import { Button } from '../../../utils/components/ui/button';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

const MusicPlayer = ({ track }) => {
    const [player, setPlayer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (player && track?.id) {
            player.loadVideoById(track.id);
            player.playVideo();
            setIsPlaying(true);
        }

    }, [track, player]);

    //Youtube Player Options
    const opts = {
        height: "0",
        width: "0",
        playerVars: {
            autoplay: 1, // Auto-play when loaded
            controls: 0, // Hide YouTube controls
            modestbranding: 1, // Minimal branding
            rel: 0, // Prevent related videos
            showinfo: 0,
        },
    }

    // Play/Pause Toggle
    const togglePlay = () => {
        if (player) {
            if (isPlaying) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
            setIsPlaying(!isPlaying);
        }
    };


    return (
        <div className='relative mt-6 p-6 max-w-[500px] h-40 rounded-lg flex items-center bg-gray-300 dark:bg-gray-800 transition-all duration-300'>

            {/* Hidden YouTube Player */}
            <YouTube
                videoId={track?.id || ""}
                opts={opts}
                onReady={(event) => setPlayer(event.target)}
            />

            {/* Track Info */}
            <div className='flex items-center justify-center space-x-4'>
                <img
                    src={track?.thumbnail || placeholder}
                    alt="Music Track"
                    className='w-12 h-12 rounded-md'
                />

                <div className='flex-1'>
                    <h4 className='text-lg font-semibold'>{track?.name}</h4>
                    <p className='text-sm text-gray-700'>{track?.artist}</p>
                </div>

                {/* Controls */}
                <div className='flex items-center space-x-4'>
                    <Button className='flex items-center bg-gray-600 space-x-4'>
                        <SkipBack size={24} />
                    </Button>

                    <Button
                        className='bg-green-500 p-3 rounded-full'
                        onClick={togglePlay}
                    >
                        {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                    </Button>

                    <Button className='bg-gray-600'>
                        <SkipForward size={24} />
                    </Button>
                </div>
            </div>


        </div>
    )
}

export default MusicPlayer