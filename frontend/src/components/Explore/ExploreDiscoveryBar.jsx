import React, { useState, useRef, useEffect } from "react";
import {
  Filter,
  ChevronDown,
  Dices,
  RotateCcw,
  Sparkles,
  Headphones,
  Zap,
  Flame,
  Guitar,
  Radio,
  Smile,
  Music,
  Check,
} from "lucide-react";
import { CURATED_CATEGORIES, resolveCategory } from "@/constants/curatedCategories";

/**
 * ============================================================================
 * EXPLORE DISCOVERY BAR COMPONENT (ExploreDiscoveryBar.jsx) - Option 3
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Provides a clean, ultra-slim 44px utility control bar directly between the
 * Hero Banner and Music Sections. Replaces the cluttered multi-tier filter pills
 * and heavy Bento cards with a focused, professional discovery control center.
 * 
 * FEATURES:
 * 1. Live Feed Telemetry: Displays current section and track count (e.g. "Showing 12 Curated Sections").
 * 2. Surprise Me / Shuffle Mix: 1-Click action to instantly launch a randomized 20-track discovery mix.
 * 3. Grouped Category Popover: Clean, 2-column popover organizing 33 curated genres by musical mood.
 * 4. Zero Layout Bloat: Consumes under 48px of vertical height, preserving above-the-fold music visibility.
 * 5. 100% Zero-Quota: All category selections route strictly to PostgreSQL local catalog.
 */

// Visual cluster groupings for clean 2-column taxonomy presentation
const CATEGORY_GROUPS = [
  {
    title: "🎧 Chill & Focus",
    slugs: ["lofi-chill", "chill-beats", "study-focus", "sleep-ambient", "rainy-day", "coffee-shop"],
  },
  {
    title: "⚡ Energy & Dance",
    slugs: ["phonk", "workout-energy", "edm", "electronic", "house"],
  },
  {
    title: "🔥 Hits & Mainstream",
    slugs: ["pop-hits", "hip-hop", "rnb-soul", "viral-hits", "tiktok-viral"],
  },
  {
    title: "🎸 Alt & Acoustic",
    slugs: ["indie-rock", "acoustic", "road-trip", "throwback-2000s", "retro-hits"],
  },
  {
    title: "🧘 Instrumental & Ambient",
    slugs: ["ambient-focus", "classical", "jazz-soul", "piano-chill", "guitar-relax"],
  },
  {
    title: "🌍 Global & Soundtracks",
    slugs: ["anime-ost", "video-game", "k-pop", "j-pop", "afrobeats", "latin", "bollywood"],
  },
];

const ExploreDiscoveryBar = ({
  activeCategory = "All",
  onSelectCategory,
  onSurpriseMe,
  totalSections = 0,
  totalTracks = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Resolve current active category display label
  const activeMeta = activeCategory !== "All" ? resolveCategory(activeCategory) : null;
  const activeLabel = activeMeta ? activeMeta.label : activeCategory === "All" ? "All Categories" : activeCategory;

  const handleSelect = (keyword, meta) => {
    setIsOpen(false);
    if (onSelectCategory) {
      onSelectCategory(keyword, meta);
    }
  };

  return (
    <div className="relative w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 px-4 mb-6 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] shadow-xs transition-colors">
      
      {/* 1. Left Telemetry & Feed Status */}
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 font-bold text-[var(--color-on-surface)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
          <span>
            {activeCategory === "All"
              ? `Curated Feed • ${totalSections} Sections`
              : `Filtered: ${activeLabel}`}
          </span>
        </div>
        {totalTracks > 0 && (
          <span className="text-[var(--color-on-surface-variant)] text-xs font-medium">
            ({totalTracks} tracks available)
          </span>
        )}

        {/* Quick Clear Filter Pill */}
        {activeCategory !== "All" && (
          <button
            onClick={() => handleSelect("All", null)}
            className="inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 transition-all cursor-pointer"
            title="Reset to All Categories"
            aria-label="Reset to All Categories"
          >
            <RotateCcw size={11} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* 2. Right Discovery Controls: Surprise Me + Category Dropdown */}
      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto" ref={dropdownRef}>
        
        {/* A. Surprise Me / Random Station Mix */}
        <button
          onClick={onSurpriseMe}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-[var(--color-on-surface)] bg-[var(--color-surface-overlay)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-all cursor-pointer shadow-xs active:scale-95"
          title="Play a randomized 20-track surprise discovery mix"
          aria-label="Play Surprise Mix"
        >
          <Dices size={15} className="text-[var(--color-primary)]" />
          <span className="hidden xs:inline">Surprise Mix</span>
          <span className="xs:hidden">Surprise</span>
        </button>

        {/* B. Category Selector Dropdown Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border ${
            activeCategory !== "All"
              ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[var(--color-primary)]"
              : "bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border-[var(--color-border-default)] hover:border-[var(--color-primary)]/50"
          }`}
          title="Browse categories by mood and genre"
          aria-label={`Category filter, currently selected: ${activeLabel}`}
        >
          <Filter size={14} className={activeCategory !== "All" ? "text-white" : "text-[var(--color-primary)]"} />
          <span className="max-w-[130px] sm:max-w-[170px] truncate">{activeLabel}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* C. Grouped Category Popover Menu */}
        {isOpen && (
          <div
            role="dialog"
            aria-label="Select a music category"
            className="absolute right-0 top-full mt-2 w-[310px] sm:w-[520px] max-h-[460px] overflow-y-auto rounded-2xl p-4 bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl custom-scrollbar"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border-default)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Browse by Category & Mood
              </span>
              <button
                onClick={() => handleSelect("All", null)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  activeCategory === "All"
                    ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border-[var(--color-border-default)] hover:border-[var(--color-primary)]"
                }`}
              >
                All Music
              </button>
            </div>

            {/* 2-Column Grouped Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CATEGORY_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col space-y-1">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-primary)] px-1 mb-0.5">
                    {group.title}
                  </h4>
                  {group.slugs.map((slug) => {
                    const cat = CURATED_CATEGORIES.find((c) => c.slug === slug);
                    if (!cat) return null;
                    const isCurrent =
                      activeCategory.toLowerCase() === cat.keyword.toLowerCase() ||
                      activeCategory.toLowerCase() === cat.label.toLowerCase() ||
                      activeCategory.toLowerCase() === cat.slug.toLowerCase();

                    return (
                      <button
                        key={cat.slug}
                        onClick={() => handleSelect(cat.keyword, cat)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                          isCurrent
                            ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold"
                            : "text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)]"
                        }`}
                      >
                        <span className="truncate">{cat.label}</span>
                        {isCurrent && <Check size={13} className="text-[var(--color-primary)] shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default ExploreDiscoveryBar;
