import React, { useState } from 'react';
import { cn } from 'utils/lib/utils';
import { Home, Compass, Library, Heart, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from 'utils/components/ui/button';
import { useTheme } from '../../ThemeProvider';

const Sidebar = ({ isOpen: externalOpen, onToggle }) => {
  const isControlled = typeof externalOpen === 'boolean';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? externalOpen : internalOpen;

  const { theme } = useTheme();

  const toggleSidebar = () => {
    if (isControlled && onToggle) {
      onToggle(!externalOpen);
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

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
        theme === 'dark' || (theme === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches)
          ? 'bg-gray-800 text-white border-white/40'
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
        <MenuItem icon={Heart} text="Favourites" to="/favourites" />
        <MenuItem icon={Library} text="Playlists" to="/playlists" />
        
      </ul>
    </div>
  );
};

export default Sidebar;
