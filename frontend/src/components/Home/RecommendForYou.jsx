import React, { useEffect, useState } from "react";
import { getRecommendations } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Play, Sparkles, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import MusicCard from "@/components/Cards/MusicCard";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * AI RECOMMENDATIONS & AUTO-ROTATING DAILY MIX BANNER (RecommendForYou.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders personalized AI music recommendations featuring:
 * 1. Auto-Rotating Daily Mix Banner Carousel: Wide high-contrast glassmorphic
 *    banner (`340px rounded-[32px]`) that automatically rotates through the top 5
 *    AI recommended tracks every 5 seconds with crossfade transitions and manual
 *    slide indicator controls.
 * 2. Full-Width Background Artwork: Full-width background image with optimal
 *    center positioning (`object-cover object-center`) and smooth gradient overlay.
 * 3. Recommendations Carousel/Grid: Responsive track cards powered by backend
 *    TF-IDF content similarity scoring.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Full-Width Immersive Banner: Matches Stitch Midnight Studio (`721d44993cd748aca88d8a328189655e`)
 *    and Fragrant Glassy (`8ac7f54565f9488ebb1bc86ad5bfe597`) Dashboard layouts.
 * 2. Dynamic Auto-Slide: Cycles through top 5 recommendations every 5000ms.
 * 
 * HOW IT WORKS:
 * - `featuredTracks`: Extracts top 5 songs from `getRecommendations(15)`.
 * - `bannerIndex` & `isTransitioning`: Rotates active featured song with 500ms fade.
 */

const RecommendForYou = ({ userId }) => {
  const [recommendedSongs, setRecommendedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      getRecommendations(15)
        .then((songs) => {
          setRecommendedSongs(songs || []);
        })
        .catch((err) => {
          console.error("Error fetching recommendations:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [userId]);

  // Auto-rotate Featured Daily Mix Banner every 5 seconds
  useEffect(() => {
    if (recommendedSongs.length > 1) {
      const maxFeaturedCount = Math.min(recommendedSongs.length, 5);
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setBannerIndex((prev) => (prev + 1) % maxFeaturedCount);
          setIsTransitioning(false);
        }, 500);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [recommendedSongs]);

  if (!userId || (!loading && !recommendedSongs.length)) {
    return null;
  }

  const featuredTracks = recommendedSongs.slice(0, 5);
  const activeFeaturedTrack = featuredTracks[bannerIndex] || recommendedSongs[0];
  const gridTracks = recommendedSongs.slice(5);

  const handleNextBanner = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setBannerIndex((prev) => (prev + 1) % featuredTracks.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrevBanner = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setBannerIndex((prev) => (prev - 1 + featuredTracks.length) % featuredTracks.length);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <section id="recommendations-section" className="mb-10 sm:mb-12">
      {/* Featured Auto-Rotating Daily Mix Banner */}
      {activeFeaturedTrack && (
        <div className="relative w-full h-[300px] sm:h-[340px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)]">
          {/* Full-Width Background Artwork */}
          <img
            src={activeFeaturedTrack.thumbnail || placeholder}
            alt={activeFeaturedTrack.name || activeFeaturedTrack.title}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-45 group-hover:scale-105 transition-all duration-700"
            style={{ opacity: isTransitioning ? 0.1 : 0.45 }}
          />
          {/* Backdrop Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-surface-base)] via-[var(--color-surface-base)]/75 to-transparent pointer-events-none" />

          {/* Banner Content */}
          <div
            className="relative h-full flex flex-col justify-center p-6 sm:p-10 md:w-3/5 z-10 transition-opacity duration-500"
            style={{ opacity: isTransitioning ? 0.2 : 1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30 rounded-full font-bold text-[10px] tracking-widest uppercase">
                <Sparkles size={12} /> DAILY MIX #{bannerIndex + 1}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-primary)] tracking-widest uppercase">
                AI SPOTLIGHT
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-on-surface)] leading-tight mb-2 line-clamp-1">
              {activeFeaturedTrack.name || activeFeaturedTrack.title}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] mb-6 max-w-md line-clamp-2 leading-relaxed">
              Curated for your personal taste based on recent listening sessions.
              {activeFeaturedTrack.artist ? ` Features ${activeFeaturedTrack.artist}.` : ""}
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  usePlayerStore.getState().setTrack(activeFeaturedTrack);
                  usePlayerStore.getState().setIsPlaying(true);
                  toast.success(`Playing: ${activeFeaturedTrack.name || activeFeaturedTrack.title}`);
                }}
                className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-8 py-3 rounded-full font-bold text-xs tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
              >
                <Play size={16} fill="currentColor" /> LISTEN NOW
              </button>
              <button
                onClick={() => toast.success("Added to your favorites!")}
                className="w-11 h-11 rounded-full bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-pink-500 hover:border-pink-500/40 transition-colors"
                title="Add to Favorites"
              >
                <Heart size={18} />
              </button>
            </div>
          </div>

          {/* Banner Slider Controls & Indicators (Bottom-Right) */}
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-20 flex items-center gap-3 bg-[var(--color-surface-overlay)]/85 backdrop-blur-md border border-[var(--color-border-default)] px-3 py-1.5 rounded-full shadow-lg">
            <button
              onClick={handlePrevBanner}
              className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors p-1"
              title="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Slide Dots */}
            <div className="flex items-center gap-1.5">
              {featuredTracks.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setBannerIndex(i);
                      setIsTransitioning(false);
                    }, 300);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === bannerIndex
                      ? "w-6 bg-[var(--color-primary)]"
                      : "w-2 bg-[var(--color-border-default)] hover:bg-[var(--color-on-surface-variant)]"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNextBanner}
              className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors p-1"
              title="Next slide"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Recommended Songs Grid */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)] flex items-center gap-2">
          <span>✨</span> Recommended for You
        </h3>
      </div>

      <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-2">
        {gridTracks.map((song, index) => (
          <div key={`${song.id || song.videoId}-${index}`}>
            <MusicCard
              id={song.id || song.videoId}
              name={song.name || song.title}
              artist={song.artist}
              image={song.thumbnail || placeholder}
              onClick={() => {
                usePlayerStore.getState().setTrack(song);
                usePlayerStore.getState().setIsPlaying(true);
                toast.success(`Playing: ${song.name || song.title}`);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendForYou;
