import React, { useEffect, useRef, useState, useCallback } from "react";
import { fetchLastPlayed } from "../../utils/api";
import { useTheme } from "../../ThemeProvider";
import placeholder from "../../assets/placeholder.jpg";
import { Button } from "../../../utils/components/ui/button";
import { ChevronRight } from "lucide-react";

const RecentlyPlayed = ({ userId, setTrack }) => {
  const { theme } = useTheme();
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [visibleSongs, setVisibleSongs] = useState(8);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (userId) {
      fetchLastPlayed(userId).then(setRecentlyPlayed);
    }
  }, [userId]);

  // Check if the scroll container is not at the end
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowScrollButton(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  // Scroll right when the arrow button (if present) is clicked
  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Handle load more action
  const handleLoadMore = () => {
    setVisibleSongs(prev => prev + 8);
  };

  if (!recentlyPlayed.length) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-6 ml-4 relative">
      <h2 className="text-2xl font-semibold mb-6">Recently Played</h2>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: "x mandatory", paddingBottom: "10px" }}
      >
        {recentlyPlayed.slice(0, visibleSongs).map((song) => (
          <div
            key={song.id}
            onClick={() => setTrack(song)}
            className={`group relative rounded-lg overflow-hidden cursor-pointer
              ${theme === "dark" ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"}
              shadow-md hover:shadow-lg transition-all duration-300
              w-full min-w-[180px] max-w-[200px] mx-2`}
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={song.thumbnail || placeholder}
                alt={song.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-3">
              <p className={`font-medium truncate text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {song.name}
              </p>
              <p className={`text-xs truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                {song.artist}
              </p>
            </div>
          </div>
        ))}

        {/* Load More Card */}
        {visibleSongs < recentlyPlayed.length && (
          <div
            onClick={handleLoadMore}
            className="flex flex-col items-center justify-center cursor-pointer group rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 min-w-[80px] max-w-[140px] mx-2 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            style={{ scrollSnapAlign: "start" }}
          >
            <ChevronRight size={32} className="text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-white" />
            <p className="mt-2 text-sm font-semibold text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-white">
              Load More
            </p>
          </div>
        )}
      </div>

      {/* Right Scroll Button (optional, if not using load more card exclusively) */}
      {showScrollButton && (
        <Button
          onClick={handleScrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 shadow-md rounded-full p-2"
        >
          <ChevronRight size={20} className="text-white" />
        </Button>
      )}
    </div>
  );
};

export default RecentlyPlayed;
