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
 * 1. Main Dashboard Banner (8-cols): Integrated full-bleed banner artwork where text,
 *    badges, and CTA buttons blend directly on top of the zooming image with zero
 *    boxed card distinction.
 * 2. Focus Flow Shortcut Card (4-cols): Deep concentration music mode shortcut card.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Seamless Text & Image Integration: Removed separate glass card boxes so typography
 *    and artwork merge into a single, cohesive cinematic hero banner.
 * 2. High Contrast Drop Shadows: Uses crisp text shadows (`drop-shadow-md`) and an ambient
 *    gradient fade (`from-black/75 via-black/25 to-transparent`) for legibility.
 * 3. Cinematic Zoom-In Motion: Background image starts at `scale(1.0)` and smoothly zooms in to
 *    `scale(1.15)` on each slide transition.
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

const HeroSection = () => {
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
      {/* Main Spotlight Dashboard Banner (8 Cols) - Seamless Integrated Design */}
      <div className="lg:col-span-8 rounded-[32px] h-[340px] sm:h-[370px] relative overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-2xl transition-all duration-500 flex items-center group">
        
        {/* 1. Full-Width Background Image with Smooth Zoom-In Animation */}
        <img
          key={`home-banner-integrated-${currentIndex}`}
          src={activeBanner.image}
          alt={activeBanner.title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none animate-zoom-in opacity-100"
        />

        {/* 2. Soft Integrated Gradient Overlay (Blends text into image with zero boxed separation) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* 3. Hero Content Block Directly Integrated Over Artwork */}
        <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
          
          {/* Top Integrated Text Content */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[11px] tracking-wider uppercase backdrop-blur-xs shadow-md">
                <Sparkles size={13} /> SPOTLIGHT #{currentIndex + 1}
              </span>
              <span className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full border border-white/25 backdrop-blur-xs shadow-md">
                {activeBanner.title}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {activeBanner.headline}
            </h1>
            <p className="text-sm sm:text-base text-slate-200 line-clamp-2 font-medium leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] max-w-lg">
              {activeBanner.subtitle}
            </p>
          </div>

          {/* Bottom Side-by-Side Integrated Action Buttons */}
          <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
            
            {/* Search Music CTA Button */}
            <button
              onClick={handleSearchClick}
              className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2.5 shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <Search size={18} /> SEARCH MUSIC
            </button>

            {/* Carousel Navigation Controls */}
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg text-white">
              <button
                onClick={handlePrev}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Previous banner"
                aria-label="Previous banner"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Slide Dots */}
              <div className="flex items-center gap-1.5">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex
                        ? "w-6 bg-[var(--color-primary)]"
                        : "w-2 bg-white/40 hover:bg-white"
                    }`}
                    title={`Go to slide ${idx + 1}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
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
        <div className="rounded-[32px] p-6 h-[340px] sm:h-[370px] flex flex-col justify-between bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-xl relative overflow-hidden group">
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
