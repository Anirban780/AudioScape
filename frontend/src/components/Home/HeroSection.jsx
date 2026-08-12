import React, { useState, useEffect } from "react";
import banner1 from "@/assets/banner_1.webp";
import banner2 from "@/assets/banner_2.webp";
import banner3 from "@/assets/banner_3.webp";
import banner4 from "@/assets/banner_4.webp";
import banner5 from "@/assets/banner_5.webp";
import { Search, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import DailyMixCards from "@/components/Home/DailyMixCards";

/**
 * ============================================================================
 * HERO SPOTLIGHT & DISCOVERY MODULE (HeroSection.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the top 2-column Stitch Dashboard hero banner spotlight grid:
 * 1. Main Dashboard Banner (8-cols): Integrated full-bleed banner artwork where text,
 *    badges, and CTA buttons blend directly on top of the zooming image.
 * 2. Silky Smooth Crossfade Image Carousel: All 5 WebP banner images stay mounted in
 *    the DOM with CSS `transition-opacity duration-1000 ease-in-out`, eliminating
 *    harsh key-based remounting jumps and enabling seamless crossfades.
 * 3. Daily Mix Cards (4-cols): Grouped TF-IDF recommendation mix cards seeded from
 *    distinct top genres in the user's history (`DailyMixCards.jsx`).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Personalized Music Curation Hero UX: Authenticated users get 2-3 instant mix cards
 *    (e.g., "Mix: Lo-fi", "Mix: K-pop", "Mix: Ambient") seeded directly from recommendation keywords.
 * 2. Seamless Crossfade Transitions: Concurrent image layers fading smoothly over 1000ms.
 * 3. Cinematic Zoom-In Motion: Active slide image applies `.animate-zoom-in` for smooth motion.
 * 
 * HOW IT WORKS:
 * - `banners`: Predefined array of WebP banner image assets and headlines.
 * - `recommendations`: Array of recommendation tracks passed down to `<DailyMixCards />`.
 * - `currentIndex`: Controls active slideshow banner index.
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

const HeroSection = ({ recommendations = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTextFading, setIsTextFading] = useState(false);

  // Auto-rotate slides every 6 seconds with smooth text fade synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      handleSlideChange((currentIndex + 1) % banners.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleSlideChange = (nextIndex) => {
    setIsTextFading(true);
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setIsTextFading(false);
    }, 250);
  };

  const activeBanner = banners[currentIndex];

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + banners.length) % banners.length;
    handleSlideChange(nextIdx);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % banners.length;
    handleSlideChange(nextIdx);
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

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
      {/* Main Spotlight Dashboard Banner (8 Cols) - Seamless Integrated Design */}
      <div className="lg:col-span-8 rounded-[32px] h-[340px] sm:h-[370px] relative overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-2xl transition-all duration-500 flex items-center group">
        
        {/* 1. Stacked Background Image Layers for Silky Smooth Crossfade Transitions */}
        {banners.map((banner, idx) => {
          const isActive = idx === currentIndex;
          return (
            <img
              key={`hero-bg-layer-${idx}`}
              src={banner.image}
              alt={banner.title}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-0 animate-zoom-in" : "opacity-0 -z-10"
              }`}
            />
          );
        })}

        {/* 2. Soft Integrated Gradient Overlay (Blends text into image with zero boxed separation) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 via-50% to-transparent pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-transparent pointer-events-none z-10" />

        {/* 3. Hero Content Block Directly Integrated Over Artwork */}
        <div className="relative z-20 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
          
          {/* Top Integrated Text Content with Smooth Fade Sync */}
          <div className={`max-w-xl transition-opacity duration-300 ${isTextFading ? "opacity-30" : "opacity-100"}`}>
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
                    onClick={() => handleSlideChange(idx)}
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

      {/* Grouped Daily Mix Cards Module (4 Cols) */}
      <DailyMixCards recommendations={recommendations} />
    </section>
  );
};

export default HeroSection;
