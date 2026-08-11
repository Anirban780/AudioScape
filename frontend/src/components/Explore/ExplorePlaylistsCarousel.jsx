import React, { useEffect } from "react";
import usePlaylistStore from "@/store/usePlaylistStore";
import { getPlaylists } from "@/utils/playlists";
import { ListMusic, ChevronRight, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * EXPLORE USER PLAYLISTS CAROUSEL (ExplorePlaylistsCarousel.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays a horizontal scroll-snap carousel of user's saved playlists
 * fetched from backend via Zustand `usePlaylistStore` & `getPlaylists`.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Curated Playlists Carousel: Directly matches the playlist section from
 *    Stitch Explore screens (`6aaba54d100944a28329f65c95eb684f` & `3c52c41b3d7e40b89b4e98157e63aaae`).
 * 2. Integrated Playlist Store: Uses existing REST API synchronization from `usePlaylistStore`.
 * 3. Quick Navigation: Clicking a playlist card navigates to `/playlists`.
 * 
 * HOW IT WORKS:
 * - Fetches user playlists via `getPlaylists(userId)` on mount.
 * - Renders horizontal scroll container of playlist cards.
 */

const ExplorePlaylistsCarousel = ({ userId }) => {
  const { playlists, setPlaylists } = usePlaylistStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      getPlaylists(userId)
        .then(setPlaylists)
        .catch((err) => console.warn("Failed to fetch user playlists:", err));
    }
  }, [userId, setPlaylists]);

  if (!userId) return null;

  return (
    <section className="mb-10 sm:mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] tracking-tight flex items-center gap-2">
          <ListMusic size={22} className="text-[var(--color-primary)]" /> Your Playlists
        </h3>
        <button
          onClick={() => navigate("/playlists")}
          className="text-[var(--color-on-surface-variant)] text-xs font-bold tracking-wider hover:text-[var(--color-primary)] transition-colors uppercase cursor-pointer flex items-center gap-1"
        >
          VIEW ALL <ChevronRight size={14} />
        </button>
      </div>

      {/* Empty State Card when User Has No Playlists */}
      {playlists.length === 0 ? (
        <div className="w-full rounded-[24px] p-8 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mb-3">
            <ListMusic size={28} />
          </div>
          <h4 className="text-base sm:text-lg font-bold text-[var(--color-on-surface)] mb-1">
            No Playlists Created Yet
          </h4>
          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] max-w-md mb-4">
            Build custom playlists by clicking the '+' icon on any track card across AudioScape!
          </p>
          <button
            onClick={() => navigate("/playlists")}
            className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <PlusCircle size={16} /> GO TO PLAYLISTS
          </button>
        </div>
      ) : (
        /* Playlists Carousel */
        <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] sm:auto-cols-[minmax(280px,1fr)] gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-2">
          {playlists.map((playlist, index) => {
            const trackCount = playlist.songs?.length || 0;
            return (
              <div
                key={playlist.id || index}
                onClick={() => navigate("/playlists")}
                className="group relative h-[150px] rounded-[24px] p-6 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* Ambient Top Glow Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center font-bold">
                    <ListMusic size={20} />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)] uppercase">
                    {trackCount} {trackCount === 1 ? "track" : "tracks"}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-base text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {playlist.name || "Untitled Playlist"}
                  </h4>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                    Updated recently
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ExplorePlaylistsCarousel;
