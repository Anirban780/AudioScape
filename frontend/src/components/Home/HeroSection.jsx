import React, { useState, useEffect } from "react";
import banner1 from "@/assets/banner_1.webp";
import banner2 from "@/assets/banner_2.webp";
import banner3 from "@/assets/banner_3.webp";
import banner4 from "@/assets/banner_4.webp";
import banner5 from "@/assets/banner_5.webp";

/**
 * ============================================================================
 * HERO SECTION CAROUSEL (HeroSection.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the top hero banner carousel with cross-fading image backgrounds,
 * dynamic headlines, brand gradient overlays, and CTA button.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Brand Gradient: Uses purple/pink gradient overlays (`from-[var(--color-primary)]`)
 *    and glassmorphic backdrop blurs matching the Midnight Studio & Aura Lumina design systems.
 * 2. Smooth Transitions: Auto-rotates banners every 5 seconds with a 1-second crossfade
 *    and preloads image assets on mount for seamless slideshow transitions.
 * 
 * HOW IT WORKS:
 * - `banners`: Pre-defined array of WebP banner image assets and headlines.
 * - `currentIndex` & `isTransitioning`: Controls image opacity crossfade via CSS transitions.
 */

const banners = [
  {
    image: banner1,
    headline: "Discover the Sound of Your Soul",
  },
  {
    image: banner2,
    headline: "Turn Up the Volume of Your Life",
  },
  {
    image: banner3,
    headline: "Feel Every Beat, Live Every Moment",
  },
  {
    image: banner4,
    headline: "Your Playlist, Your Identity",
  },
  {
    image: banner5,
    headline: "Music That Moves You",
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

  useEffect(() => {
    banners.forEach((banner) => {
      const img = new Image();
      img.src = banner.image;
    });
  }, []);

  return (
    <div className="relative h-[45vh] sm:h-[55vh] overflow-hidden rounded-2xl shadow-xl text-white">
      {/* Slideshow Image Stack */}
      {banners.map((banner, index) => (
        <div
          key={index}
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${banner.image})`,
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 1 : 0,
          }}
        />
      ))}

      {/* Brand Gradient Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface-base)] via-black/40 to-transparent z-[2]" />

      {/* Content Container */}
      <div className="relative z-10 h-full w-full flex flex-col justify-center items-center px-4 sm:px-8 text-center">
        <h1
          className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-5 drop-shadow-md transition-opacity duration-700 ease-in-out bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-100 to-purple-200"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {banners[currentIndex].headline}
        </h1>
        <p
          className="text-xs sm:text-base md:text-lg max-w-md sm:max-w-xl text-gray-200 mb-6 sm:mb-8 font-normal tracking-wide transition-opacity duration-700 ease-in-out delay-100 opacity-90"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          Immerse yourself in the beats that define your moments
        </p>
        <button 
          onClick={() => {
            const exploreElement = document.getElementById('recommendations-section');
            exploreElement?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="px-6 py-2.5 sm:px-8 sm:py-3 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-semibold text-sm sm:text-base rounded-full shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105"
        >
          Start Listening
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
