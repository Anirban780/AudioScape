import React, { useState, useEffect, useRef } from "react";

const formatTime = (time) => {
    const minutes = Math.floor((time || 0) / 60);
    const seconds = Math.floor((time || 0) % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
};

const ProgressBar = React.forwardRef(({ progress, duration, player, isReady, setProgress }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const localRef = useRef(null); // This local ref will track the div where the progress bar is rendered

    const handleInteraction = (clientX, isEnd = false) => {
        if (!localRef.current || !player || !isReady || !duration) return;
        const rect = localRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        setProgress(newTime);
        if (isEnd) player.seekTo(newTime, true);
    };

    useEffect(() => {
        const onMove = (e) => isDragging && handleInteraction(e.clientX || e.touches[0].clientX); // Use touch if available
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

        // Cleanup the event listeners when the component unmounts
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("touchend", onUp);
        };
    }, [isDragging]);

    return (
        <div className="space-y-2">
            <div
                ref={(node) => { 
                    localRef.current = node; // Attach the ref here
                    if (typeof ref === 'function') ref(node); // Pass to parent ref if needed
                }}
                className="relative h-1 bg-gray-800 rounded-full cursor-pointer group"
                onMouseDown={(e) => {
                    setIsDragging(true);
                    handleInteraction(e.clientX);
                }}
                onTouchStart={(e) => {
                    setIsDragging(true);
                    handleInteraction(e.touches[0].clientX);
                }}
            >
                <div className="absolute h-full bg-green-500 rounded-full" style={{ width: `${(progress / duration) * 100}%` }} />
                <div
                    className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow-md group-hover:scale-125 transition"
                    style={{
                        left: `${(progress / duration) * 100}%`,
                        transform: 'translateX(-50%)',
                        opacity: isDragging || progress > 0 ? 1 : 0,
                    }}
                />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
});

export default ProgressBar;
