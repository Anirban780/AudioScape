// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { cn } from 'utils/lib/utils'; // Utility for combining class names
import { Home, Compass, Library, Heart, Menu, Sun, Moon } from 'lucide-react'; // Added Sun/Moon for theme toggle
import { Link } from 'react-router-dom';
import { Button } from 'utils/components/ui/button';
import { useTheme } from '../../ThemeProvider'; // Adjust path to ThemeProvider

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme(); // Access theme context

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  
  const MenuItem = ({ icon: Icon, text, to }) => (
    <li>
      <Link
        to={to}
        className={cn(
          'flex items-center gap-4 cursor-pointer transition-colors duration-300 py-2 px-1 rounded-md',
          'hover:bg-primary/20',
          !isOpen && 'justify-center px-0'
        )}
      >
        <Icon size={24} />
        {isOpen && <span>{text}</span>}
      </Link>
    </li>
  );

  return (
    <div
      className={cn(
        'h-screen p-4 transition-all duration-300 ease-in-out border-r border-border',
        isOpen ? 'w-60' : 'w-20',
        // Apply theme-based background and text colors
        theme === 'dark' || (theme === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches)
          ? 'bg-gray-900 text-white border-white/40'
          : 'bg-slate-200 text-foreground border-gray-900/50'
      )}
    >
      <div className="flex items-center gap-4 mb-6 ml-1">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu size={28} />
        </Button>
        {isOpen && <h1 className="text-2xl font-bold">AudioScape</h1>}
      </div>
      <ul className={cn('space-y-2', isOpen && 'px-4', !isOpen && 'flex flex-col items-center')}>
        <MenuItem icon={Home} text="Home" to="/home" />
        <MenuItem icon={Compass} text="Explore" to="/explore" />
        <MenuItem icon={Library} text="Library" to="/library" />
        <MenuItem icon={Heart} text="Liked Songs" to="/liked-songs" />
      </ul>
      
    </div>
  );
};

export default Sidebar;