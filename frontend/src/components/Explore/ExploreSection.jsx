import React from "react";
import MusicCard from "@/components/Cards/MusicCard";
import { RefreshCcw } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * EXPLORE TRACK SECTION (ExploreSection.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders an individual music section (e.g. "Lofi Music", "Pop Hits") featuring
 * a 5-column responsive album card grid of tracks and a "More" pagination button.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Token Surface: Wraps section in `bg-[var(--color-surface-raised)]`
 *    with `border-[var(--color-border-default)]` for unified Light and Dark theme styling.
 * 2. Responsive 5-Column Grid: Replaces plain vertical list with Stitch's 5-column
 *    grid (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5`).
 * 
 * HOW IT WORKS:
 * - Accepts `section` object (`title`, `tracks`), `visibleCount`, and `onLoadMore` handler.
 * - Clicking any track card sets active track in `usePlayerStore`.
 */

const ExploreSection = ({ section, visibleCount = 5, onLoadMore }) => {
  const { setTrack } = usePlayerStore();

  if (!section || !section.tracks || section.tracks.length === 0) {
    return null;
  }

  const displayedTracks = section.tracks.slice(0, visibleCount);
  const hasMore = visibleCount < section.tracks.length;

  return (
    <div className="p-6 rounded-[28px] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md mb-8 transition-all duration-300">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] capitalize tracking-wide">
          {section.title}
        </h3>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)]">
          {section.tracks.length} tracks
        </span>
      </div>

      {/* 5-Column Track Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {displayedTracks.map((track, index) => (
          <MusicCard
            key={`${track.id || track.videoId}-${index}`}
            id={track.id || track.videoId}
            name={track.name || track.title}
            artist={track.artist || track.channelTitle}
            image={track.thumbnail || track.thumbNail}
            onClick={() => {
              setTrack({
                id: track.id || track.videoId,
                name: track.name || track.title,
                artist: track.artist || track.channelTitle,
                thumbnail: track.thumbnail || track.thumbNail,
              });
              usePlayerStore.getState().setIsPlaying(true);
              toast.success(`Playing: ${track.name || track.title}`);
            }}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-end mt-6">
          <button
            onClick={onLoadMore}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <RefreshCcw size={15} />
            <span>MORE TRACKS</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExploreSection;
