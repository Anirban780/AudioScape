import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Home, Compass, Library, Heart, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * ============================================================================
 * NAVIGATION SIDEBAR (Sidebar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the primary navigation sidebar rail for desktop and mobile drawer views.
 * Displays brand logo, collapse/expand toggle button, and main route navigation links.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Design Token Integration: Replaced hardcoded `bg-gray-800` / `bg-slate-200` with
 *    semantic surface tokens (`bg-[var(--color-surface-raised)]`, `border-[var(--color-border-default)]`).
 * 2. Active Route Highlighting: Uses `useLocation()` to detect current active route and applies
 *    `bg-[var(--color-state-active)]` and `text-[var(--color-primary)]` active indicators.
 * 3. Controlled/Uncontrolled Dual Mode: Supports both controlled drawer state (for mobile AppLayout)
 *    and internal state (for standalone rail collapse).
 * 
 * HOW IT WORKS:
 * - `isOpen`: Evaluates controlled prop `externalOpen` or internal state `internalOpen`.
 * - `MenuItem`: Renders react-router `<Link>` with active route checking (`location.pathname === to`).
 */
const Sidebar = ({ isOpen: externalOpen, onToggle }) => {
  const isControlled = typeof externalOpen === 'boolean';
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = isControlled ? externalOpen : internalOpen;
  const location = useLocation();

  const toggleSidebar = () => {
    if (isControlled && onToggle) {
      onToggle(!externalOpen);
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const MenuItem = ({ icon: Icon, text, to }) => {
    const isActive = location.pathname === to;

    return (
      <li>
        <Link
          to={to}
          className={cn(
            'flex items-center gap-4 cursor-pointer transition-all duration-200 py-2.5 px-3 rounded-xl font-medium text-sm',
            isActive 
              ? 'bg-[var(--color-state-active)] text-[var(--color-primary)] font-semibold shadow-sm' 
              : 'hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]',
            !isOpen && 'justify-center px-0'
          )}
        >
          <Icon size={22} className={cn(isActive && 'text-[var(--color-primary)]')} />
          {isOpen && <span>{text}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div
      className={cn(
        'h-full p-4 transition-all duration-300 ease-in-out border-r border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] flex flex-col',
        isOpen ? 'w-60' : 'w-20'
      )}
    >
      {/* Sidebar Header & Toggle */}
      <div className="flex items-center gap-3 mb-8 ml-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="hover:bg-[var(--color-state-hover)] rounded-xl"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </Button>
        {isOpen && (
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] tracking-tight">
            AudioScape
          </h1>
        )}
      </div>

      {/* Navigation Links List */}
      <ul className={cn('space-y-2', !isOpen && 'flex flex-col items-center')}>
        <MenuItem icon={Home} text="Home" to="/home" />
        <MenuItem icon={Compass} text="Explore" to="/explore" />
        <MenuItem icon={Heart} text="Favourites" to="/favourites" />
        <MenuItem icon={Library} text="Playlists" to="/playlists" />
      </ul>
    </div>
  );
};

export default Sidebar;
