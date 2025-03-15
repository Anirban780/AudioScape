import React, { useState } from "react";
import Sidebar from "../components/Home/Sidebar";
import SearchBar from "../components/Home/SearchBar";
import { Sun, Moon } from "lucide-react";
import UserMenu from "../components/Auth/UserMenu";
import { useTheme } from "../ThemeProvider";
import CurrentTrack from "../components/Home/CurrentTrack";
import MusicPlayer from "../components/Home/MusicPlayer";

const HomePage = () => {
  const { theme, setTheme } = useTheme();
  const [currentTrack, setCurrentTrack] = useState(null);

  return (
    <div
      className={`h-screen flex transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"
        }`}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto p-6">

        {/* Top Navbar */}
        <div className="flex justify-between items-center">
          <SearchBar onSelectTrack={setCurrentTrack} />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 mx-2 rounded-full bg-gray-200 dark:bg-gray-500 transition-all"
          >
            {theme === "dark" ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-gray-900" />
            )}

          </button>

          <UserMenu />

        </div>

        {/* Track Info & Music Player */}
        {currentTrack && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">

            <h1 className="text-2xl font-bold mb-4">Now Playing</h1>
            <div className="flex flex-col md:flex-row items-center">

              {/* Track Info */}
              <div className="flex-1">
                <CurrentTrack track={currentTrack} />
              </div>

              {/* Music Player */}
              <div className="flex-1">
                <MusicPlayer track={currentTrack} />
              </div>

            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default HomePage;
