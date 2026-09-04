import React from "react";
import { Play, RotateCcw, Compass, Music, Sparkles } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import usePlayerStore from "@/store/usePlayerStore";
import { getValidThumbnailUrl, getHighResThumbnailUrl } from "@/utils/youtubeUtils";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * JUMP BACK IN MODULE (JumpBackIn.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the primary "Resume Listening" spotlight module inside the Home Hero grid:
 * 1. Active Last-Played Track: Displays artwork, track title, and artist name for the
 *    user's single most recently played song.
 * 2. Instant Resume CTA: One-click playback button that loads the track into `usePlayerStore`
 *    and starts streaming immediately.
 * 3. Graceful Empty State: If no listen history exists, renders a discovery CTA prompting
 *    the user to explore curated music streams.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * - Replaces the non-functional static "Focus Flow" marketing banner with dynamic,
 *   personalized content tailored to the authenticated user's actual history.
 * - Fits precisely into the `lg:col-span-4` slot of the Stitch 2-Column Hero layout.
 * 
 * HOW IT WORKS:
 * - Accepts `lastPlayedTrack` object prop from `HeroSection` / `Home.jsx`.
 * - Interacts with Zustand `usePlayerStore` (`setTrack`, `setIsPlaying`).
 */

const JumpBackIn = ({ lastPlayedTrack }) => {
  const { setTrack, setIsPlaying } = usePlayerStore();
  const navigate = useNavigate();
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

  const handleResumePlayback = (e) => {
    e.stopPropagation();
    if (!lastPlayedTrack) return;
    setTrack(lastPlayedTrack);
    setIsPlaying(true);
  };

  const handleExploreClick = () => {
    navigate("/explore");
  };

  const trackId = lastPlayedTrack?.id || lastPlayedTrack?.videoId;
  const isDead = isImageDead(trackId);
  const thumbnailUrl = lastPlayedTrack
    ? getHighResThumbnailUrl(lastPlayedTrack.thumbnail || lastPlayedTrack.coverUrl, trackId) ||
      getValidThumbnailUrl(lastPlayedTrack.thumbnail || lastPlayedTrack.coverUrl) ||
      placeholder
    : placeholder;

  return (
    <div className="lg:col-span-4 flex flex-col h-full">
      <div className="rounded-[32px] p-6 h-[340px] sm:h-[370px] flex flex-col justify-between bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-[var(--color-primary)]/50">
        
        {/* Subtle Ambient Background Glow */}
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
          <RotateCcw size={120} className="text-[var(--color-primary)]" />
        </div>

        {/* Top Header & Tagline */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-xs">
              <RotateCcw size={12} className="animate-spin-slow" /> JUMP BACK IN
            </span>
            <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)]">
              {lastPlayedTrack ? "Last Played" : "Welcome"}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-[var(--color-on-surface)] tracking-tight">
            {lastPlayedTrack ? "Pick Up Where You Left Off" : "Start Your Sound Journey"}
          </h3>
        </div>

        {/* Center Track Artwork & Info Card or Empty State */}
        {lastPlayedTrack ? (
          <div 
            onClick={handleResumePlayback}
            className="relative z-10 flex items-center gap-4 p-3.5 rounded-2xl bg-[var(--color-surface-overlay)]/80 border border-[var(--color-border-default)] backdrop-blur-md cursor-pointer group/card hover:bg-[var(--color-state-hover)] transition-all duration-300 shadow-md"
          >
            {/* Album Thumbnail with Overlay Play Icon */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-sm bg-gradient-to-br from-purple-900/60 via-indigo-950/80 to-black flex items-center justify-center">
              {!isDead ? (
                <img
                  src={thumbnailUrl}
                  alt={lastPlayedTrack.name || lastPlayedTrack.title || "Track Artwork"}
                  onLoad={(e) => handleImgLoad(e, trackId, trackId)}
                  onError={(e) => handleImgError(e, trackId, trackId)}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={24} className="text-[var(--color-primary)] opacity-70" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg">
                  <Play size={16} className="fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Track Metadata */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-0.5">
                {lastPlayedTrack.genre?.[0] || "Recent Stream"}
              </p>
              <h4 className="text-sm font-bold text-[var(--color-on-surface)] truncate leading-snug group-hover/card:text-[var(--color-primary)] transition-colors">
                {lastPlayedTrack.name || lastPlayedTrack.title || "Untitled Track"}
              </h4>
              <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                {lastPlayedTrack.artist || "Unknown Artist"}
              </p>
            </div>
          </div>
        ) : (
          /* Empty State fallback when user has no listen history */
          <div className="relative z-10 flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--color-surface-overlay)]/50 border border-[var(--color-border-default)] text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-3">
              <Music size={24} />
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
              No recent history found. Explore trending tracks and soundscapes to get started!
            </p>
          </div>
        )}

        {/* Bottom CTA Action Button */}
        <div className="relative z-10 pt-2">
          {lastPlayedTrack ? (
            <button
              onClick={handleResumePlayback}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-[var(--color-text-on-primary)] py-3 px-5 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2.5 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play size={16} className="fill-current" /> RESUME PLAYBACK
            </button>
          ) : (
            <button
              onClick={handleExploreClick}
              className="w-full bg-[var(--color-surface-overlay)] hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] border border-[var(--color-border-strong)] py-3 px-5 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Compass size={16} /> EXPLORE MUSIC NOW
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default JumpBackIn;
