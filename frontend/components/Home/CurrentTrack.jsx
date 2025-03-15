import React from 'react';
import { Button } from 'utils/components/ui/button';
import { Play } from 'lucide-react';
import placeholder from '../../assets/placeholder.jpg';

const CurrentTrack = ({ track, onPlay }) => {
    if (!track) return null;

    return (
        <div className='mt-6 p-6 max-w-[500px] rounded-lg flex items-center bg-gray-300 dark:bg-gray-800 transition-all duration-300'>

            {/* Thumbnail */}
            <img
                src={track.thumbnail || placeholder}
                alt="Thumbnail"
                className='w-24 h-24 rounded-md mr-6'
            />

            {/* Track Details */}
            <div className='flex-1'>
                <h3 className='text-xl font-semibold'>{track.name}</h3>
                <p className='text-md text-gray-500'>{track.artist}</p>
            </div>

        </div>
    );
};

export default CurrentTrack;
