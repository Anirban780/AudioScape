import React, { useState } from "react";
import Sidebar from "../components/Home/Sidebar";
import SearchBar from "../components/Home/SearchBar";
import { Sun, Moon, Menu } from "lucide-react";
import UserMenu from "../components/Auth/UserMenu";
import { useTheme } from "../ThemeProvider";
import HeroSection from "../components/Home/HeroSection";
import RecentlyPlayed from "../components/Home/RecentlyPlayed";
import { useAuth } from "../context/AuthContext";
import PlayerContainer from "../components/Player/PlayerContainer";
import ResponsiveLayout from "../ResponsiveLayout";
import usePlayerStore from "../store/usePlayerStore";
import RecommendForYou from "../components/Home/RecommendForYou";

const HomePage = () => {
  const { theme, setTheme } = useTheme();
  const {track , setTrack} = usePlayerStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className={`h-screen flex transition-all duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"}`}>
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 h-full bg-white dark:bg-gray-900 shadow-md relative z-50">
            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto py-4 px-4 sm:px-6">
        <ResponsiveLayout>
          {/* Top Navbar */}
          <div className="flex justify-between items-center w-full">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded bg-gray-200 dark:bg-gray-700"
            >
              <Menu size={20} />
            </button>

            {/* Search Bar */}
            <div className="w-full max-w-lg mx-auto">
              <SearchBar onSelectTrack={setTrack} />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 mx-4 rounded-full bg-gray-300 dark:bg-gray-700 transition-all"
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-gray-900" />
              )}
            </button>

            {/* User Menu */}
            <UserMenu />
          </div>

          {/* Track Info & Hero */}
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mt-6 flex flex-col relative">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">🌐 Now Streaming 🎧</h1>
            <HeroSection />
          </div>

          {/* Recommended for you */}
          {user && (
            <div className="mt-6">
              <RecommendForYou userId={user.uid} />
            </div>
          )}

          {/* Recently Played */}
          {user && (
            <div className="mt-4">
              <RecentlyPlayed userId={user.uid} />
            </div>
          )}
        </ResponsiveLayout>
      </div>

      {/* Inline Player */}
      {track && (
          <PlayerContainer
            onClose={() => setTrack(null)}
            uid={user.uid}
          />
      )}
    </div>
  );
};

export default HomePage;
