import React, { useEffect, useRef, useState } from "react";
import { getRecommendations } from "@/utils/api";
import placeholder from "@/assets/placeholder.jpg";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import MusicCard from "@/components/Cards/MusicCard";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * RECOMMENDATIONS CAROUSEL (RecommendForYou.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders a horizontal scroll-snap carousel of AI-personalized track recommendations
 * for the authenticated user.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Design Tokens: Replaced hardcoded `bg-blue-600` and `bg-gray-200` with
 *    `bg-[var(--color-primary)]` and `bg-[var(--color-surface-raised)]`.
 * 2. TF-IDF Backend Integration: Queries `getRecommendations(15)` from `@/utils/api`
 *    which calculates content similarity scores based on listening history.
 * 
 * HOW IT WORKS:
 * - `handleScroll`: Monitors scroll position to toggle visibility of left/right arrow buttons.
 * - `handleLoadMore`: Expands `visibleSongs` state by 5 tracks.
 */
const RecommendForYou = ({ userId }) => {
    const [recommendedSongs, setRecommendedSongs] = useState([]);
    const [visibleSongs, setVisibleSongs] = useState(5);
    const [showScrollRight, setShowScrollRight] = useState(false);
    const [showScrollLeft, setShowScrollLeft] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchRecommendedSongs = async () => {
            if (userId) {
                const songs = await getRecommendations(15);
                setRecommendedSongs(songs);
                setTimeout(() => handleScroll(), 100);
            }
        }

        fetchRecommendedSongs();
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
        setVisibleSongs((prev) => prev + 5);
    };

    if (!recommendedSongs.length) return null;

    return (
        <div id="recommendations-section" className="w-full relative px-2">
            <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                <span>✨</span> Recommended for You
            </h2>
            
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-2"
                style={{ scrollSnapType: "x mandatory" }}
            >
                {recommendedSongs.slice(0, visibleSongs).map((song, index) => (
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

                {visibleSongs < recommendedSongs.length && (
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

export default RecommendForYou;
