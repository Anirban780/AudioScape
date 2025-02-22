import React from "react";
import Sidebar from "../components/Home/Sidebar";
import SearchBar from "../components/Home/SearchBar";
import { Sun, Moon } from "lucide-react";
import UserMenu from "../components/Auth/UserMenu";
import { useTheme } from "../ThemeProvider";

const HomePage = () => {
  const { theme, setTheme } = useTheme(); // Get current theme and setter function

  return (
    <div className={`h-screen flex transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"}`}>
      <Sidebar />

      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center p-4">
          <SearchBar />
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 mx-2 rounded-full bg-gray-200 dark:bg-gray-500 transition-all"
          >
            {theme === "dark" ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-900" />}
          </button>
          
          <UserMenu />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
