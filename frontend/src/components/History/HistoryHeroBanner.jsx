import React, { useState, useEffect } from "react";
import { Play, Shuffle, Clock, Music, Disc3, Sparkles } from "lucide-react";
import { getHighResThumbnailUrl } from "@/utils/youtubeUtils";
import placeholder from "@/assets/placeholder.jpg";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * HISTORY HERO BANNER (HistoryHeroBanner.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the hero header for the History page, modeled after the playlist page banner.
 * Features:
 * - Ambient violet glowing orbs and atmospheric backdrop gradient
 * - Left column: Tagline badge, track count stat, gradient title, and 1-click Play All / Shuffle actions
 * - Right column: Interactive 3D artwork stack of the latest played songs with rotating vinyl disc effect
 */
const HistoryHeroBanner = ({
  tracks = [],
  trackCount = 0,
  onPlayAll,
  onShuffle,
}) => {
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();
  const [activeCardIdx, setActiveCardIdx] = useState(0);

  // Auto-cycle featured visual cards every 5s if multiple tracks exist
  useEffect(() => {
    if (!tracks || tracks.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCardIdx((prev) => (prev + 1) % Math.min(tracks.length, 3));
    }, 5000);
    return () => clearInterval(interval);
  }, [tracks]);

  // Preview tracks for visual stack (up to 3 tracks)
  const previewTracks = (tracks || []).slice(0, 3);
  const activeTrack = previewTracks[activeCardIdx] || previewTracks[0] || null;

  return (
    <div className="w-full mb-8 relative rounded-3xl overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xl select-none">
      {/* Ambient Atmospheric Violet & Purple Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-violet-600/20 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute -bottom-32 right-12 w-[360px] h-[360px] rounded-full bg-[var(--color-primary)]/15 blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />

      {/* Main Banner Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-6 sm:p-8 md:p-10 min-h-[260px]">
        {/* Left Column: Title, Stats & CTAs */}
        <div className="flex-1 flex flex-col items-start text-left w-full md:max-w-xl">
          {/* Top Pill Badges */}
          <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold tracking-wide shadow-xs">
              <Clock size={12} className="text-violet-400" />
              <span>LISTENING HISTORY</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-surface-base)]/60 border border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] text-xs font-semibold shadow-xs">
              <Music size={12} className="text-violet-400" />
              <span>{trackCount} {trackCount === 1 ? "Track" : "Tracks"} Played</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-[900] tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 drop-shadow-[0_2px_10px_rgba(139,92,246,0.3)]">
            Listen Again
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-6 max-w-md">
            Pick up where you left off. Replay your recent sessions, soundscapes, and favorite discoveries.
          </p>

          {/* CTA Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onPlayAll}
              disabled={trackCount === 0}
              className="px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-violet-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span>Play All</span>
            </button>

            <button
              type="button"
              onClick={onShuffle}
              disabled={trackCount === 0}
              className="px-5 py-2.5 rounded-full bg-[var(--color-surface-base)]/80 hover:bg-[var(--color-surface-base)] border border-[var(--color-border-strong)] text-[var(--color-on-surface)] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all hover:border-violet-500/40 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Shuffle size={15} className="text-violet-400" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visual 3D Artwork Stack */}
        {previewTracks.length > 0 && (
          <div className="hidden md:flex flex-1 justify-end items-center relative min-h-[200px] w-full">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center isolate">
              {[0, 1, 2].map((cardIdx) => {
                const slotIdx = (cardIdx + (3 - (activeCardIdx % 3))) % 3;
                const slot = [
                  {
                    className: "z-30 w-36 h-36 sm:w-44 sm:h-44 border-2 border-violet-500/70 shadow-[0_15px_35px_rgba(139,92,246,0.35)] translate-x-4 sm:translate-x-6 -translate-y-2 rotate-6 scale-[1.03] opacity-100",
                  },
                  {
                    className: "z-20 w-36 h-36 sm:w-44 sm:h-44 border border-white/20 shadow-[0_10px_25px_rgba(139,92,246,0.2)] -translate-x-2 sm:-translate-x-3 translate-y-3 -rotate-6 scale-[0.92] opacity-90",
                  },
                  {
                    className: "z-10 w-36 h-36 sm:w-44 sm:h-44 border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.25)] -translate-x-8 sm:-translate-x-12 -translate-y-4 sm:-translate-y-6 rotate-12 scale-[0.79] opacity-80",
                  }
                ][slotIdx];

                const track = previewTracks.length >= 3 
                    ? previewTracks[(activeCardIdx + slotIdx) % previewTracks.length] 
                    : previewTracks[cardIdx] || null;

                if (!track) return null;

                return (
                  <div
                    key={`history-card-${cardIdx}`}
                    className={`absolute rounded-2xl overflow-hidden bg-[var(--color-surface-raised)] transition-all duration-700 ease-in-out ${slot.className}`}
                  >
                    {track.thumbnail && !isImageDead(track.id || track.videoId) ? (
                      <img
                        src={getHighResThumbnailUrl(track.thumbnail, track.id || track.videoId) || track.thumbnail}
                        alt="Recent Track"
                        className="w-full h-full object-cover"
                        onLoad={(e) => handleImgLoad(e, track.id || track.videoId, track.id || track.videoId)}
                        onError={(e) => handleImgError(e, track.id || track.videoId, track.id || track.videoId)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-900/50 via-purple-900/30 to-[var(--color-surface-raised)] flex items-center justify-center">
                        <Music size={32} className="text-violet-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryHeroBanner;
