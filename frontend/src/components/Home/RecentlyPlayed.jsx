import React, { useEffect, useRef, useState } from "react";
import { fetchLastPlayed } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import MusicCard from "@/components/Cards/MusicCard";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * RECENTLY PLAYED CAROUSEL (RecentlyPlayed.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Horizontal scroll-snap carousel displaying the user's recent listening history
 * fetched from Firebase Firestore.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Design Tokens: Replaced hardcoded `bg-blue-600` and `bg-gray-200` with
 *    `bg-[var(--color-primary)]` and `bg-[var(--color-surface-raised)]`.
 * 2. Deduplicated History Array: Uses a `Map` key lookup on `song.id` to guarantee
 *    no duplicate song cards appear in the listening history carousel.
 * 
 * HOW IT WORKS:
 * - Queries `fetchLastPlayed(userId)` on mount and filters duplicates.
 * - Manages scroll-snap position and pagination ("Load More").
 */
const RecentlyPlayed = ({ userId }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [visibleSongs, setVisibleSongs] = useState(8);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (userId) {
      fetchLastPlayed(userId).then((songs) => {
        const uniqueSongs = Array.from(
          new Map(songs.map((song) => [song.id, song])).values()
        );
        setRecentlyPlayed(uniqueSongs);
        setTimeout(() => handleScroll(), 100);
      });
    }
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
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const handleLoadMore = () => {
    setVisibleSongs((prev) => prev + 8);
  };

  if (!recentlyPlayed.length) return null;

  return (
    <div className="w-full relative px-2">
      <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
        <span>🕒</span> Recently Played
      </h2>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {recentlyPlayed.slice(0, visibleSongs).map((song, index) => (
          <div
            key={`${song.id}-${index}`}
            style={{ scrollSnapAlign: "start" }}
          >
            <MusicCard
              id={song.id}
              name={song.name}
              artist={song.artist}
              image={song.thumbnail || placeholder}
              onClick={() => {
                usePlayerStore.getState().setTrack(song);
                toast.success("Track selected successfully");
              }}
            />
          </div>
        ))}

        {visibleSongs < recentlyPlayed.length && (
          <div
            onClick={handleLoadMore}
            className="flex flex-col items-center justify-center cursor-pointer group rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-state-hover)] w-[160px] transition-all duration-300 shadow-md"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="p-3 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:scale-110 transition-transform">
              <ChevronRight size={24} />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--color-on-surface)]">
              Load More
            </p>
          </div>
        )}
      </div>

      {/* Left Scroll Navigation Button */}
      {showScrollLeft && (
        <Button
          onClick={handleScrollLeft}
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-10"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </Button>
      )}

      {/* Right Scroll Navigation Button */}
      {showScrollRight && (
        <Button
          onClick={handleScrollRight}
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-10"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </Button>
      )}
    </div>
  );
};

export default RecentlyPlayed;
