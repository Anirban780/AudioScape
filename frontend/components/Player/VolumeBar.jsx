import React, { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";

const VolumeBar = React.forwardRef(({ volume, setVolume, player, isReady }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleChange = (clientX) => {
        if (!ref.current || !player || !isReady) return;
        const rect = ref.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newVolume = Math.round(pos * 100);
        player.setVolume(newVolume);
        setVolume(newVolume);
    };

    useEffect(() => {
        if (player && isReady) {
            player.setVolume(volume);
        }
    }, [player, isReady, volume]);

    useEffect(() => {
        const handleMouseMove = (e) => isDragging && handleChange(e.clientX);
        const handleMouseUp = () => setIsDragging(false);
        const handleTouchMove = (e) => {
            if (isDragging && e.touches.length > 0) {
                handleChange(e.touches[0].clientX);
            }
        };
        const handleTouchEnd = () => setIsDragging(false);

        // Add event listeners for dragging
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleTouchEnd);
        }

        // Cleanup event listeners when dragging stops
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isDragging]);

    return (
        <div className="flex items-center gap-3 max-w-xs mx-auto touch-none">
            <Volume2 size={16} className="text-gray-400" />
            <div
                ref={ref}
                className="relative h-1 bg-gray-800 rounded-full cursor-pointer flex-1 group"
                onMouseDown={(e) => {
                    setIsDragging(true);
                    handleChange(e.clientX);
                }}
                onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                        setIsDragging(true);
                        handleChange(e.touches[0].clientX);
                    }
                }}
            >
                <div
                    className="absolute h-full bg-green-500 rounded-full transition-all duration-75"
                    style={{ width: `${volume}%` }}
                />
                <div
                    className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow-md group-hover:scale-125 transition-transform duration-150 ease-in-out"
                    style={{ left: `${volume}%`, transform: 'translateX(-50%)' }}
                />
            </div>
        </div>
    );
});

export default VolumeBar;
