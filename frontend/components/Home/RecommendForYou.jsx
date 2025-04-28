import React, { useEffect, useRef, useState } from "react";
import { getRecommendations } from "../../utils/api"; // Assuming you have an API method to fetch recommended songs
import placeholder from "../../assets/placeholder.jpg";
import { Button } from "../../../utils/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import MusicCard from "../Cards/MusicCard";
import usePlayerStore from "../../store/usePlayerStore";
import toast from "react-hot-toast";

const RecommendForYou = ({ userId }) => {
    const [recommendedSongs, setRecommendedSongs] = useState([]);
    const [visibleSongs, setVisibleSongs] = useState(5); // Start by displaying 5 songs
    const [showScrollRight, setShowScrollRight] = useState(false);
    const [showScrollLeft, setShowScrollLeft] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchRecommendedSongs = async () => {
            if (userId) {
                const songs = await getRecommendations(15); // Fetch 10 recommended songs
                setRecommendedSongs(songs);
                setTimeout(() => handleScroll(), 100); // Delay to ensure scroll calculations are accurate
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
        setVisibleSongs((prev) => prev + 5); // Load 5 more songs at a time
    };

    if (!recommendedSongs.length) return null;

    return (
        <div className="w-full max-w-6xl mx-auto px-3 py-6 ml-4 relative">
            <h2 className="text-2xl font-semibold mb-6">Recommend for You</h2>
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-5 overflow-x-auto scrollbar-hide scroll-smooth"
                style={{ scrollSnapType: "x mandatory", paddingBottom: "10px" }}
            >
                {recommendedSongs.slice(0, visibleSongs).map((song) => (
                    <div key={song.id} style={{ scrollSnapAlign: "start" }}>
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
                        className="flex flex-col items-center justify-center cursor-pointer group rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 w-[140px] mx-2 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        style={{ scrollSnapAlign: "start" }}
                    >
                        <ChevronRight
                            size={32}
                            className="text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-white"
                        />
                        <p className="mt-2 text-sm font-semibold text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-white">
                            Load More
                        </p>
                    </div>
                )}
            </div>

            {showScrollLeft && (
                <Button
                    onClick={handleScrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 shadow-md rounded-full p-2 z-10"
                >
                    <ChevronLeft size={20} className="text-white" />
                </Button>
            )}

            {showScrollRight && (
                <Button
                    onClick={handleScrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 shadow-md rounded-full p-2 z-10"
                >
                    <ChevronRight size={20} className="text-white" />
                </Button>
            )}
        </div>
    );
};

export default RecommendForYou;
