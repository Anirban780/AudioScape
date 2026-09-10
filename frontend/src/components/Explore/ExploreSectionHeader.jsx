import React from "react";
import { Play, Shuffle, Radio, Volume2, RefreshCcw, ChevronUp } from "lucide-react";

/**
 * ============================================================================
 * EXPLORE SECTION HEADER COMPONENT (ExploreSectionHeader.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Standardizes the header across all Explore feed sections with top-level
 * 1-click station streaming, shuffle, and dynamic inline track expansion controls:
 *   [Genre Title] • [20 Tracks] ────────── [ ▶ Play Station ] [ 🔀 Shuffle ] [ 🔄 More Tracks ]
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Top-Level Section Expansion: Replaces bottom pagination buttons so users can instantly
 *    expand or collapse track density right from the section header without scrolling past 20 cards.
 * 2. Dedicated Station Streaming vs. Expansion: Clearly separates streaming playback
 *    (`Play Station` / `Shuffle`) from UI track count expansion (`More Tracks` / `Show Less`).
 * 3. 1-Click Continuous Streaming: Queues the entire 20-track section directly into `usePlayerStore`.
 * 4. Active Station Indicator: Shows animated `[🔊 Station Playing]` badge with an accent ring when active.
 * 
 * @param {Object} props
 * @param {string} props.title - Curated display name of the section (e.g. "Study Focus")
 * @param {number} [props.tracksCount=0] - Number of tracks available in this section
 * @param {number} [props.visibleCount=5] - Number of tracks currently rendered
 * @param {Function} props.onPlayStation - Callback to stream sequential queue
 * @param {Function} props.onShuffleStation - Callback to stream shuffled queue
 * @param {Function} props.onLoadMore - Callback to show more tracks (+5)
 * @param {Function} props.onCollapse - Callback to collapse tracks back to 5
 * @param {boolean} [props.isPlayingThisStation=false] - Whether current player track belongs to this section
 */
const ExploreSectionHeader = ({
  title,
  tracksCount = 0,
  visibleCount = 5,
  onPlayStation,
  onShuffleStation,
  onLoadMore,
  onCollapse,
  isPlayingThisStation = false,
}) => {
  const hasMore = visibleCount < tracksCount;
  const isExpanded = visibleCount > 5;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[var(--color-border-default)]/40 pb-4">
      
      {/* Left: Section Title, Count Badge & Now Playing Indicator */}
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
      </div>

      {/* Right: 1-Click Streaming & Section Expansion Controls */}
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

        {/* 3. Top-Level More Tracks / Show Less Button */}
        {tracksCount > 5 && (
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
      </div>
    </div>
  );
};

export default ExploreSectionHeader;
