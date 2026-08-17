import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Compass, Library, Heart, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import usePlayerStore from '@/store/usePlayerStore';
import useSidebarStore from '@/store/useSidebarStore';

/**
 * ============================================================================
 * NAVIGATION SIDEBAR (Sidebar.jsx) - Global State & Smooth Styling
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary navigation sidebar rail supporting:
 * 1. Desktop Expandable/Collapsible Rail (w-60 <-> w-20) synced with global Zustand store.
 * 2. Mobile Backdrop Overlay Drawer mode.
 * 3. Rich, non-tight active & hover pill styling with breathing room.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Global State Persistence: Uses `useSidebarStore` (`isSidebarCollapsed`) so the sidebar
 *    state remains persisted across all page navigations (Home -> Explore -> Favourites -> Playlists).
 * 2. Generous Pill Padding: Replaced tight items with spacious `py-3.5 px-4 my-1 rounded-2xl` pills,
 *    subtle glassmorphic active background (`bg-[var(--color-primary)]/15`), and left accent bar.
 * 3. Button-First Header Layout: Places toggle icon first on left, followed by "AudioScape" title.
 * 
 * HOW IT WORKS:
 * - Reads `isSidebarCollapsed` & `toggleSidebarCollapsed` from `useSidebarStore`.
 * - Applies smooth `.sidebar-transition` utility for fluid layout pacing.
 */

const Sidebar = ({
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  isOpen: externalOpen,
  onToggle,
  isMobile = false,
}) => {
  const { isSidebarCollapsed: storeCollapsed, toggleSidebarCollapsed } = useSidebarStore();

  const isCollapsed = isMobile
    ? false
    : typeof externalCollapsed === 'boolean'
    ? externalCollapsed
    : storeCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    } else if (onToggle) {
      onToggle(false);
    } else {
      toggleSidebarCollapsed();
    }
  };

  const location = useLocation();

  const MenuItem = ({ icon: Icon, text, to }) => {
    const isActive = location.pathname === to;

    return (
      <li className="w-full">
        <Link
          to={to}
          title={isCollapsed ? text : undefined}
          className={cn(
            'group relative flex items-center cursor-pointer transition-all duration-200 select-none my-1.5',
            isCollapsed
              ? 'w-12 h-12 mx-auto justify-center rounded-2xl'
              : 'w-full py-3.5 px-4 gap-3.5 rounded-2xl',
            isActive 
              ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-extrabold border border-[var(--color-primary)]/25 shadow-xs' 
              : 'hover:bg-[var(--color-primary)]/10 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] font-medium'
          )}
        >
          {/* Active Left Accent Bar (Expanded Mode) */}
          {isActive && !isCollapsed && (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[var(--color-primary)] shadow-xs" />
          )}

          <Icon
            size={22}
            className={cn(
              'shrink-0 transition-transform duration-200 group-hover:scale-110',
              isActive ? 'text-[var(--color-primary)] drop-shadow-xs' : 'text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)]'
            )}
          />

          {!isCollapsed && (
            <span className="truncate text-sm tracking-wide">{text}</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <div
      className={cn(
        'h-full px-3 py-3 sidebar-transition bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] flex flex-col w-full select-none'
      )}
    >
      {/* Sidebar Header: Toggle Button FIRST on Left, Followed by "AudioScape" Title */}
      <div
        className={cn(
          'min-h-[56px] flex items-center mb-4 sidebar-transition',
          isCollapsed ? 'justify-center w-full' : 'justify-start gap-3 w-full px-1'
        )}
      >
        {/* New PanelLeft Toggle Button */}
        <button 
          onClick={handleToggle}
          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-primary)]/10 rounded-xl shrink-0 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-all cursor-pointer"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
        </button>

        {/* Brand Header Name - Displayed ONLY in Expanded State */}
        {!isCollapsed && (
          <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-purple-400 to-[var(--color-secondary)] tracking-tight truncate">
            AudioScape
          </h1>
        )}
      </div>

      {/* Navigation Links List */}
      <ul className={cn('space-y-1 flex-1', isCollapsed && 'flex flex-col items-center')}>
        <MenuItem icon={Home} text="Home" to="/home" />
        <MenuItem icon={Compass} text="Explore" to="/explore" />
        <MenuItem icon={Heart} text="Favourites" to="/favourites" />
        <MenuItem icon={Library} text="Playlists" to="/playlists" />
      </ul>
    </div>
  );
};

export default Sidebar;
