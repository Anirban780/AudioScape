import React, { useState, useEffect } from "react";
import placeholder from "@/assets/placeholder.jpg";
import { Play, Flame, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { getHighResThumbnailUrl, getNextFallbackThumbnailUrl } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * EXPLORE TRENDING SPOTLIGHT HERO BANNER (ExploreTrendingBanner.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a full-width high-definition spotlight hero banner with a multi-track
 * carousel, smooth vertical slow-pan image animation, gradient overlays, badges, and CTA.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Automatic Vertical Slow-Pan Animation (`animate-pan-vertical`):
 *    When a banner slide displays, the background image automatically pans smoothly
 *    from top to bottom (`center 5%` -> `center 95%`) over 12 seconds.
 * 2. Remounting Animation Key: `key={`${trackId}-${currentIndex}`}` restarts the slow-pan
 *    animation seamlessly every time the banner transitions to the next track.
 * 3. Declarative Fallback Pipeline: Uses `getNextFallbackThumbnailUrl` helper instead
 *    of nested if/else statements in rendering for clean functional architecture.
 * 
 * HOW IT WORKS:
 * - `enablePanAnimation`: Enables automatic top-to-bottom slow pan animation (default `true`).
 * - Auto-rotates active slide index every 6 seconds.
 */

const ExploreTrendingBanner = ({
  trendingTracks = [],
  featuredTrack = null,
  activeCategory = "All",
  loading = false,
  enablePanAnimation = true, // Enables smooth vertical top-to-bottom pan animation
  imageObjectPosition = "center center",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Declarative track list normalization
  const trackList = Array.isArray(trendingTracks) && trendingTracks.length > 0
    ? trendingTracks
    : featuredTrack
    ? [featuredTrack]
    : [];

  // Reset carousel index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeCategory, trackList.length]);

  // Auto-rotate slides every 6 seconds
  useEffect(() => {
    if (trackList.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trackList.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [trackList.length]);

  if (loading) {
    return (
      <div className="w-full h-[280px] sm:h-[350px] rounded-[32px] mb-8 overflow-hidden">
        <Skeleton className="w-full h-full bg-[var(--color-surface-raised)]" />
      </div>
    );
  }

  if (trackList.length === 0) {
    return null;
  }

  const activeTrack = trackList[currentIndex] || trackList[0];

  const trackId = activeTrack.id || activeTrack.videoId;
  const trackName = activeTrack.name || activeTrack.title || "Featured Track";
  const artistName = activeTrack.artist || activeTrack.channelTitle || "Top Artist";
  const categoryTag = activeTrack.categoryName || activeCategory;

  const rawArtwork = activeTrack.thumbnail || activeTrack.thumbNail;
  const artwork = getHighResThumbnailUrl(rawArtwork, trackId) || placeholder;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + trackList.length) % trackList.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % trackList.length);
  };

  const handlePlayTrack = () => {
    usePlayerStore.getState().setTrack({
      id: trackId,
      name: trackName,
      artist: artistName,
      thumbnail: artwork,
    });
    usePlayerStore.getState().setIsPlaying(true);
    toast.success(`Playing: ${trackName}`);
  };

  return (
    <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
      
      {/* 1. Full-Width HD Background Artwork Image with Automatic Vertical Slow-Pan */}
      <img
        key={`${trackId}-${currentIndex}`}
        src={artwork}
        alt={trackName}
        style={{ objectPosition: enablePanAnimation ? undefined : imageObjectPosition }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = getNextFallbackThumbnailUrl(e.target.src, trackId, placeholder);
        }}
        className={`absolute inset-0 w-full h-full object-cover opacity-95 dark:opacity-90 transition-all duration-700 pointer-events-none ${
          enablePanAnimation ? "animate-pan-vertical" : ""
        }`}
      />

      {/* 2. Left-Side Gradient Mask for Text Legibility (Keeps Artwork Crisp & Saturated) */}
      <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-[var(--color-surface-raised)] via-[var(--color-surface-raised)]/85 to-transparent pointer-events-none z-0" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--color-surface-raised)]/90 via-transparent to-transparent pointer-events-none z-0 md:hidden" />

      {/* 3. Hero Content Container */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
        
        {/* Top Badges */}
        <div>
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-xs">
              <Flame size={13} /> TRENDING #{currentIndex + 1}
            </span>
            <span className="text-[11px] font-bold text-[var(--color-primary)] tracking-wider uppercase flex items-center gap-1 bg-[var(--color-primary)]/15 px-3 py-1 rounded-full border border-[var(--color-primary)]/30 backdrop-blur-xs">
              <Sparkles size={12} /> {categoryTag !== "All" ? categoryTag : "SPOTLIGHT MIX"}
            </span>
          </div>

          {/* Track Title & Artist */}
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-on-surface)] leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-md">
            {trackName}
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-on-surface-variant)] line-clamp-1 font-medium max-w-lg drop-shadow-xs">
            Immerse yourself in today's spotlight track by <span className="text-[var(--color-on-surface)] font-semibold">{artistName}</span>.
          </p>
        </div>

        {/* Bottom CTA & Carousel Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
          
          {/* CTA Play Button */}
          <button
            onClick={handlePlayTrack}
            className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2.5 cursor-pointer"
          >
            <Play size={17} fill="currentColor" className="ml-0.5" />
            <span>START LISTENING</span>
          </button>

          {/* Carousel Navigation (Dots & Arrows) */}
          {trackList.length > 1 && (
            <div className="flex items-center gap-3 bg-[var(--color-surface-overlay)]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--color-border-default)] shadow-md">
              <button
                onClick={handlePrev}
                className="p-1 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
                title="Previous track"
                aria-label="Previous track"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {trackList.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex
                        ? "w-6 bg-[var(--color-primary)]"
                        : "w-2 bg-[var(--color-on-surface-variant)]/40 hover:bg-[var(--color-on-surface-variant)]"
                    }`}
                    title={`Go to slide ${idx + 1}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-1 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
                title="Next track"
                aria-label="Next track"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExploreTrendingBanner;
