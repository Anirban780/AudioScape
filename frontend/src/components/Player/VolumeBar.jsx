import React, { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";

/**
 * ============================================================================
 * VOLUME CONTROL BAR (VolumeBar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Interactive volume slider control displaying active volume level and scrubbing handle.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Primary Token & Zero Green: Replaced legacy `bg-green-500` fill with
 *    primary brand token `bg-[var(--color-primary)]`.
 * 2. Store Synchronization: Synchronizes master volume level from `usePlayerStore` directly
 *    to the YouTube iFrame API `player.setVolume(newVolume)`.
 * 
 * HOW IT WORKS:
 * - `handleChange`: Calculates volume percentage (0 to 100) from event clientX coordinates.
 * - Listens for mouse and touch drag events to dynamically adjust volume.
 */
const VolumeBar = React.forwardRef(({ volume = 80, setVolume, player, isReady }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleChange = (clientX) => {
        if (!ref.current || !player || !isReady) return;
        const rect = ref.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newVolume = Math.round(pos * 100);
        player.setVolume?.(newVolume);
        setVolume?.(newVolume);
    };

    useEffect(() => {
        if (player && isReady && typeof volume === 'number') {
            player.setVolume?.(volume);
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

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleTouchEnd);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isDragging, isReady, player, setVolume]);

    return (
        <div className="flex items-center gap-3 w-full max-w-xs mx-auto touch-none">
            <Volume2 size={16} className="text-[var(--color-on-surface-variant)] shrink-0" />
            <div
                ref={ref}
                className="relative h-1.5 bg-[var(--color-border-default)] rounded-full cursor-pointer flex-1 group py-1 -my-1"
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
                    className="absolute top-1 h-1.5 bg-[var(--color-primary)] rounded-full transition-all duration-75"
                    style={{ width: `${volume}%` }}
                />
                <div
                    className="absolute w-3.5 h-3.5 bg-white rounded-full top-0 shadow-md group-hover:scale-125 transition-transform duration-150 ease-in-out"
                    style={{ left: `${volume}%`, transform: 'translateX(-50%)' }}
                />
            </div>
        </div>
    );
});

export default VolumeBar;
