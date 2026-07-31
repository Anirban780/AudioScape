import React, { useEffect, useState } from "react";
import { fetchLastPlayed } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Play } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * RECENTLY PLAYED ALBUM GRID (RecentlyPlayed.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a responsive 5-column album card grid of the user's recent listening history
 * fetched from Firebase Firestore.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Grid Layout: Replaced auto-scrolling row with Stitch's clean 5-column
 *    grid layout (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6`) matching
 *    the Midnight Studio & Fragrant Glassy Dashboard designs.
 * 2. Vibrant Hover Overlay: Image zoom scale on hover (`group-hover:scale-110`) with a
 *    glowing circular play button CTA (`vibrant-glow`).
 * 3. Array Deduplication: Uses `Map` key lookup on `song.id` to guarantee unique cards.
 * 
 * HOW IT WORKS:
 * - Queries `fetchLastPlayed(userId)` on mount.
 * - Clicking any card invokes `usePlayerStore.getState().setTrack(song)` to immediately start playback.
 */

const RecentlyPlayed = ({ userId }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchLastPlayed(userId)
        .then((songs) => {
          const uniqueSongs = Array.from(
            new Map(songs.map((song) => [song.id || song.videoId, song])).values()
          );
          setRecentlyPlayed(uniqueSongs);
        })
        .catch((err) => {
          console.error("Error fetching recent tracks:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [userId]);

  if (!userId || (!loading && !recentlyPlayed.length)) {
    return null;
  }

  return (
    <section className="mb-10 sm:mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">
          Recently Played
        </h2>
        <span className="text-[var(--color-on-surface-variant)] text-xs font-bold tracking-wider hover:text-[var(--color-primary)] cursor-pointer transition-colors uppercase">
          SEE ALL
        </span>
      </div>

      {/* 5-Column Album Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {recentlyPlayed.slice(0, 10).map((song, index) => (
          <div
            key={`${song.id || song.videoId}-${index}`}
            onClick={() => {
              usePlayerStore.getState().setTrack(song);
              usePlayerStore.getState().setIsPlaying(true);
              toast.success(`Playing: ${song.name || song.title}`);
            }}
            className="group relative cursor-pointer"
          >
            {/* Card Image Container */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--color-surface-raised)] mb-3 border-2 border-[var(--color-border-default)] relative shadow-lg">
              <img
                src={song.thumbnail || placeholder}
                alt={song.name || song.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Glowing Play Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] flex items-center justify-center shadow-[0_0_20px_rgba(167,139,250,0.5)] transform scale-95 group-hover:scale-100 transition-transform">
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            </div>

            {/* Track Info */}
            <h4 className="font-bold text-sm text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors">
              {song.name || song.title || "Untitled Track"}
            </h4>
            <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
              {song.artist || "Unknown Artist"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyPlayed;
