import React, { useState } from 'react';
import Sidebar from "../components/Home/Sidebar";
import SearchBar from '../components/Home/SearchBar';
import { Sun, Moon } from 'lucide-react';

const HomePage = () => {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={`${darkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-black'} flex h-screen transition-colors duration-300`}>
      <Sidebar />
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center p-4">
          <SearchBar darkMode={darkMode} />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-500  transition-all"
          >
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-900" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
