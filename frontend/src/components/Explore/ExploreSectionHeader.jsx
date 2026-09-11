import React from "react";
import {
  Play,
  Shuffle,
  Volume2,
  RefreshCcw,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Rows2,
  GalleryHorizontal,
} from "lucide-react";

import { getGenreIdentity } from "@/constants/genreIdentity";

/**
 * ============================================================================
 * EXPLORE SECTION HEADER COMPONENT (ExploreSectionHeader.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Standardizes the header across all Explore feed sections with:
 * 1. 1-click station streaming (`Play Station` and `Shuffle`).
 * 2. Real-time active station playback indicator.
 * 3. Context-aware pagination (`More Tracks` / `Show Less`) for Grid & Compact List.
 * 4. Carousel scroll navigation chevrons for Carousel mode.
 * 5. Discreet segmented layout switcher (`[ ⊞ Grid ] [ ☰ List ] [ ⇆ Carousel ]`)
 *    allowing users to toggle any section into their preferred viewing mode.
 * 6. Atmospheric genre styling: Animated dual-tone gradient accent bar with
 *    subtle tagline revealed on hover/focus (zero-emoji, sleek aesthetic).
 * 
 * @param {Object} props
 * @param {string} props.title - Curated display name of the section (e.g. "Study Focus")
 * @param {number} [props.tracksCount=0] - Number of tracks available in this section
 * @param {number} [props.visibleCount=5] - Number of tracks currently rendered
 * @param {string} [props.layoutMode='grid'] - Current layout mode ('carousel' | 'compact-list' | 'grid')
 * @param {Function} props.onPlayStation - Callback to stream sequential queue
 * @param {Function} props.onShuffleStation - Callback to stream shuffled queue
 * @param {Function} props.onLoadMore - Callback to show more tracks
 * @param {Function} props.onCollapse - Callback to collapse tracks back to base count
 * @param {boolean} [props.isPlayingThisStation=false] - Whether current player track belongs to this section
 * @param {Function} [props.onLayoutChange] - Optional callback when user toggles layout mode
 * @param {boolean} [props.canScrollLeft=false] - Whether carousel can scroll left
 * @param {boolean} [props.canScrollRight=true] - Whether carousel can scroll right
 * @param {Function} [props.onScrollLeft] - Callback to scroll carousel left
 * @param {Function} [props.onScrollRight] - Callback to scroll carousel right
 * @param {string} [props.sectionSlug] - Optional category slug for genre identity styling
 * @param {Object} [props.genreIdentity] - Optional pre-resolved genre identity { accentFrom, accentTo, tagline }
 */
const ExploreSectionHeader = ({
  title,
  tracksCount = 0,
  visibleCount = 5,
  layoutMode = "grid",
  onPlayStation,
  onShuffleStation,
  onLoadMore,
  onCollapse,
  isPlayingThisStation = false,
  onLayoutChange,
  canScrollLeft = false,
  canScrollRight = true,
  onScrollLeft,
  onScrollRight,
  sectionSlug,
  genreIdentity,
}) => {
  const isCarousel = layoutMode === "carousel";
  const initialCount = layoutMode === "compact-list" ? 8 : 5;
  const hasMore = visibleCount < tracksCount;
  const isExpanded = visibleCount > initialCount;

  // Resolve genre visual identity (accent gradient colors and atmospheric tagline)
  const identity = genreIdentity || getGenreIdentity(sectionSlug || title);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[var(--color-border-default)]/40 pb-4">
      
      {/* Left: Section Title, Count Badge, Tagline & Animated Genre Accent Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--color-on-surface)] tracking-tight capitalize flex items-center gap-2">
            {title}
          </h3>

          {/* Track Count Badge */}
          {tracksCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)] shrink-0">
              {tracksCount} tracks
            </span>
          )}

          {/* Atmospheric Tagline: revealed on hover/focus of section/header */}
          {identity?.tagline && (
            <span className="text-xs italic text-[var(--color-on-surface-variant)] tracking-wide opacity-0 group-hover/section:opacity-90 group-focus-within/section:opacity-90 transition-opacity duration-300 hidden sm:inline-block select-none">
              • &ldquo;{identity.tagline}&rdquo;
            </span>
          )}
        </div>

        {/* Animated Genre Accent Bar */}
        <div className="h-1 w-14 rounded-full overflow-hidden bg-[var(--color-border-default)]/30">
          <div
            className="h-full w-full animate-accent-bar rounded-full"
            style={{
              background: `linear-gradient(to right, ${identity.accentFrom}, ${identity.accentTo})`,
            }}
          />
        </div>
      </div>

      {/* Right: 1-Click Streaming, Section Expansion Controls & Layout Switcher */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        
        {/* 1. Play Station / Playing Button */}
        <button
          onClick={onPlayStation}
          aria-label={isPlayingThisStation ? `Playing ${title} station` : `Play ${title} station`}
          className={`flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-colors shadow-sm active:scale-95 cursor-pointer min-h-[32px] sm:min-h-[36px] min-w-[125px] sm:min-w-[135px] ${
            isPlayingThisStation
              ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
              : "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90"
          }`}
        >
          {isPlayingThisStation ? (
            <>
              <Volume2 size={14} className="animate-pulse shrink-0" />
              <span>Playing</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" className="ml-0.5 shrink-0" />
              <span>Play Station</span>
            </>
          )}
        </button>

        {/* 2. Shuffle Station Button */}
        <button
          onClick={onShuffleStation}
          aria-label={`Shuffle ${title} station`}
          title={`Shuffle ${title} station`}
          className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] font-semibold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Shuffle size={14} />
          <span className="hidden sm:inline">Shuffle</span>
        </button>

        {/* 3. Carousel Scroll Chevrons (Only in Carousel Mode) */}
        {isCarousel && (onScrollLeft || onScrollRight) && (
          <div className="flex items-center gap-1">
            <button
              onClick={onScrollLeft}
              disabled={!canScrollLeft}
              aria-label={`Scroll ${title} left`}
              title="Scroll left"
              className={`p-1.5 rounded-full border border-[var(--color-border-default)] transition-all cursor-pointer ${
                canScrollLeft
                  ? "bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] active:scale-95"
                  : "bg-[var(--color-surface-overlay)]/40 text-[var(--color-on-surface-variant)]/40 border-transparent cursor-not-allowed opacity-50"
              }`}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={onScrollRight}
              disabled={!canScrollRight}
              aria-label={`Scroll ${title} right`}
              title="Scroll right"
              className={`p-1.5 rounded-full border border-[var(--color-border-default)] transition-all cursor-pointer ${
                canScrollRight
                  ? "bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] active:scale-95"
                  : "bg-[var(--color-surface-overlay)]/40 text-[var(--color-on-surface-variant)]/40 border-transparent cursor-not-allowed opacity-50"
              }`}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* 4. Top-Level More Tracks / Show Less Button (Grid & Compact List Modes) */}
        {!isCarousel && tracksCount > initialCount && (
          hasMore ? (
            <button
              onClick={onLoadMore}
              aria-label={`Show more tracks for ${title}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] font-semibold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <RefreshCcw size={13} className="shrink-0" />
              <span>More Tracks</span>
            </button>
          ) : isExpanded ? (
            <button
              onClick={onCollapse}
              aria-label={`Show fewer tracks for ${title}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] font-semibold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <ChevronUp size={14} className="shrink-0" />
              <span>Show Less</span>
            </button>
          ) : null
        )}

        {/* 5. Tactile Segmented Layout Switcher (Grid | Compact List | Carousel) */}
        {onLayoutChange && (
          <div
            role="group"
            aria-label={`Layout view mode for ${title}`}
            className="flex items-center rounded-full bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] p-0.5 ml-1 shadow-xs"
          >
            <button
              type="button"
              onClick={() => onLayoutChange("grid")}
              title="Grid view"
              aria-label={`Switch ${title} to grid view`}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                layoutMode === "grid"
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-xs"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]"
              }`}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange("compact-list")}
              title="Compact list view"
              aria-label={`Switch ${title} to compact list view`}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                layoutMode === "compact-list"
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-xs"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]"
              }`}
            >
              <Rows2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange("carousel")}
              title="Carousel view"
              aria-label={`Switch ${title} to carousel view`}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                layoutMode === "carousel"
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-xs"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]"
              }`}
            >
              <GalleryHorizontal size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreSectionHeader;
