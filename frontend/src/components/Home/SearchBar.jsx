import { Search } from "lucide-react";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import placeholder from "@/assets/placeholder.jpg";
import { getBackendURL } from "@/utils/api";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * SEARCH BAR COMPONENT (SearchBar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Live search bar with debounced input query handling, backend YouTube API integration,
 * infinite scroll pagination, and track selection dropdown menu.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Design Token Integration: Replaced hardcoded `bg-gray-800` / `bg-gray-200` with
 *    semantic surface tokens (`bg-[var(--color-surface-raised)]`, `bg-[var(--color-surface-overlay)]`,
 *    `border-[var(--color-border-default)]`).
 * 2. API Quota Conservation: Uses a 500ms debouncer (`debouncedSearch`) to prevent firing
 *    unnecessary API calls on every keystroke.
 * 3. Infinite Scroll: Uses `IntersectionObserver` to automatically fetch subsequent search pages
 *    when scrolling down the search results dropdown.
 * 
 * HOW IT WORKS:
 * - `handleInputChange`: Updates `query` state and calls debounced search API helper.
 * - `fetchSearchResults`: Queries backend `/youtube/search?query=...` endpoint.
 * - `handleTrackSelect`: Fetches full track metadata for selected YouTube video ID and passes it
 *   to `onSelectTrack` callback (which updates `usePlayerStore`).
 */
const SearchBar = ({ onSelectTrack }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const observer = useRef(null);
  const dropdownRef = useRef(null);

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
      toast.error("Search is currently unavailable. Please try again");

    } finally {
      setLoading(false);
    }
  };

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
    setResults([]);
    setPageToken(null);
    debouncedSearch(value);
  };

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
  }, [pageToken, query, loading]);

  const handleTrackSelect = async (track) => {
    if (!track.videoId) {
      console.error("Track ID is undefined!");
      return;
    }

    try {
      const BASE_URL = await getBackendURL();
      const response = await axios.get(
        `${BASE_URL}/youtube/track/${track.videoId}`,
        { timeout: 5000 }
      );

      onSelectTrack({
        id: track.videoId,
        name: response.data.title,
        artist: response.data.channelTitle,
        thumbnail: response.data.thumbNail || placeholder,
      });

      setIsFocused(false);
      setQuery("");
      toast.success("Search Track selected successfully");

    } catch (error) {
      console.error("Error fetching track details:", error);
      toast.error("Track couldn't be selected");
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Search Input Box */}
      <div className="flex items-center rounded-xl p-2 bg-[var(--color-surface-base)] border border-[var(--color-border-default)] focus-within:border-[var(--color-primary)] transition-all shadow-inner">
        <Search size={18} className="ml-2 text-[var(--color-on-surface-variant)] shrink-0" />
        <Input
          type="text"
          placeholder="Search songs, artists, genres..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!dropdownRef.current?.contains(e.relatedTarget)) {
              setIsFocused(false);
            }
          }}
          className="ml-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-[var(--color-on-surface-variant)]/60 text-[var(--color-on-surface)]"
        />
      </div>

      {/* Live Search Results Dropdown Panel */}
      {isFocused && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 w-full mt-2 p-2 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50 bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] transition-all"
        >
          {results.map((track, index) => (
            <div
              key={`${track.videoId}-${index}`}
              className="flex items-center p-2.5 hover:bg-[var(--color-state-hover)] cursor-pointer rounded-xl transition-colors"
              onMouseDown={() => handleTrackSelect(track)}
            >
              <img 
                src={track.thumbNail || placeholder} 
                alt="Thumbnail" 
                className="w-11 h-11 rounded-lg object-cover mr-3 flex-shrink-0 shadow-sm" 
              />
              <div className="flex flex-col min-w-0 flex-1">
                <p className="font-semibold text-sm line-clamp-1 text-[var(--color-on-surface)]">{track.title}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] line-clamp-1 mt-0.5">{track.channelTitle}</p>
              </div>
            </div>
          ))}
          {loading && <p className="p-3 text-center text-xs font-medium text-[var(--color-on-surface-variant)]">Loading more...</p>}
          <div ref={observer} className="h-4"></div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
