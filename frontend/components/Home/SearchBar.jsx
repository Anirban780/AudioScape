import { Search } from "lucide-react";
import React, { useState } from "react";
import { Input } from "utils/components/ui/input"; // Fixed alias path
import { useTheme } from "../../ThemeProvider"; // Import useTheme hook

const SearchBar = () => {
  const { theme } = useTheme(); // Get current theme state
  const [query, setQuery] = useState("");

  return (
    <div
      className={`flex items-center rounded-md p-2 w-full max-w-lg mx-auto my-auto transition-colors duration-300 
      ${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-200 text-black"}`}
    >
      <Search
        size={20}
        className={theme === "dark" ? "text-gray-400" : "text-gray-600"}
      />
      <Input
        type="text"
        placeholder="Search your songs, albums, artists"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`ml-2 outline-none w-full transition-colors duration-300 
          ${theme === "dark" ? "bg-gray-700 text-white placeholder-gray-400" : "bg-gray-200 text-black placeholder-gray-600"}`}
      />
    </div>
  );
};

export default SearchBar;
