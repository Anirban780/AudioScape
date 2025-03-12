import React from "react";
import Sidebar from "../components/Home/Sidebar";
import SearchBar from "../components/Home/SearchBar";
import HeroSection from "../components/Home/HeroSection"; // Import HeroSection
import { Sun, Moon } from "lucide-react";
import UserMenu from "../components/Auth/UserMenu";
import { useTheme } from "../ThemeProvider";
import TrendingTracks from "../components/Home/TrendingTracks";

const HomePage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`h-screen flex transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"}`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto p-6">
        {/* Top Navbar */}
        <div className="flex justify-between items-center">
          <SearchBar />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 mx-2 rounded-full bg-gray-200 dark:bg-gray-500 transition-all"
          >
            {theme === "dark" ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-900" />}
          </button>

          <UserMenu />
        </div>

        {/* Hero Section - Centered and Adjusted */}
        <div className="flex justify-center mt-8 mx-20">
          <HeroSection />
        </div>

        {/* Add Recommended Songs, Favorites, Playlists Below */}
        <TrendingTracks />
      </div>
    </div>
  );
};

export default HomePage;
