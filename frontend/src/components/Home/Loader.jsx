import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * ============================================================================
 * IN-PAGE CONTENT LOADER (Loader.jsx) - Stitch Design System Token Alignment
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders an in-page animated content loading state matching the active Stitch theme
 * (Midnight Studio / Aura Lumina).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. In-Page Viewport Placement: Replaced full-screen fixed overlay (`fixed inset-0 bg-black/80`)
 *    with an in-page viewport container so the top header, sidebar, and layout shell remain
 *    100% visible and un-glitched during page transitions.
 * 2. Theme Token Alignment: Uses `var(--color-primary)` brand purple/pink ring animations,
 *    `var(--color-surface-raised)` cards, and semantic text tokens.
 * 3. Smooth Fade-In: Applies `animate-in fade-in duration-300` for smooth transition pacing.
 */
const Loader = ({ message = "Loading AudioScape Vibes..." }) => {
  return (
    <div className="w-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Glowing Pulsing Ring */}
        <div className="absolute w-20 h-20 rounded-full bg-[var(--color-primary)]/15 animate-ping pointer-events-none" />
        
        {/* Animated Brand Spinner Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-[var(--color-border-default)] border-t-[var(--color-primary)] animate-spin shadow-md" />
        
        {/* Center Sparkle Icon */}
        <div className="absolute text-[var(--color-primary)]">
          <Sparkles size={22} className="animate-pulse" />
        </div>
      </div>

      <p className="text-base font-bold text-[var(--color-on-surface)] tracking-wide animate-pulse flex items-center justify-center gap-2">
        <span>{message}</span>
      </p>
      <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5 font-medium">
        Curating spatial beats & soundscapes
      </p>
    </div>
  );
};

export default Loader;
