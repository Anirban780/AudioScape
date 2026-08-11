import React, { useEffect, useState } from "react";
import { fetchExploreCategories } from "@/utils/api";
import { Sparkles, Music, Headphones, Mic, Guitar, Zap, Flame, Radio, Smile } from "lucide-react";

/**
 * ============================================================================
 * EXPLORE FILTER BAR COMPONENT (ExploreFilterBar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a compact, horizontally scrollable row of genre filter pills.
 * Enables quick category switching without taking up excessive vertical screen space.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Compact Layout: Replaced bulky 4-column category grid with a single-row pill bar.
 * 2. Instant Contextual Filtering: Selecting a pill filters the main feed and updates
 *    the Hero Banner carousel tracks instantly.
 * 3. Lucide Icon Integration: Uses clean vector Lucide icons for maximum visual clarity across light & dark themes.
 * 
 * HOW IT WORKS:
 * - Fetches category taxonomy via `fetchExploreCategories()`.
 * - Renders an "All" pill plus each category pill.
 * - Invokes `onSelectCategory(query)` when a pill is clicked.
 */

// Lucide icon resolver map for categories
const CATEGORY_ICONS = {
  "lofi music": Headphones,
  "pop hits": Mic,
  "indie rock": Guitar,
  "electronic music": Zap,
  "hip hop beats": Flame,
  "jazz chill": Radio,
  "anime music": Smile,
  "ambient focus": Sparkles,
};

const FALLBACK_CATEGORIES = [
  { name: "Lofi & Chill", query: "lofi music", icon: Headphones },
  { name: "Pop Hits", query: "pop hits", icon: Mic },
  { name: "Indie Rock", query: "indie rock", icon: Guitar },
  { name: "Electronic & EDM", query: "electronic music", icon: Zap },
  { name: "Hip Hop & Beats", query: "hip hop beats", icon: Flame },
  { name: "Jazz & Soul", query: "jazz chill", icon: Radio },
  { name: "Anime & OST", query: "anime music", icon: Smile },
  { name: "Focus & Ambient", query: "ambient focus", icon: Sparkles },
];

const ExploreFilterBar = ({ activeCategory, onSelectCategory }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const apiData = await fetchExploreCategories();
        if (isMounted && apiData && apiData.length > 0) {
          const mapped = apiData.map((cat) => {
            const IconComponent = CATEGORY_ICONS[cat.keyword.toLowerCase()] || Music;
            return {
              name: cat.label,
              query: cat.keyword,
              icon: IconComponent,
            };
          });
          setCategories(mapped);
        } else if (isMounted) {
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (err) {
        console.error("Failed to load explore categories for filter bar:", err);
        if (isMounted) setCategories(FALLBACK_CATEGORIES);
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryList = categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <nav aria-label="Explore music filter categories" className="w-full mb-6">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar scroll-smooth text-sm font-medium">
        {/* 'All' Filter Pill */}
        <button
          onClick={() => onSelectCategory("All")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer text-xs sm:text-sm font-bold border ${
            activeCategory === "All"
              ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[var(--color-primary)] shadow-md scale-[1.02]"
              : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-overlay)]"
          }`}
        >
          <Sparkles size={14} className={activeCategory === "All" ? "fill-current" : "text-[var(--color-primary)]"} />
          <span>All Music</span>
        </button>

        {/* Category Pills */}
        {categoryList.map((cat) => {
          const IconComp = cat.icon || Music;
          const isActive = activeCategory.toLowerCase() === cat.query.toLowerCase() || activeCategory.toLowerCase() === cat.name.toLowerCase();

          return (
            <button
              key={cat.query}
              onClick={() => onSelectCategory(cat.query)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer text-xs sm:text-sm font-semibold border ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[var(--color-primary)] shadow-md scale-[1.02]"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-overlay)]"
              }`}
            >
              <IconComp size={14} className={isActive ? "fill-current" : "text-[var(--color-primary)]"} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ExploreFilterBar;
