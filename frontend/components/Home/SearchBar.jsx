import { Search } from "lucide-react";
import React, { useState, useRef, useCallback } from "react";
import { Input } from "utils/components/ui/input"; // Fixed alias path
import { useTheme } from "../../ThemeProvider"; // Import useTheme hook
import axios from "axios";

const SearchBar = () => {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch search results with debounce
  const fetchSearchResults = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/spotify/search?query=${searchQuery}`
      );
      setResults(response.data);
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce function
  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedSearch = useCallback(debounce(fetchSearchResults, 500), []);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <div className="relative w-full max-w-lg mx-auto my-auto">
      {/* Search Input */}
      <div
        className={`flex items-center rounded-md p-2 transition-colors duration-300 
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-200 text-black"}`}
      >
        <Search
          size={20}
          className={theme === "dark" ? "text-gray-400" : "text-gray-600"}
        />
        <Input
          type="text"
          placeholder="Search for songs, albums, artists"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!dropdownRef.current?.contains(e.relatedTarget)) {
              setIsFocused(false); // Close dropdown only if the next focused element is not inside the dropdown
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
          tabIndex={-1} // Allows focus shifting inside the dropdown
          className={`absolute left-0 w-full mt-2 p-2 rounded-md shadow-lg max-h-60 overflow-y-auto transition-opacity duration-300 
          ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}
        >
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : (
            results.map((track) => (
              <div
                key={track.id}
                className="flex items-center p-2 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                tabIndex={0} // Allows dropdown items to be focusable
                onClick={() => setIsFocused(false)}
              >
                <img src={track.album.images[0]?.url} alt="Album Art" className="w-10 h-10 rounded-md mr-3" />
                <div>
                  <p className="font-semibold">{track.name}</p>
                  <p className="text-sm text-gray-500">{track.artists.map(a => a.name).join(", ")}</p>
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
