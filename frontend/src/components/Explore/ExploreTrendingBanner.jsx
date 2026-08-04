import React from "react";
import placeholder from "@/assets/placeholder.jpg";
import { Play, Flame, Sparkles } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * EXPLORE TRENDING SPOTLIGHT HERO BANNER (ExploreTrendingBanner.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a wide glassmorphic discovery banner highlighting the top trending song
 * with full-width artwork, gradient overlays, pill badges, and one-click play CTA.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Discovery Banner: Matches the trending hero banner from Stitch Explore screens
 *    (`6aaba54d100944a28329f65c95eb684f` and `3c52c41b3d7e40b89b4e98157e63aaae`).
 * 2. Uncropped Ambient Backdrop: Full-width background image with center object positioning
 *    and smooth gradient fade to ensure readable typography.
 * 3. Loading Skeleton: Gracefully renders a high-contrast skeleton container while fetching data.
 * 
 * HOW IT WORKS:
 * - Accepts `featuredTrack` object (`id`, `name`, `title`, `artist`, `thumbnail`).
 * - Clicking "START LISTENING" sets active track in `usePlayerStore` and triggers audio.
 */

const ExploreTrendingBanner = ({ featuredTrack, loading }) => {
  if (loading) {
    return (
      <div className="w-full h-[260px] sm:h-[300px] rounded-[32px] mb-10 overflow-hidden">
        <Skeleton className="w-full h-full bg-[var(--color-surface-raised)]" />
      </div>
    );
  }

  if (!featuredTrack) {
    return null;
  }

  const trackName = featuredTrack.name || featuredTrack.title || "Featured Soundscape";
  const artistName = featuredTrack.artist || featuredTrack.channelTitle || "Top Artist";
  const artwork = featuredTrack.thumbnail || featuredTrack.thumbNail || placeholder;

  return (
    <div className="relative w-full h-[280px] sm:h-[320px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-10 group bg-[var(--color-surface-raised)] flex items-center">
      {/* Background Artwork Image */}
      <img
        src={artwork}
        alt={trackName}
        className="absolute inset-0 w-full h-full object-cover object-center opacity-45 group-hover:scale-105 transition-all duration-700 pointer-events-none"
      />

      {/* Backdrop Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-surface-base)] via-[var(--color-surface-base)]/75 to-transparent pointer-events-none" />

      {/* Content Box */}
      <div className="relative h-full flex flex-col justify-center p-6 sm:p-10 md:w-3/5 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold text-[10px] tracking-widest uppercase">
            <Flame size={12} /> TRENDING #1
          </span>
          <span className="text-[10px] font-bold text-[var(--color-primary)] tracking-widest uppercase flex items-center gap-1">
            <Sparkles size={11} /> DISCOVERY SPOTLIGHT
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-on-surface)] leading-tight mb-2 line-clamp-1">
          {trackName}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] mb-6 max-w-md line-clamp-2 leading-relaxed">
          Immerse yourself in today's top trending soundscape. Performed by {artistName}.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              usePlayerStore.getState().setTrack({
                id: featuredTrack.id || featuredTrack.videoId,
                name: trackName,
                artist: artistName,
                thumbnail: artwork,
              });
              usePlayerStore.getState().setIsPlaying(true);
              toast.success(`Playing: ${trackName}`);
            }}
            className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-8 py-3 rounded-full font-bold text-xs tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Play size={16} fill="currentColor" /> START LISTENING
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExploreTrendingBanner;
