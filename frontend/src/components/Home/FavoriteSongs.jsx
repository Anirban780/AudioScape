import React, { useEffect, useRef, useState } from "react";
import { fetchUserLikedSongs } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Heart, Music } from "lucide-react";
import MusicCard from "@/components/Cards/MusicCard";
import usePlayerStore from "@/store/usePlayerStore";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * FAVORITE SONGS CAROUSEL SECTION (FavoriteSongs.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays the user's liked/favourited track collection on the Home Page
 * as a responsive horizontal scroll-snap carousel with direct play triggers
 * and a "SEE ALL" action link to the main `/favourites` page.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Always-Visible Section: Includes skeleton loading states and glassmorphic
 *    empty state card so the section is always present and informative.
 * 2. Stitch Design Tokens: Uses surface elevation tokens (`bg-[var(--color-surface-raised)]`,
 *    `border-[var(--color-border-default)]`) for seamless Light (`Aura Lumina`) and
 *    Dark (`Midnight Studio`) theme integration.
 * 3. Positioned at Page End: Placed as the final section on the Home Page to provide
 *    quick access to personal favorites.
 * 
 * HOW IT WORKS:
 * - On mount, fetches liked tracks for `userId`.
 * - Displays loading skeletons or empty state card if no favorites exist yet.
 * - Clicking any track invokes `usePlayerStore.getState().setTrack(song)` to start playback.
 */

const FavoriteSongs = ({ userId }) => {
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    if (userId) {
      setLoading(true);
      fetchUserLikedSongs(userId)
        .then((songs) => {
          if (!isMounted) return;
          setFavoriteSongs(songs || []);
          setTimeout(() => handleScroll(), 100);
        })
        .catch((err) => {
          console.error("Error fetching favorite songs:", err);
          if (isMounted) setFavoriteSongs([]);
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

  return (
    <section className="mb-10 sm:mb-12 relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)] flex items-center gap-2 tracking-tight">
          <span className="text-pink-500">❤️</span> Favorite Songs
        </h2>
        <button
          onClick={() => navigate("/favourites")}
          className="text-[var(--color-on-surface-variant)] text-xs font-bold tracking-wider hover:text-[var(--color-primary)] transition-colors uppercase cursor-pointer"
        >
          SEE ALL
        </button>
      </div>

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
            className="px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            <Music size={16} /> DISCOVER MUSIC
          </button>
        </div>
      )}

      {/* Favorites Carousel Container */}
      {!loading && favoriteSongs.length > 0 && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {favoriteSongs.map((song, index) => (
            <div key={`${song.id || song.videoId}-${index}`} style={{ scrollSnapAlign: "start" }}>
              <MusicCard
                id={song.id || song.videoId}
                name={song.name || song.title}
                artist={song.artist}
                image={song.thumbnail || placeholder}
                onClick={() => {
                  usePlayerStore.getState().setTrack(song);
                  usePlayerStore.getState().setIsPlaying(true);
                  toast.success(`Playing: ${song.name || song.title}`);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Left Scroll Navigation Button */}
      {!loading && favoriteSongs.length > 0 && showScrollLeft && (
        <Button
          onClick={handleScrollLeft}
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-20"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-20"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </Button>
      )}
    </section>
  );
};

export default FavoriteSongs;
