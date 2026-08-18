import React, { useState, useEffect, useRef } from "react";

/**
 * ============================================================================
 * PROGRESS BAR TRACK SEEKER (ProgressBar.jsx)
 * ============================================================================
 * 
 * FIXES APPLIED:
 * 1. Simple & Larger Timer Typography: Timestamps use simple `font-body font-semibold text-sm`
 *    for clear readability.
 * 2. Scrub Handle Centering: Scrub handle knob sits perfectly ALONG the center axis of the bar line.
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
    if (isEnd && typeof player.seekTo === "function") {
      player.seekTo(newTime, true);
    }
  };

  const handleKeyDown = (e) => {
    if (!player || !isReady || !duration) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const newTime = Math.min(duration, (progress || 0) + 5);
      setProgress(newTime);
      player.seekTo?.(newTime, true);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const newTime = Math.max(0, (progress || 0) - 5);
      setProgress(newTime);
      player.seekTo?.(newTime, true);
    }
  };

  useEffect(() => {
    const onMove = (e) => isDragging && handleInteraction(e.clientX || e.touches?.[0]?.clientX);
    const onUp = (e) => {
      if (isDragging) {
        handleInteraction(e.clientX || e.changedTouches?.[0]?.clientX, true);
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

  const percentage = duration > 0 ? Math.min(100, Math.max(0, ((progress || 0) / duration) * 100)) : 0;

  return (
    <div className="w-full flex flex-col gap-1.5 select-none py-1">
      {/* Simple & Larger Timestamps Header Row */}
      <div className="flex justify-between items-center text-sm font-body font-semibold tracking-wide text-[var(--color-on-surface-variant)] px-0.5">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Track Seeker Rail Container */}
      <div
        ref={(node) => {
          localRef.current = node;
          if (typeof ref === "function") ref(node);
        }}
        role="slider"
        aria-label="Seek track position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(progress || 0)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative w-full h-2.5 flex items-center bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)]/60 rounded-full cursor-pointer group transition-all duration-150 shadow-inner focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        onMouseDown={(e) => {
          setIsDragging(true);
          handleInteraction(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleInteraction(e.touches[0].clientX);
        }}
      >
        {/* Active Filled Glowing Progress Line */}
        <div
          className="h-full bg-gradient-to-r from-[var(--color-primary)] via-[#c084fc] to-[var(--color-secondary)] rounded-full transition-all duration-75 shadow-[0_0_10px_var(--color-primary)]"
          style={{ width: `${percentage}%` }}
        />

        {/* Scrub Handle Knob (Perfectly Centered Along the Bar Track Line) */}
        <div
          className="absolute w-3.5 h-3.5 bg-white border-2 border-[var(--color-primary)] rounded-full shadow-md group-hover:scale-125 transition-all duration-150 ease-out opacity-80 group-hover:opacity-100"
          style={{
            left: `${percentage}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: isDragging ? 1 : undefined,
          }}
        />
      </div>
    </div>
  );
});

export default ProgressBar;
