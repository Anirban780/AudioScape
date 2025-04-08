import React, { useState } from "react";
import Sidebar from "../components/Home/Sidebar";
import SearchBar from "../components/Home/SearchBar";
import { Sun, Moon, X, Menu } from "lucide-react";
import UserMenu from "../components/Auth/UserMenu";
import { useTheme } from "../ThemeProvider";
import HeroSection from "../components/Home/HeroSection";
import RecentlyPlayed from "../components/Home/RecentlyPlayed";
import { useAuth } from "../context/AuthContext";
import PlayerContainer from "../components/Player/PlayerContainer";
import ResponsiveLayout from "../ResponsiveLayout"; // Import layout

const HomePage = () => {
  const { theme, setTheme } = useTheme();
  const [currentTrack, setCurrentTrack] = useState(null);
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
          {/* Sidebar */}
          <div className="w-60 h-full bg-white dark:bg-gray-900  shadow-md relative z-50">
            
            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>

        </div>
      )}


      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto py-4 px-4 sm:px-6">
        <ResponsiveLayout>
          {/* Top Navbar */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            {/* Left: Hamburger (Mobile Only) + Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded bg-gray-200 dark:bg-gray-700"
              >
                <Menu size={20} />
              </button>
              <div className="flex-1">
                <SearchBar onSelectTrack={setCurrentTrack} />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 transition-all"
              >
                {theme === "dark" ? (
                  <Sun size={20} className="text-yellow-400" />
                ) : (
                  <Moon size={20} className="text-gray-900" />
                )}
              </button>
              <UserMenu />
            </div>
          </div>

          {/* Track Info & Player */}
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 flex flex-col relative">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">Now Playing</h1>
            {currentTrack ? (
              <>
                <button
                  onClick={() => setCurrentTrack(null)}
                  className="absolute top-4 right-4 p-2 bg-gray-300 dark:bg-gray-700 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
                <PlayerContainer initialTrack={currentTrack} />
              </>
            ) : (
              <HeroSection />
            )}
          </div>

          {/* Recently Played */}
          {user && (
            <div className="mt-6">
              <RecentlyPlayed userId={user.uid} setTrack={setCurrentTrack} />
            </div>
          )}
        </ResponsiveLayout>
      </div>
    </div>
  );
};

export default HomePage;
