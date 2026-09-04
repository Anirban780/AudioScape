import React, { useEffect, useRef, useState } from "react";
import { fetchUserLikedSongs } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Heart, Music, Play, ListPlus } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { useRefreshOn } from "@/store/useDataRefreshStore";
import { Skeleton } from "@/components/ui/skeleton";
import SectionHeader from "@/components/Home/SectionHeader";
import { getValidThumbnailUrl, getHighResThumbnailUrl, decodeHtmlEntities } from "@/utils/youtubeUtils";
import toast from "react-hot-toast";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * FAVORITE SONGS VINYL CAROUSEL SECTION (FavoriteSongs.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays user's liked/favourited track collection with vinyl record hover effects:
 * 1. Branded Section Header (`SectionHeader.jsx`): Rose accent bar, tagline subtitle, track count.
 * 2. Tactile Vinyl Record Hover Effect: On card hover, album artwork shifts left while a dark
 *    grooved vinyl disc peeks out from behind the right edge with a spinning animation.
 * 3. Full Thumbnail Failsafe Stepdown: Automatically steps down resolution tiers.
 * 4. Rank Badges: Shows `#1`, `#2`, `#3` badges based on recent like order.
 * 5. Router Navigation: "SEE ALL" pill button navigates directly to `/favourites`.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Premium Tactile Feel: The vinyl disc animation makes personal favorites feel treasured.
 * 2. Theme Compliance: Employs Stitch surface variables (`var(--color-surface-raised)`, `var(--color-border-default)`).
 * 
 * HOW IT WORKS:
 * - On mount, fetches liked tracks for `userId`.
 * - Displays horizontal scroll-snap carousel of vinyl cards.
 * - Clicking any track invokes `usePlayerStore.getState().setTrack(song)` to start playback.
 */

const FavoriteSongs = ({ userId }) => {
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const scrollRef = useRef(null);
  const { openModal } = usePlaylistStore();
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

  const loadFavorites = (showLoader = true) => {
    if (userId) {
      if (showLoader) setLoading(true);
      fetchUserLikedSongs(userId)
        .then((songs) => {
          setFavoriteSongs(songs || []);
          setTimeout(() => handleScroll(), 100);
        })
        .catch((err) => {
          console.error("Error fetching favorite songs:", err);
          setFavoriteSongs([]);
        })
        .finally(() => {
          if (showLoader) setLoading(false);
        });
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites(true);
  }, [userId]);

  // Automatically refetch favorites 5 seconds after any like/unlike mutation
  useRefreshOn("favorites", () => loadFavorites(false), 5000);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowScrollLeft(scrollLeft > 10);
      setShowScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const handlePlayTrack = (song) => {
    usePlayerStore.getState().setTrack({
      id: song.id || song.videoId,
      name: song.name || song.title,
      artist: song.artist,
      thumbnail: song.thumbnail || placeholder,
    });
    usePlayerStore.getState().setIsPlaying(true);
    toast.success(`Playing: ${song.name || song.title}`);
  };

  return (
    <section className="mb-10 sm:mb-12 relative">
      {/* Branded Section Header */}
      <SectionHeader
        icon={<Heart size={20} className="fill-current" />}
        title="Your Favorites"
        subtitle="songs you can't stop replaying in your collection"
        accentGradient="from-pink-500 via-rose-400 to-transparent"
        iconBgColor="bg-pink-500/15 text-pink-500 border-pink-500/30"
        titleGradient="from-rose-400 via-pink-400 to-fuchsia-400"
        trackCount={favoriteSongs.length}
        seeAllHref="/favourites"
        seeAllLabel="VIEW ALL"
      />

      {/* Skeleton Loading State */}
      {loading && (
        <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-5 overflow-x-auto scrollbar-hide py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square rounded-2xl w-full bg-[var(--color-surface-raised)]" />
              <Skeleton className="h-4 w-3/4 bg-[var(--color-surface-raised)]" />
              <Skeleton className="h-3 w-1/2 bg-[var(--color-surface-raised)]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State Card */}
      {!loading && favoriteSongs.length === 0 && (
        <div className="w-full rounded-[24px] p-8 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-500 mb-3">
            <Heart size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--color-on-surface)] mb-1">
            No Favorite Songs Saved Yet
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] max-w-md mb-4">
            Click the heart icon on any track card to save it to your personal favorites collection!
          </p>
          <button
            onClick={() => {
              const exploreEl = document.getElementById("recommendations-section");
              exploreEl?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Music size={16} /> DISCOVER MUSIC
          </button>
        </div>
      )}

      {/* Favorites Vinyl Record Carousel */}
      {!loading && favoriteSongs.length > 0 && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="grid grid-flow-col auto-cols-[minmax(190px,1fr)] sm:auto-cols-[minmax(210px,1fr)] gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-3 px-1 relative z-10"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {favoriteSongs.map((song, index) => {
            const songId = song.id || song.videoId;
            const validImage = getHighResThumbnailUrl(song.thumbnail || song.coverUrl, songId) || getValidThumbnailUrl(song.thumbnail) || placeholder;
            const cleanTitle = decodeHtmlEntities(song.name || song.title || "Untitled Track");
            return (
              <div
                key={`${songId}-${index}`}
                style={{ scrollSnapAlign: "start" }}
                onClick={() => handlePlayTrack(song)}
                className="group relative cursor-pointer flex flex-col items-center select-none"
              >
                {/* Vinyl Record + Sleeve Container */}
                <div className="relative w-full aspect-square rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-pink-500/50 shadow-md hover:shadow-xl transition-all duration-500 p-2 overflow-visible">
                  
                  {/* Dark Vinyl Disc Peeking Out on Hover */}
                  <div className="absolute top-2 right-2 w-[85%] h-[85%] rounded-full bg-neutral-900 border-4 border-neutral-800 shadow-xl flex items-center justify-center transition-all duration-500 group-hover:translate-x-5 group-hover:rotate-45 pointer-events-none z-0">
                    {/* Vinyl Grooves Pattern */}
                    <div className="w-[70%] h-[70%] rounded-full border border-neutral-700/50 flex items-center justify-center">
                      <div className="w-[45%] h-[45%] rounded-full border border-neutral-700/50 flex items-center justify-center">
                        {/* Center Vinyl Label */}
                        <div className="w-[30%] h-[30%] rounded-full bg-pink-600 border border-pink-400 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Album Cover Artwork Sleeve */}
                  <div className="relative z-10 w-full h-full rounded-xl overflow-hidden shadow-md group-hover:-translate-x-2 transition-transform duration-500 bg-[var(--color-surface-base)] flex items-center justify-center">
                    {validImage && !isImageDead(songId) ? (
                      <img
                        src={validImage}
                        alt={cleanTitle}
                        onLoad={(e) => handleImgLoad(e, songId, songId)}
                        onError={(e) => handleImgError(e, songId, songId)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-900/40 via-rose-900/20 to-[var(--color-surface-raised)] flex items-center justify-center">
                        <Music size={36} className="text-pink-500/70" />
                      </div>
                    )}

                    {/* Rank Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-extrabold tracking-wider border border-white/20">
                      #{index + 1}
                    </div>

                    {/* Add to Playlist Button - Elevated to z-30 so it is never eclipsed */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openModal({
                          id: songId,
                          name: cleanTitle,
                          artist: song.artist,
                          thumbnail: validImage,
                        });
                      }}
                      className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/70 hover:bg-pink-600 text-white transition-all shadow-md cursor-pointer border border-white/10"
                      title="Add to playlist"
                      aria-label="Add to playlist"
                    >
                      <ListPlus size={14} />
                    </button>

                    {/* Hover Play Button Overlay - pointer-events-none to prevent blocking corner buttons */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(song);
                        }}
                        className="w-11 h-11 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform pointer-events-auto cursor-pointer"
                      >
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Song Title & Artist */}
                <div className="w-full mt-3 text-left px-1">
                  <h4 className="font-bold text-sm text-[var(--color-on-surface)] truncate group-hover:text-pink-500 transition-colors" title={cleanTitle}>
                    {cleanTitle}
                  </h4>
                  <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5" title={song.artist}>
                    {song.artist || "Unknown Artist"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Left Scroll Navigation Button */}
      {!loading && favoriteSongs.length > 0 && showScrollLeft && (
        <Button
          onClick={handleScrollLeft}
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-20 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </Button>
      )}

      {/* Right Scroll Navigation Button */}
      {!loading && favoriteSongs.length > 0 && showScrollRight && (
        <Button
          onClick={handleScrollRight}
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-20 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </Button>
      )}
    </section>
  );
};

export default FavoriteSongs;
