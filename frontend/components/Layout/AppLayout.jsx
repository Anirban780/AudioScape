import React, { useState } from "react";
import Sidebar from "../Home/Sidebar";
import SearchBar from "../Home/SearchBar";
import UserMenu from "../Auth/UserMenu";
import { useTheme } from "../../ThemeProvider";
import { Sun, Moon, Menu } from "lucide-react";
import ResponsiveLayout from "../../ResponsiveLayout";
import usePlayerStore from "../../store/usePlayerStore";

const AppLayout = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { setTrack } = usePlayerStore();

  return (
    <div
      className={`h-screen flex transition-all duration-300 ${
        theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 h-full bg-white dark:bg-gray-900 shadow-md relative z-50">
            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <ResponsiveLayout>
          {/* Top Navbar */}
          <div className="flex justify-between items-center w-full">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded bg-gray-200 dark:bg-gray-700"
            >
              <Menu size={20} />
            </button>

            <div className="w-full max-w-lg mx-auto">
              <SearchBar onSelectTrack={setTrack} />
            </div>

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

            <UserMenu />
          </div>

          {/* Page Children */}
          {children}
        </ResponsiveLayout>
      </div>
    </div>
  );
};

export default AppLayout;
