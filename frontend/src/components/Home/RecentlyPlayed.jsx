import React, { useEffect, useState } from "react";
import { fetchLastPlayed } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Play, History, Music } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * RECENTLY PLAYED ALBUM GRID (RecentlyPlayed.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a responsive 5-column album card grid of the user's recent listening history
 * fetched from the backend. Includes loading skeleton states and an empty state card.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Always-Visible Section: Replaced silent `return null` with glassmorphic empty state
 *    and skeleton loading states so the section never disappears unexpectedly.
 * 2. Stitch Grid Layout: Responsive 5-column grid (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5`)
 *    matching Midnight Studio & Fragrant Glassy Dashboard screens.
 * 3. Array Safety & Deduplication: Safely checks `Array.isArray(songs)` and deduplicates on track IDs.
 * 
 * HOW IT WORKS:
 * - Queries `fetchLastPlayed(userId)` on mount.
 * - Displays 5 skeleton cards while loading.
 * - Renders listening history or an empty state card if no history exists yet.
 */

const RecentlyPlayed = ({ userId }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (userId) {
      setLoading(true);
      fetchLastPlayed(userId)
        .then((songs) => {
          if (!isMounted) return;
          if (Array.isArray(songs) && songs.length > 0) {
            const uniqueSongs = Array.from(
              new Map(
                songs
                  .filter((song) => song && (song.id || song.videoId))
                  .map((song) => [song.id || song.videoId, song])
              ).values()
            );
            setRecentlyPlayed(uniqueSongs);
          } else {
            setRecentlyPlayed([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching recent tracks:", err);
          if (isMounted) setRecentlyPlayed([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <section className="mb-10 sm:mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] tracking-tight flex items-center gap-2">
          <span>🕒</span> Recently Played
        </h2>
        <span className="text-[var(--color-on-surface-variant)] text-xs font-bold tracking-wider hover:text-[var(--color-primary)] cursor-pointer transition-colors uppercase">
          SEE ALL
        </span>
      </div>

      {/* Loading Skeleton Grid */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square rounded-2xl w-full bg-[var(--color-surface-raised)]" />
              <Skeleton className="h-4 w-3/4 bg-[var(--color-surface-raised)]" />
              <Skeleton className="h-3 w-1/2 bg-[var(--color-surface-raised)]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State Card when History is Empty */}
      {!loading && recentlyPlayed.length === 0 && (
        <div className="w-full rounded-[24px] p-8 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mb-3">
            <History size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--color-on-surface)] mb-1">
            No Recent Listening History
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] max-w-md mb-4">
            Play your favorite tracks, search songs, or explore recommendations to build your recent history!
          </p>
          <button
            onClick={() => {
              const exploreEl = document.getElementById("recommendations-section");
              exploreEl?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            <Music size={16} /> EXPLORE MUSIC
          </button>
        </div>
      )}

      {/* 5-Column Album Cards Grid */}
      {!loading && recentlyPlayed.length > 0 && (
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
      )}
    </section>
  );
};

export default RecentlyPlayed;
