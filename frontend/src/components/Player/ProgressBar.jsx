import React, { useState, useEffect, useRef } from "react";

/**
 * ============================================================================
 * PROGRESS BAR TRACK SEEKER (ProgressBar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Interactive progress bar slider displaying track elapsed time, total duration,
 * active fill track, and scrub handle for audio seeking.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Primary Token & Zero Green: Replaced legacy `bg-green-500` fill with
 *    primary brand token `bg-[var(--color-primary)]`.
 * 2. Touch & Mouse Support: Implements drag-seeking listeners supporting both
 *    mouse clicks (`onMouseDown`) and touch events (`onTouchStart`).
 * 
 * HOW IT WORKS:
 * - `handleInteraction`: Calculates scrub position percentage from event clientX relative
 *   to bounding rect, updates `progress` state, and calls `player.seekTo()` on release.
 * - Formats time in MM:SS via `formatTime` helper.
 */
const formatTime = (time) => {
    const minutes = Math.floor((time || 0) / 60);
    const seconds = Math.floor((time || 0) % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
};

const ProgressBar = React.forwardRef(({ progress, duration, player, isReady, setProgress }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const localRef = useRef(null);

    const handleInteraction = (clientX, isEnd = false) => {
        if (!localRef.current || !player || !isReady || !duration) return;
        const rect = localRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        setProgress(newTime);
        if (isEnd) player.seekTo(newTime, true);
    };

    useEffect(() => {
        const onMove = (e) => isDragging && handleInteraction(e.clientX || e.touches[0].clientX);
        const onUp = (e) => {
            if (isDragging) {
                handleInteraction(e.clientX || e.changedTouches[0].clientX, true);
                setIsDragging(false);
            }
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchmove", onMove);
        document.addEventListener("touchend", onUp);

        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("touchend", onUp);
        };
    }, [isDragging, duration, isReady, player, setProgress]);

    const percentage = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

    return (
        <div className="space-y-1.5 w-full">
            {/* Clickable Track Bar */}
            <div
                ref={(node) => { 
                    localRef.current = node;
                    if (typeof ref === 'function') ref(node);
                }}
                className="relative h-1.5 bg-[var(--color-border-default)] rounded-full cursor-pointer group py-1 -my-1"
                onMouseDown={(e) => {
                    setIsDragging(true);
                    handleInteraction(e.clientX);
                }}
                onTouchStart={(e) => {
                    setIsDragging(true);
                    handleInteraction(e.touches[0].clientX);
                }}
            >
                {/* Active Filled Progress Bar */}
                <div 
                    className="absolute top-1 h-1.5 bg-[var(--color-primary)] rounded-full transition-all duration-100" 
                    style={{ width: `${percentage}%` }} 
                />
                
                {/* Draggable Handle Thumb */}
                <div
                    className="absolute w-3.5 h-3.5 bg-white rounded-full top-0 shadow-md group-hover:scale-125 transition-transform"
                    style={{
                        left: `${percentage}%`,
                        transform: 'translateX(-50%)',
                        opacity: isDragging || percentage > 0 ? 1 : 0,
                    }}
                />
            </div>

            {/* Time Indicators */}
            <div className="flex justify-between text-xs text-[var(--color-on-surface-variant)] font-medium">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
});

export default ProgressBar;
