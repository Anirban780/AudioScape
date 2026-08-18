import React, { useEffect, useState } from "react";
import { fetchLastPlayed } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Play, History, Music, ListPlus, RotateCcw } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { Skeleton } from "@/components/ui/skeleton";
import SectionHeader from "@/components/Home/SectionHeader";
import MusicCard from "@/components/Cards/MusicCard";
import { getValidThumbnailUrl, getHighResThumbnailUrl, handleThumbnailLoad, handleThumbnailError } from "@/utils/youtubeUtils";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * RECENTLY PLAYED SECTION (RecentlyPlayed.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays user's recent listening history in a specialized "Hero + Compact Rows" layout:
 * 1. Branded Section Header (`SectionHeader.jsx`): Top gradient bar, subtitle tagline, track count.
 * 2. Hero Last-Played Spotlight Card: Highlights most recently played track with 1-click "RESUME PLAYBACK" & Add-to-Queue.
 * 3. Compact Horizontal Track Rows: List-style track rows for remaining listening history.
 * 4. Inline Expansion: "See All / Show Less" pill button smoothly toggles list expansion inline.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Action-Oriented UX: Users check history to quickly resume listening. The hero card + list format
 *    allows instant scanning without taking up excessive vertical screen space.
 * 2. Theme Compliance: Uses Stitch surface tokens (`var(--color-surface-raised)`, `var(--color-border-default)`).
 * 
 * HOW IT WORKS:
 * - Queries `fetchLastPlayed(userId)` on mount.
 * - `recentlyPlayed[0]` feeds the Hero Spotlight Card.
 * - Remaining items render as compact `<MusicCard variant="compact" />` rows.
 */

const RecentlyPlayed = ({ userId }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { openModal } = usePlaylistStore();

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

  const handlePlayTrack = (song) => {
    usePlayerStore.getState().setTrack(song);
    usePlayerStore.getState().setIsPlaying(true);
    toast.success(`Playing: ${song.name || song.title}`);
  };

  const heroTrack = recentlyPlayed[0];
  const compactTracks = isExpanded ? recentlyPlayed.slice(1) : recentlyPlayed.slice(1, 5);

  return (
    <section className="mb-10 sm:mb-12">
      {/* Branded Section Header */}
      <SectionHeader
        icon={<History size={20} />}
        title="Recently Played"
        subtitle="pick up where you left off in your listening journey"
        accentGradient="from-[var(--color-primary)] via-indigo-500 to-transparent"
        iconBgColor="bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30"
        titleGradient="from-violet-400 via-[var(--color-primary)] to-indigo-400"
        trackCount={recentlyPlayed.length}
        seeAllHref="/history"
        seeAllLabel="VIEW ALL"
      />

      {/* Loading Skeleton Grid */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Skeleton className="h-[280px] rounded-3xl w-full bg-[var(--color-surface-raised)]" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl w-full bg-[var(--color-surface-raised)]" />
            ))}
          </div>
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
            className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Music size={16} /> EXPLORE MUSIC
          </button>
        </div>
      )}

      {/* "Hero + Compact Rows" Layout */}
      {!loading && recentlyPlayed.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (5 Cols): Hero Last-Played Spotlight Card */}
          {heroTrack && (() => {
            const heroId = heroTrack.id || heroTrack.videoId;
            const heroHdImage = getHighResThumbnailUrl(heroTrack.thumbnail, heroId) || getValidThumbnailUrl(heroTrack.thumbnail || placeholder);
            return (
              <div className="lg:col-span-5">
                <div
                  onClick={() => handlePlayTrack(heroTrack)}
                  className="group relative h-full min-h-[280px] rounded-3xl p-6 bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
                >
                  {/* Full-Bleed HD Artwork Image with Subtle Scale */}
                  <img
                    src={heroHdImage}
                    alt={heroTrack.name || heroTrack.title}
                    onLoad={handleThumbnailLoad}
                    onError={(e) => handleThumbnailError(e, heroId)}
                    className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                  />
                  
                  {/* Soft Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-[10px] font-extrabold tracking-wider uppercase shadow-md">
                    <RotateCcw size={12} /> LAST PLAYED
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(heroTrack);
                    }}
                    className="p-2 rounded-full bg-black/40 hover:bg-[var(--color-primary)] text-white transition-all backdrop-blur-xs cursor-pointer"
                    title="Add to playlist"
                    aria-label="Add to playlist"
                  >
                    <ListPlus size={16} />
                  </button>
                </div>

                {/* Bottom Song Details & Play CTA */}
                <div className="relative z-10 mt-auto pt-6">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white line-clamp-2 leading-tight drop-shadow-md mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                    {heroTrack.name || heroTrack.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium truncate mb-4 drop-shadow-xs">
                    {heroTrack.artist || "Unknown Artist"}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(heroTrack);
                    }}
                    className="w-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] py-3 rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg group-hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                    <span>RESUME PLAYBACK</span>
                  </button>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Right Column (7 Cols): Compact Track Rows with Smooth Expansion */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {compactTracks.map((song, index) => (
              <MusicCard
                key={`${song.id || song.videoId}-${index}`}
                id={song.id || song.videoId}
                name={song.name || song.title}
                artist={song.artist}
                image={song.thumbnail || placeholder}
                variant="compact"
                onClick={() => handlePlayTrack(song)}
              />
            ))}
          </div>

        </div>
      )}
    </section>
  );
};

export default RecentlyPlayed;
