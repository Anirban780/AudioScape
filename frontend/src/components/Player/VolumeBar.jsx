import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Volume1, Plus, Minus } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";

/**
 * ============================================================================
 * VOLUME CONTROL BAR (VolumeBar.jsx)
 * ============================================================================
 * 
 * FIXES APPLIED:
 * 1. Added `+` and `-` Step Buttons: Increments and decrements volume by 5 points per click,
 *    synced directly with Zustand store (`usePlayerStore`) and YouTube iFrame player.
 * 2. Centered Handle Knob: Positioned white knob along center track line axis
 *    using `calc(${displayVolume}% - 10px)` for vertical and `calc(${displayVolume}% - 8px)` for horizontal.
 * 3. Bigger Vertical Volume Rail: Scaled track height up to `h-36 sm:h-40` and width to `w-3`.
 */
const VolumeBar = React.forwardRef(({ volume = 80, setVolume, player, isReady, vertical = false, hideMuteButton = false }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const internalRef = useRef(null);
  const sliderRef = ref || internalRef;
  const { isMuted, toggleMute, increaseVolume, decreaseVolume } = usePlayerStore();

  const handleStepUp = () => {
    if (typeof increaseVolume === "function") {
      increaseVolume(5);
    } else {
      setVolume?.(Math.min(100, (volume || 80) + 5));
    }
  };

  const handleStepDown = () => {
    if (typeof decreaseVolume === "function") {
      decreaseVolume(5);
    } else {
      setVolume?.(Math.max(0, (volume || 80) - 5));
    }
  };

  const handleChange = (e) => {
    if (!sliderRef?.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let pos = 0;

    if (vertical) {
      const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
      pos = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    } else {
      const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
      pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    const newVolume = Math.round(pos * 100);
    setVolume?.(newVolume);
  };

  useEffect(() => {
    const handleMove = (e) => isDragging && handleChange(e);
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, setVolume, vertical]);

  const displayVolume = isMuted ? 0 : volume;

  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-2 select-none touch-none py-1 px-1">
        {!hideMuteButton && (
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] transition-colors shrink-0 cursor-pointer mb-1"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
            aria-label={isMuted ? "Unmute volume" : "Mute volume"}
          >
            {isMuted || displayVolume === 0 ? (
              <VolumeX size={16} className="text-red-400" />
            ) : displayVolume < 40 ? (
              <Volume1 size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
        )}

        {/* PLUS BUTTON (+5 points) */}
        <button
          onClick={handleStepUp}
          className="p-1.5 rounded-lg bg-[var(--color-surface-overlay)]/80 border border-[var(--color-border-default)]/60 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]/40 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Increase volume by 5%"
          aria-label="Increase volume by 5%"
        >
          <Plus size={13} />
        </button>

        {/* BIGGER VERTICAL VOLUME SLIDER TRACK */}
        <div
          ref={sliderRef}
          className="relative w-3 h-32 sm:h-36 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)]/60 rounded-full cursor-pointer group shadow-inner flex items-center justify-center my-1"
          onMouseDown={(e) => {
            setIsDragging(true);
            handleChange(e);
          }}
          onTouchStart={(e) => {
            setIsDragging(true);
            handleChange(e);
          }}
        >
          {/* Active Gradient Fill Bar */}
          <div
            className="absolute bottom-0.5 left-0.5 right-0.5 bg-gradient-to-t from-[var(--color-primary)] to-[#c084fc] rounded-full transition-all duration-75 shadow-[0_0_10px_var(--color-primary)]"
            style={{ height: `calc(${displayVolume}% - 4px)` }}
          />

          {/* PERFECTLY CENTERED HANDLE KNOB */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-4 sm:w-5 h-4 sm:h-5 bg-white border-2 border-[var(--color-primary)] rounded-full shadow-md group-hover:scale-125 transition-transform duration-150 ease-out pointer-events-none z-10"
            style={{ bottom: `calc(${displayVolume}% - 10px)` }}
          />
        </div>

        {/* MINUS BUTTON (-5 points) */}
        <button
          onClick={handleStepDown}
          className="p-1.5 rounded-lg bg-[var(--color-surface-overlay)]/80 border border-[var(--color-border-default)]/60 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]/40 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Decrease volume by 5%"
          aria-label="Decrease volume by 5%"
        >
          <Minus size={13} />
        </button>

        {/* Percentage Readout Label */}
        <span className="text-[11px] font-mono font-extrabold text-[var(--color-on-surface-variant)] text-center tracking-tight mt-0.5">
          {displayVolume}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto touch-none select-none">
      {!hideMuteButton && (
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] transition-colors shrink-0 cursor-pointer"
          title={isMuted ? "Unmute (M)" : "Mute (M)"}
          aria-label={isMuted ? "Unmute volume" : "Mute volume"}
        >
          {isMuted || displayVolume === 0 ? (
            <VolumeX size={16} className="text-red-400" />
          ) : displayVolume < 40 ? (
            <Volume1 size={16} />
          ) : (
            <Volume2 size={16} />
          )}
        </button>
      )}

      {/* MINUS BUTTON (-5 points) */}
      <button
        onClick={handleStepDown}
        className="p-1.5 rounded-lg bg-[var(--color-surface-overlay)]/80 border border-[var(--color-border-default)]/60 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
        title="Decrease volume by 5%"
        aria-label="Decrease volume by 5%"
      >
        <Minus size={12} />
      </button>

      {/* HORIZONTAL VOLUME SLIDER TRACK */}
      <div
        ref={sliderRef}
        className="relative h-2.5 bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)]/60 rounded-full cursor-pointer flex-1 group py-1.5 -my-1.5 shadow-inner"
        onMouseDown={(e) => {
          setIsDragging(true);
          handleChange(e);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleChange(e);
        }}
      >
        <div
          className="absolute top-0.5 bottom-0.5 left-0.5 bg-gradient-to-r from-[var(--color-primary)] to-[#c084fc] rounded-full transition-all duration-75 shadow-[0_0_8px_var(--color-primary)]"
          style={{ width: `calc(${displayVolume}% - 4px)` }}
        />

        {/* PERFECTLY CENTERED HANDLE KNOB */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[var(--color-primary)] rounded-full shadow-md group-hover:scale-125 transition-transform duration-150 ease-out pointer-events-none z-10"
          style={{ left: `calc(${displayVolume}% - 8px)` }}
        />
      </div>

      {/* PLUS BUTTON (+5 points) */}
      <button
        onClick={handleStepUp}
        className="p-1.5 rounded-lg bg-[var(--color-surface-overlay)]/80 border border-[var(--color-border-default)]/60 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
        title="Increase volume by 5%"
        aria-label="Increase volume by 5%"
      >
        <Plus size={12} />
      </button>

      <span className="text-[10px] font-mono font-bold text-[var(--color-on-surface-variant)] w-7 text-right shrink-0">
        {displayVolume}%
      </span>
    </div>
  );
});

export default VolumeBar;
