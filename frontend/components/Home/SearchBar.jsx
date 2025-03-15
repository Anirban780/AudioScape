import { Search } from "lucide-react";
import React, { useState, useRef, useCallback } from "react";
import { Input } from "utils/components/ui/input";
import { useTheme } from "../../ThemeProvider";
import axios from "axios";
import placeholder from '../../assets/placeholder.jpg';

const SearchBar = ({ onSelectTrack }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch search results from backend (which queries YouTube API)
  const fetchSearchResults = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/youtube/search?query=${searchQuery}`
      );

      setResults(response.data); // Ensure your backend sends { tracks: [...] }

    } catch (error) {
      console.error("Error fetching search results:", error);
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
    debouncedSearch(value);
  };

  // Handle track selection
  const handleTrackSelect = async (track) => {
    if (!track.videoId) {
      console.error("Track ID is undefined!");
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/youtube/track/${track.videoId}`
      );

      onSelectTrack({
        id: track.videoId,
        name: response.data.title,
        artist: response.data.channelTitle, // YouTube channel = Artist
        thumbNail: response.data.thumbNail || placeholder,
      });

      setIsFocused(false);
      setQuery(""); // Clear search input

    } catch (error) {
      console.error("Error fetching track details:", error);
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto my-auto">
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
          className={`ml-2 outline-none w-full transition-colors duration-300 
          ${theme === "dark" ? "bg-gray-700 text-white placeholder-gray-400" : "bg-gray-200 text-black placeholder-gray-600"}`}
        />
      </div>

      {/* Search Results Dropdown */}
      {isFocused && results.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 w-full mt-2 p-2 rounded-md shadow-lg max-h-60 overflow-y-auto transition-opacity duration-300 z-10
          ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}
        >
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : (
            results.map((track, index) => (
              <div
                key={track.videoId || index}
                className="flex items-center p-2 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                onMouseDown={() => handleTrackSelect(track)}
              >
                <img 
                  src={track.thumbNail || placeholder} 
                  alt="Thumbnail" 
                  className="w-10 h-10 rounded-md mr-3" 
                />
                <div>
                  <p className="font-semibold">{track.title}</p>
                  <p className="text-sm text-gray-500">{track.channelTitle}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
