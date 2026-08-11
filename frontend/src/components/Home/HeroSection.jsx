import React, { useState, useEffect } from "react";
import banner1 from "@/assets/banner_1.webp";
import banner2 from "@/assets/banner_2.webp";
import banner3 from "@/assets/banner_3.webp";
import banner4 from "@/assets/banner_4.webp";
import banner5 from "@/assets/banner_5.webp";
import { Zap, ArrowRight, Search, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ============================================================================
 * HERO SPOTLIGHT & DISCOVERY MODULE (HeroSection.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the top 2-column Stitch Dashboard hero banner spotlight grid:
 * 1. Main Dashboard Banner (8-cols): Full-width HD background hero banner with
 *    automatic top-to-bottom slow-pan vertical animation (`animate-pan-vertical`),
 *    multi-stop gradient overlay, spotlight badges, and "SEARCH MUSIC" CTA button.
 * 2. Focus Flow Shortcut Card (4-cols): Deep concentration music mode shortcut card.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Aligned Explore Banner Styling: Shares the exact full-width background hero layout,
 *    `animate-pan-vertical` motion, gradient overlays, and carousel controls as the Explore page.
 * 2. Direct Search Navigation: Clicking "SEARCH MUSIC" smooth-scrolls and focuses the search input bar.
 * 
 * HOW IT WORKS:
 * - `banners`: Predefined array of WebP banner image assets and headlines.
 * - `currentIndex`: Controls active slideshow banner slide.
 */

const banners = [
  {
    image: banner1,
    title: "AudioScape Soundscapes",
    headline: "Discover the Sound of Your Soul",
    subtitle: "Hi-Fi spatial audio & intelligent music curation for your daily flow.",
  },
  {
    image: banner2,
    title: "Midnight Synthwaves",
    headline: "Turn Up the Volume of Your Life",
    subtitle: "Immerse yourself in high-definition beats and lossless soundwaves.",
  },
  {
    image: banner3,
    title: "Stellar Frequency",
    headline: "Feel Every Beat, Live Every Moment",
    subtitle: "Personalized AI music engine tailored to your real-time listening habits.",
  },
  {
    image: banner4,
    title: "Velvet Reverie",
    headline: "Your Playlist, Your Identity",
    subtitle: "Organize, discover, and stream your favorite tracks effortlessly.",
  },
  {
    image: banner5,
    title: "Luminous Beats",
    headline: "Music That Moves You",
    subtitle: "Join thousands of music lovers exploring limitless audio boundaries.",
  },
];

const HeroSection = ({ enablePanAnimation = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const activeBanner = banners[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handleSearchClick = () => {
    const searchInput = document.getElementById("search-input") || document.querySelector('input[placeholder*="Search"]');
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        searchInput.focus();
      }, 400);
    }
  };

  const handleStartListening = () => {
    const targetElement = document.getElementById("recommendations-section");
    targetElement?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
      {/* Main Spotlight Dashboard Banner (8 Cols) - Full-Width HD & Slow-Pan Design */}
      <div className="lg:col-span-8 rounded-[32px] h-[300px] sm:h-[350px] relative overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-2xl transition-all duration-500 flex items-center group">
        
        {/* 1. Full-Width Background Image with Automatic Vertical Slow-Pan */}
        <img
          key={`home-banner-${currentIndex}`}
          src={activeBanner.image}
          alt={activeBanner.title}
          className={`absolute inset-0 w-full h-full object-cover opacity-65 dark:opacity-60 transition-all duration-700 pointer-events-none ${
            enablePanAnimation ? "animate-pan-vertical" : ""
          }`}
        />

        {/* 2. Gradient Overlays for Optimal Legibility & Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-surface-raised)] via-[var(--color-surface-raised)]/90 via-45% sm:via-40% to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface-raised)]/90 via-transparent to-[var(--color-surface-raised)]/30 pointer-events-none" />

        {/* 3. Hero Content Block */}
        <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
          {/* Top Badges */}
          <div>
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-xs">
                <Sparkles size={13} /> PLATFORM SPOTLIGHT #{currentIndex + 1}
              </span>
              <span className="text-[11px] font-bold text-[var(--color-primary)] tracking-wider uppercase flex items-center gap-1 bg-[var(--color-primary)]/15 px-3 py-1 rounded-full border border-[var(--color-primary)]/30 backdrop-blur-xs">
                {activeBanner.title}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-on-surface)] leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-md">
              {activeBanner.headline}
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-on-surface-variant)] line-clamp-1 font-medium max-w-lg drop-shadow-xs">
              {activeBanner.subtitle}
            </p>
          </div>

          {/* Bottom CTA & Carousel Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
            {/* Search Music CTA Button */}
            <button
              onClick={handleSearchClick}
              className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2.5 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <Search size={18} /> SEARCH MUSIC
            </button>

            {/* Carousel Navigation (Dots & Arrows) */}
            <div className="flex items-center gap-3 bg-[var(--color-surface-overlay)]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--color-border-default)] shadow-md">
              <button
                onClick={handlePrev}
                className="p-1 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
                title="Previous banner"
                aria-label="Previous banner"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex
                        ? "w-6 bg-[var(--color-primary)]"
                        : "w-2 bg-[var(--color-on-surface-variant)]/40 hover:bg-[var(--color-on-surface-variant)]"
                    }`}
                    title={`Go to slide ${idx + 1}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-1 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
                title="Next banner"
                aria-label="Next banner"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Focus Flow Discovery Card (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="rounded-[32px] p-6 h-[300px] sm:h-[350px] flex flex-col justify-between bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Zap size={120} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center mb-4 text-[var(--color-primary)] shadow-sm">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-extrabold text-[var(--color-on-surface)] mb-2 tracking-tight">
              Focus Flow
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
              Deep concentration beats & spatial soundscapes tailored for high-focus sessions.
            </p>
          </div>
          <button
            onClick={handleStartListening}
            className="flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--color-primary)] hover:gap-3 transition-all cursor-pointer"
          >
            LISTEN NOW <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
