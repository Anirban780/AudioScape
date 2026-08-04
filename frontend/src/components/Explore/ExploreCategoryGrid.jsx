import React from "react";
import { Compass } from "lucide-react";

/**
 * ============================================================================
 * EXPLORE BROWSE CATEGORIES GRID (ExploreCategoryGrid.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a 4-column grid of genre discovery cards featuring vibrant gradient
 * backgrounds, genre titles, icons, and interactive hover zoom scale.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Browse Categories Grid: Directly implements the genre category tile grid
 *    from Stitch Explore screens (`6aaba54d100944a28329f65c95eb684f` & `e8bef34ec53d4382bba063b4a4d375d1`).
 * 2. Instant Category Search: Clicking any genre tile immediately invokes `onCategoryClick(genre)`
 *    to fetch and scroll to category search results.
 * 3. Curated Palette Gradients: Uses curated gradients (purple, pink, blue, emerald, amber)
 *    ensuring visual richness without violating the zero-green rule.
 * 
 * HOW IT WORKS:
 * - Maps over `GENRE_CATEGORIES` list.
 * - Clicking a card invokes `onCategoryClick(category.query)` callback.
 */

const GENRE_CATEGORIES = [
  { name: "Lofi & Chill", query: "lofi music", gradient: "from-purple-700 via-indigo-600 to-blue-600", icon: "🎧" },
  { name: "Pop Hits", query: "pop hits", gradient: "from-pink-600 via-rose-500 to-purple-600", icon: "🎤" },
  { name: "Indie Rock", query: "indie rock", gradient: "from-blue-600 via-cyan-600 to-teal-700", icon: "🎸" },
  { name: "Electronic & EDM", query: "electronic music", gradient: "from-violet-700 via-purple-600 to-indigo-700", icon: "⚡" },
  { name: "Hip Hop & Beats", query: "hip hop beats", gradient: "from-amber-600 via-orange-600 to-red-600", icon: "🔥" },
  { name: "Jazz & Soul", query: "jazz chill", gradient: "from-yellow-600 via-amber-600 to-amber-700", icon: "🎷" },
  { name: "Anime & OST", query: "anime music", gradient: "from-rose-600 via-fuchsia-600 to-purple-700", icon: "✨" },
  { name: "Focus & Ambient", query: "ambient focus", gradient: "from-cyan-600 via-blue-600 to-indigo-800", icon: "🧘" },
];

const ExploreCategoryGrid = ({ onCategoryClick }) => {
  return (
    <section className="mb-10 sm:mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] tracking-tight flex items-center gap-2">
          <Compass size={22} className="text-[var(--color-primary)]" /> Browse Categories
        </h3>
      </div>

      {/* 4-Column Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
        {GENRE_CATEGORIES.map((category) => (
          <div
            key={category.name}
            onClick={() => onCategoryClick(category.query)}
            className={`relative h-[120px] sm:h-[135px] rounded-[22px] p-5 overflow-hidden cursor-pointer group shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-white/10 bg-gradient-to-br ${category.gradient}`}
          >
            {/* Background Glow Overlay */}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />

            {/* Category Info */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl">{category.icon}</span>
              <h4 className="font-extrabold text-base sm:text-lg text-white tracking-wide leading-snug drop-shadow-md">
                {category.name}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExploreCategoryGrid;
