import React, { useState, useEffect } from "react";
import placeholder from "@/assets/placeholder.jpg";
import { Play, Sparkles, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { getHighResThumbnailUrl, getNextFallbackThumbnailUrl } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * FAVORITES HERO BANNER (FavoritesHeroBanner.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a full-width high-definition spotlight hero banner for the Favorites page.
 * It features a multi-track carousel of the user's top favorite tracks with a 
 * smooth vertical slow-pan image animation, pink/rose gradient overlays, badges, 
 * and Play All / Shuffle CTA buttons.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Automatic Vertical Slow-Pan Animation (`animate-pan-vertical`):
 *    When a banner slide displays, the background image automatically pans smoothly
 *    from top to bottom (`center 5%` -> `center 95%`) over 12 seconds.
 * 2. Premium Tactile Feel: Creates an immersive, cinematic experience for the user's favorites.
 * 
 * PROPS:
 * - tracks: Array of favorite tracks to display in the carousel (usually top 5)
 * - onPlayAll: Function to trigger playback of all favorites
 * - onShuffle: Function to trigger shuffled playback of all favorites
 * - trackCount: Total number of favorite tracks
 */
const FavoritesHeroBanner = ({
  tracks = [],
  onPlayAll,
  onShuffle,
  trackCount = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate slides every 6 seconds
  useEffect(() => {
    if (tracks.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [tracks.length]);

  if (tracks.length === 0) {
    return null;
  }

  const activeTrack = tracks[currentIndex];
  const trackId = activeTrack.id || activeTrack.videoId;
  const trackName = activeTrack.name || activeTrack.title || "Unknown Title";
  const artistName = activeTrack.artist || activeTrack.channelTitle || "Unknown Artist";

  const rawArtwork = activeTrack.thumbnail || activeTrack.thumbNail;
  const artwork = getHighResThumbnailUrl(rawArtwork, trackId) || placeholder;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  };

  return (
    <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
      
      {/* 1. Full-Width HD Background Artwork Image with Automatic Vertical Slow-Pan */}
      <img
        key={`${trackId}-${currentIndex}`}
        src={artwork}
        alt={trackName}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = getNextFallbackThumbnailUrl(e.target.src, trackId, placeholder);
        }}
        className="absolute inset-0 w-full h-full object-cover blur-[1px] transition-all duration-700 pointer-events-none animate-pan-vertical"
      />

      {/* 2. Gradient Overlays for Optimal Legibility & Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* 3. Hero Content Container */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
        
        {/* Top Badges */}
        <div>
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-xs">
              ♥ YOUR #{currentIndex + 1}
            </span>
            <span className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full border border-white/25 backdrop-blur-xs">
              <Sparkles size={12} /> FAVOURITES
            </span>
          </div>

          {/* Track Title & Artist */}
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {trackName}
          </h2>
          <p className="text-sm sm:text-base text-slate-200 line-clamp-1 font-medium max-w-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            by <span className="text-white font-bold">{artistName}</span>
          </p>
          <p className="text-xs text-slate-300 mt-2">
            {trackCount} tracks in your collection
          </p>
        </div>

        {/* Bottom CTA & Carousel Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
          
          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayAll}
              className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2.5 cursor-pointer"
            >
              <Play size={17} fill="currentColor" className="ml-0.5" />
              <span>PLAY ALL</span>
            </button>
            <button
              onClick={onShuffle}
              className="bg-black/40 backdrop-blur-md border border-white/20 text-white px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:bg-white/10 hover:border-white/40 transition-all shadow-md flex items-center gap-2.5 cursor-pointer"
            >
              <Shuffle size={17} className="ml-0.5" />
              <span>SHUFFLE</span>
            </button>
          </div>

          {/* Carousel Navigation (Dots & Arrows) */}
          {tracks.length > 1 && (
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg text-white mt-4 sm:mt-0">
              <button
                onClick={handlePrev}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Previous track"
                aria-label="Previous track"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {tracks.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex
                        ? "w-6 bg-[var(--color-primary)]"
                        : "w-2 bg-white/40 hover:bg-white"
                    }`}
                    title={`Go to slide ${idx + 1}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
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

export default FavoritesHeroBanner;
