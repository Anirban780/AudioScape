import React from "react";

/**
 * ============================================================================
 * EXPLORE GENRE & MOOD FILTER PILLS (ExploreFilterPills.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders a horizontal scrollable container of genre and mood filter pills.
 * Highlights the active selection with a brand gradient background.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Design Match: Directly replicates the filter pills bar from Stitch Explore screens
 *    (`6aaba54d100944a28329f65c95eb684f` and `3c52c41b3d7e40b89b4e98157e63aaae`).
 * 2. Instant Filtering: Clicking a pill instantly filters or scrolls to matching music content.
 * 3. Theme Resilience: Adapts seamlessly to Light (`Aura Lumina`) and Dark (`Midnight Studio`) modes.
 * 
 * HOW IT WORKS:
 * - Accepts `genres` array, `activeGenre` string, and `onSelect` callback.
 * - Active pill renders `bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white`.
 * - Inactive pills render `bg-[var(--color-surface-raised)]` with hover border highlights.
 */

const DEFAULT_GENRES = [
  "All",
  "Lofi & Chill",
  "Pop Hits",
  "Indie Rock",
  "Electronic & EDM",
  "Hip Hop",
  "Jazz & Soul",
  "Focus & Ambient",
  "Anime & OST",
  "K-Pop",
];

const ExploreFilterPills = ({ genres = DEFAULT_GENRES, activeGenre = "All", onSelect }) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-1">
        {genres.map((genre) => {
          const isActive = activeGenre.toLowerCase() === genre.toLowerCase();
          return (
            <button
              key={genre}
              onClick={() => onSelect(genre)}
              className={`px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase whitespace-nowrap transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg scale-105"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExploreFilterPills;
