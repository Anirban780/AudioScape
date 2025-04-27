import { Search } from "lucide-react";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "utils/components/ui/input";
import { useTheme } from "../../ThemeProvider";
import axios from "axios";
import placeholder from '../../assets/placeholder.jpg';
import { getBackendURL } from "../../utils/api";
import toast from "react-hot-toast";

const SearchBar = ({ onSelectTrack }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const observer = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch search results from backend (which queries YouTube API)
  const fetchSearchResults = async (searchQuery, nextPage = "") => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = await getBackendURL();
      const response = await axios.get(
        `${BASE_URL}/youtube/search?query=${searchQuery}`
      );

      setResults((prev) => (nextPage ? [...prev, ...response.data.tracks] : response.data.tracks));
      setPageToken(response.data.nextPageToken || null);

    } catch (error) {
      console.error("Error fetching search results:", error);
      toast.error("Search is currently unavailable. Please try next day");

    } finally {
      setLoading(false);
    }
  };

  // Debounce function to optimize API calls
  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedSearch = useCallback(debounce(fetchSearchResults, 500), []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setResults([]);  // Clear previous results
    setPageToken(null);
    debouncedSearch(value);
  };

  // Infinite Scroll: Load more results when user reaches the end
  useEffect(() => {
    if (!pageToken || loading) return;

    const observerInstance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchSearchResults(query, pageToken);
        }
      },
      { threshold: 1.0 }
    );

    if (observer.current) observerInstance.observe(observer.current);
    return () => observerInstance.disconnect();
  }, [pageToken, query]);


  // Handle track selection
  const handleTrackSelect = async (track) => {
    if (!track.videoId) {
      console.error("Track ID is undefined!");
      return;
    }

    try {
      const BASE_URL = await getBackendURL();
      const response = await axios.get(
        `${BASE_URL}/youtube/track/${track.videoId}`,
        { timeout: 5000 } // Add timeout of 5 sec to avoid hanging
      );

      console.log(response.data);

      onSelectTrack({
        id: track.videoId,
        name: response.data.title,
        artist: response.data.channelTitle, // YouTube channel = Artist
        thumbnail: response.data.thumbNail || placeholder,
      });

      setIsFocused(false);
      setQuery(""); // Clear search input
      toast.success("Search Track selected successfully");

    } catch (error) {
      console.error("Error fetching track details:", error);
      toast.error("Track couldn't be selected");
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto px-2 sm:px-4">

      {/* Search Input */}
      <div
        className={`flex items-center rounded-md p-2 transition-colors duration-300 
      ${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-200 text-black"}`}
      >
        <Search size={20} className={theme === "dark" ? "text-gray-400" : "text-gray-600"} />
        <Input
          type="text"
          placeholder="Search for songs..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!dropdownRef.current?.contains(e.relatedTarget)) {
              setIsFocused(false);
            }
          }}
          className={`ml-2 outline-none w-full transition-colors duration-300 text-sm sm:text-base
        ${theme === "dark" ? "bg-gray-700 text-white placeholder-gray-400" : "bg-gray-200 text-black placeholder-gray-600"}`}
        />
      </div>

      {/* Dropdown */}
      {isFocused && results.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 w-full mt-2 p-2 rounded-md shadow-lg max-h-80 overflow-y-auto transition-opacity duration-300 z-50
        ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}
        >
          {results.map((track, index) => (
            <div
              key={`${track.videoId}-${index}`}
              className="flex items-center p-2 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer rounded"
              onMouseDown={() => handleTrackSelect(track)}
            >
              <img src={track.thumbNail || placeholder} alt="Thumbnail" className="w-10 h-10 sm:w-12 sm:h-12 rounded-md mr-3 flex-shrink-0" />
              <div className="flex flex-col">
                <p className="font-semibold text-sm sm:text-base line-clamp-1">{track.title}</p>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">{track.channelTitle}</p>
              </div>
            </div>
          ))}
          {loading && <p className="mt-2 text-center font-semibold">Loading more...</p>}
          <div ref={observer} className="h-10"></div>
        </div>
      )}
    </div>

  );
};

export default SearchBar;
