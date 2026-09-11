import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, ChevronLeft, ChevronRight, ArrowUpRight, Music2 } from "lucide-react";
import { fetchCategorySummaries } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import placeholder from "@/assets/placeholder.jpg";
import {
  getHighResThumbnailUrl,
  getValidThumbnailUrl,
  extractYouTubeId,
  handleThumbnailLoad,
  handleThumbnailError,
} from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * GENRE CATEGORY SLIDER COMPONENT (GenreCategorySlider.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders an interactive horizontal sliding carousel of 10 curated music categories
 * on the Home page (Module #4).
 * 
 * DESIGN PILLARS:
 * 1. Horizontal Fluid Sliding: Snap-scrolling container with header navigation chevrons.
 * 2. Visual Music Identity: Each card features the first song's HD thumbnail as background artwork.
 * 3. High-Engagement Micro-Interactions:
 *    - Ambient brand luminescence (`shadow-[0_0_30px_rgba(167,139,250,0.3)]` on hover)
 *    - Smooth artwork zoom (`scale-105` duration-500)
 *    - Gradient accent illumination line on card base
 *    - Angled arrow hover indicator (`ArrowUpRight`)
 * 4. Zero-Green / Zero-Emoji Compliance: Clean Outfit display typography and semantic Stitch tokens.
 * 5. Direct Portal Navigation: Clicking any card navigates straight to `/category/:slug`.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * Replaces the repetitive, fatigue-inducing 12-section Explore page with a single,
 * fast, high-impact discovery entry point directly on the Home dashboard.
 * 
 * HOW IT WORKS:
 * - On mount, queries `fetchCategorySummaries()` from NestJS backend (`GET /api/music/categories/summary`).
 * - Employs localStorage SWR caching (30m TTL) for instant, flicker-free rendering.
 * - Smoothly scrolls by 320px left/right using `scrollRef.current.scrollBy`.
 * - Navigates to `/category/:slug` upon clicking any category card.
 * ============================================================================
 */

const GenreCategorySlider = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Load category summaries with SWR caching
  useEffect(() => {
    let isMounted = true;
    fetchCategorySummaries()
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load category summaries for slider:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update scroll navigation arrow state on scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const handleCardClick = (slug) => {
    if (slug) {
      navigate(`/category/${slug}`);
    }
  };

  return (
    <section className="w-full relative mb-12 select-none" aria-label="Browse Categories">
      {/* ── Section Header Block ────────────────────────────────────────── */}
      <div className="relative mb-6">
        <div className="flex items-stretch gap-4">
          {/* Left Accent Spine: vertical gradient bar matching Stitch design system */}
          <div className="w-[3px] rounded-full bg-gradient-to-b from-[var(--color-primary)] via-[var(--color-secondary)] to-transparent shrink-0 self-stretch min-h-[48px]" />

          {/* Header content and carousel navigation controls */}
          <div className="flex-1 flex items-center justify-between gap-4 flex-wrap">
            {/* Title & Subtitle block */}
            <div className="flex items-center gap-3">
              {/* Icon badge with ambient blur glow */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-40 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]" />
                <div className="relative w-10 h-10 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Compass size={20} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2
                    className="font-display font-black tracking-wide text-xl sm:text-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent"
                    style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    Browse Categories
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)]">
                    10 Curated Realms
                  </span>
                </div>
                <p className="font-body text-xs text-[var(--color-on-surface-variant)] italic mt-0.5 leading-snug">
                  Dive into distinct musical atmospheres and sonic landscapes
                </p>
              </div>
            </div>

            {/* Navigation Controls: Left & Right Chevrons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  canScrollLeft
                    ? "bg-[var(--color-surface-raised)] border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-primary)] cursor-pointer shadow-sm hover:shadow-md"
                    : "bg-[var(--color-surface-base)]/50 border-[var(--color-border-default)]/30 text-[var(--color-on-surface-variant)]/40 cursor-not-allowed opacity-50"
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  canScrollRight
                    ? "bg-[var(--color-surface-raised)] border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:text-[var(--color-primary)] cursor-pointer shadow-sm hover:shadow-md"
                    : "bg-[var(--color-surface-base)]/50 border-[var(--color-border-default)]/30 text-[var(--color-on-surface-variant)]/40 cursor-not-allowed opacity-50"
                }`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sliding Track Container ────────────────────────────────────── */}
      <div className="relative group/track">
        {/* Left & Right Gradient Fade Overlays for seamless edge transition */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--color-surface-base)] to-transparent z-10 pointer-events-none opacity-0 group-hover/track:opacity-100 transition-opacity duration-300" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--color-surface-base)] to-transparent z-10 pointer-events-none opacity-0 group-hover/track:opacity-100 transition-opacity duration-300" />

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-flow-col auto-cols-[240px] sm:auto-cols-[260px] md:auto-cols-[280px] gap-5 overflow-hidden py-3 px-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[310px] sm:h-[330px] rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] p-5 flex flex-col justify-between animate-pulse"
              >
                <Skeleton className="w-20 h-6 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="w-3/4 h-7 rounded-lg bg-white/10" />
                  <Skeleton className="w-full h-4 rounded-md bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category Cards Carousel */}
        {!loading && categories.length > 0 && (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="grid grid-flow-col auto-cols-[240px] sm:auto-cols-[260px] md:auto-cols-[280px] gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-3 px-1 relative z-0"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {categories.map((cat) => {
              const videoId = extractYouTubeId(cat.thumbnail) || cat.slug;
              const bgImage = getHighResThumbnailUrl(cat.thumbnail, videoId) || getValidThumbnailUrl(cat.thumbnail) || placeholder;

              return (
                <div
                  key={cat.slug}
                  onClick={() => handleCardClick(cat.slug)}
                  style={{ scrollSnapAlign: "start" }}
                  className="group relative h-[310px] sm:h-[330px] rounded-2xl overflow-hidden cursor-pointer border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/60 bg-[var(--color-surface-raised)] shadow-md hover:shadow-[0_0_30px_rgba(167,139,250,0.28)] hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between p-5"
                >
                  {/* Full-bleed background artwork with zoom effect & YouTube error degradation */}
                  <img
                    src={bgImage}
                    alt={cat.name}
                    loading="lazy"
                    onLoad={handleThumbnailLoad}
                    onError={(e) => handleThumbnailError(e, videoId)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out animate-pan-horizontal"
                  />

                  {/* Multi-tier gradient overlay to ensure text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface-base)] via-[var(--color-surface-base)]/55 to-black/25 pointer-events-none" />

                  {/* Top Glass Badge Row: Track count */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white/95 bg-black/40 backdrop-blur-md border border-white/15 shadow-sm">
                      <Music2 size={12} className="text-[var(--color-primary)]" />
                      {cat.trackCount || 20} Tracks
                    </span>

                    {/* Subtle angled arrow that highlights and nudges on hover */}
                    <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/60 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>

                  {/* Bottom Content Block: Category name and tagline */}
                  <div className="relative z-10">
                    <h3 className="font-display font-extrabold text-2xl text-white tracking-wide leading-tight group-hover:text-[var(--color-primary)] transition-colors drop-shadow-md">
                      {cat.name}
                    </h3>
                    {cat.tagline && (
                      <p className="font-body text-xs text-white/75 line-clamp-2 mt-1.5 leading-relaxed drop-shadow">
                        {cat.tagline}
                      </p>
                    )}
                  </div>

                  {/* Bottom Ambient Glow Accent Line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default GenreCategorySlider;
