import React, { useState, useEffect } from "react";

const formatTime = (time) => {
    const minutes = Math.floor((time || 0) / 60);
    const seconds = Math.floor((time || 0) % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
};

const ProgressBar = React.forwardRef(({ progress, duration, player, isReady, setProgress }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleInteraction = (clientX, isEnd = false) => {
        if (!ref.current || !player || !isReady) return;
        const rect = ref.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = pos * duration;
        setProgress(newTime);
        if (isEnd) player.seekTo(newTime, true);
    };

    useEffect(() => {
        const onMove = (e) => isDragging && handleInteraction(e.clientX);
        const onUp = (e) => {
            if (isDragging) {
                handleInteraction(e.clientX, true);
                setIsDragging(false);
            }
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
    }, [isDragging]);

    return (
        <div className="space-y-2">
            <div
                ref={ref}
                className="relative h-1 bg-gray-800 rounded-full cursor-pointer group"
                onMouseDown={(e) => {
                    setIsDragging(true);
                    handleInteraction(e.clientX);
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
