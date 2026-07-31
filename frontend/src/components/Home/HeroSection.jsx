import React, { useState, useEffect } from "react";
import banner1 from "@/assets/banner_1.webp";
import banner2 from "@/assets/banner_2.webp";
import banner3 from "@/assets/banner_3.webp";
import banner4 from "@/assets/banner_4.webp";
import banner5 from "@/assets/banner_5.webp";
import { Zap, ArrowRight, Compass } from "lucide-react";

/**
 * ============================================================================
 * HERO SPOTLIGHT & DISCOVERY MODULE (HeroSection.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the top 2-column Stitch Dashboard hero banner spotlight grid:
 * 1. Main Dashboard Banner (8-cols): Visual showcase carousel featuring
 *    brand artwork banners, live status pill, headline, and "START LISTENING" CTA button.
 * 2. Focus Flow Shortcut Card (4-cols): Deep concentration music mode shortcut card.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Pure Visual Dashboard Banners: Matches Stitch Midnight Studio (`721d44993cd748aca88d8a328189655e`)
 *    and Fragrant Glassy (`8ac7f54565f9488ebb1bc86ad5bfe597`) Dashboard layouts.
 * 2. Pure Visual Banners (No Mock Song Audio): The banner serves strictly as a platform
 *    dashboard banner. Clicking "START LISTENING" smooth-scrolls to the active recommendations grid.
 * 3. Smooth Banner Crossfade: Preloads WebP banners and auto-rotates every 5 seconds.
 * 
 * HOW IT WORKS:
 * - `banners`: Predefined array of WebP banner image assets and headlines.
 * - `currentIndex`: Controls active slideshow banner opacity transition.
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setIsTransitioning(false);
      }, 700);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const activeBanner = banners[currentIndex];

  const handleStartListening = () => {
    const targetElement = document.getElementById("recommendations-section");
    targetElement?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
      {/* Main Spotlight Dashboard Banner (8 Cols) */}
      <div className="lg:col-span-8 rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 relative overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-2xl transition-all duration-300">
        {/* Ambient Radial Blur Glows */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--color-primary)]/15 blur-[90px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[var(--color-secondary)]/15 blur-[90px] pointer-events-none" />

        {/* Hero Banner Artwork Showcase */}
        <div className="w-full md:w-72 h-64 md:h-72 rounded-2xl overflow-hidden shadow-2xl relative shrink-0 group">
          <img
            src={activeBanner.image}
            alt={activeBanner.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-[var(--color-surface-overlay)]/90 backdrop-blur-md border border-[var(--color-border-default)]">
            <p className="text-[10px] font-bold tracking-widest text-[var(--color-primary)] uppercase mb-0.5">
              PLATFORM SPOTLIGHT
            </p>
            <h4 className="text-sm font-semibold text-slate-600 truncate">
              {activeBanner.title}
            </h4>
          </div>
        </div>

        {/* Hero Content Block */}
        <div className="flex-1 flex flex-col justify-center z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-secondary)] animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-[var(--color-secondary)] uppercase">
              FEATURED SOUNDSCAPE
            </span>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-extrabold text-[var(--color-on-surface)] leading-tight mb-2 transition-opacity duration-700"
            style={{ opacity: isTransitioning ? 0.3 : 1 }}
          >
            {activeBanner.headline}
          </h1>
          <p
            className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] mb-6 transition-opacity duration-700 leading-relaxed max-w-lg"
            style={{ opacity: isTransitioning ? 0.3 : 1 }}
          >
            {activeBanner.subtitle}
          </p>

          {/* Start Listening CTA */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleStartListening}
              className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-6 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Compass size={18} /> START LISTENING
            </button>
          </div>
        </div>
      </div>

      {/* Focus Flow Discovery Card (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="rounded-[32px] p-6 flex-1 flex flex-col justify-between bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={100} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center mb-4 text-[var(--color-primary)]">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
              Focus Flow
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
              Deep concentration beats & spatial soundscapes tailored for high-focus sessions.
            </p>
          </div>
          <button
            onClick={handleStartListening}
            className="flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--color-primary)] mt-6 hover:gap-3 transition-all"
          >
            LISTEN NOW <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
