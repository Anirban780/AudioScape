import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Library, Heart, History, PanelLeftClose, PanelLeftOpen, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import usePlayerStore from '@/store/usePlayerStore';
import useSidebarStore from '@/store/useSidebarStore';
import { AudioScapeMark } from '@/components/common/AudioScapeLogo';

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
 * 4. User preference toggle for default player launch mode (Full Screen vs Mini Player).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Global State Persistence: Uses `useSidebarStore` (`isSidebarCollapsed`) so the sidebar
 *    state remains persisted across all page navigations (Home -> Explore -> Favourites -> Playlists -> History).
 * 2. Generous Pill Padding: Replaced tight items with spacious `py-3.5 px-4 my-1 rounded-2xl` pills,
 *    subtle glassmorphic active background (`bg-[var(--color-primary)]/15`), and left accent bar.
 * 3. Button-First Header Layout: Places toggle icon first on left, followed by "AudioScape" title.
 * 
 * HOW IT WORKS:
 * - Reads `isSidebarCollapsed` & `toggleSidebarCollapsed` from `useSidebarStore`.
 * - Reads `defaultPlayerMode` & `toggleDefaultPlayerMode` from `usePlayerStore`.
 * - Applies smooth `.sidebar-transition` utility for fluid layout pacing.
 */

const MenuItem = React.memo(({ icon: Icon, text, to, isCollapsed, isActive }) => {
  return (
    <li className="w-full">
      <Link
        to={to}
        title={isCollapsed ? text : undefined}
        className={cn(
          'group relative flex items-center cursor-pointer transition-colors duration-150 select-none my-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40',
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
            'shrink-0 transition-transform duration-150 group-hover:scale-110',
            isActive ? 'text-[var(--color-primary)] drop-shadow-xs' : 'text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)]'
          )}
        />

        {!isCollapsed && (
          <span className="truncate text-sm tracking-wide">{text}</span>
        )}
      </Link>
    </li>
  );
});
MenuItem.displayName = "SidebarMenuItem";

const Sidebar = ({
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  isOpen: externalOpen,
  onToggle,
  isMobile = false,
}) => {
  const storeCollapsed = useSidebarStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useSidebarStore((s) => s.toggleSidebarCollapsed);
  const defaultPlayerMode = usePlayerStore((s) => s.defaultPlayerMode);
  const toggleDefaultPlayerMode = usePlayerStore((s) => s.toggleDefaultPlayerMode);

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

  return (
    <div
      className={cn(
        'h-full px-3 py-3 sidebar-transition bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] flex flex-col w-full select-none'
      )}
    >
      {/* Sidebar Header: Brand Logo & Title (Uncompressed, spacious layout) */}
      <div
        className={cn(
          'min-h-[56px] flex items-center mb-4 sidebar-transition',
          isCollapsed ? 'justify-center w-full' : 'justify-start w-full px-1.5'
        )}
      >
        <Link
          to="/home"
          className={cn(
            'flex items-center gap-3 cursor-pointer group transition-transform duration-200',
            isCollapsed && 'justify-center'
          )}
          title="AudioScape Home"
        >
          {/* Brand Mark in Dark Obsidian Squircle */}
          <div className="p-1.5 rounded-xl bg-[#0A0E1A]/90 border border-[#00F0FF]/30 text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] group-hover:scale-105 transition-transform shrink-0">
            <AudioScapeMark size={isCollapsed ? 24 : 26} variant="gradient" />
          </div>

          {/* Brand Header Name - Displayed ONLY in Expanded State */}
          {!isCollapsed && (
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] via-[#8A2BE2] to-[#FF66CC] tracking-tight truncate leading-tight">
              AudioScape
            </h1>
          )}
        </Link>
      </div>

      {/* Navigation Links List */}
      <ul className={cn('space-y-1 flex-1', isCollapsed && 'flex flex-col items-center')}>
        <MenuItem icon={Home} text="Home" to="/home" isCollapsed={isCollapsed} isActive={location.pathname === "/home"} />
        <MenuItem icon={Sparkles} text="Discover" to="/recommendations" isCollapsed={isCollapsed} isActive={location.pathname === "/recommendations"} />
        <MenuItem icon={Heart} text="Favourites" to="/favourites" isCollapsed={isCollapsed} isActive={location.pathname === "/favourites"} />
        <MenuItem icon={Library} text="Playlists" to="/playlists" isCollapsed={isCollapsed} isActive={location.pathname === "/playlists"} />
        <MenuItem icon={History} text="History" to="/history" isCollapsed={isCollapsed} isActive={location.pathname === "/history"} />
      </ul>

      {/* Sidebar Footer: Player Mode Setting & Collapse Toggle */}
      <div className={cn('mt-auto pt-2 border-t border-[var(--color-border-default)]/30 flex flex-col gap-1.5', isCollapsed && 'items-center')}>
        {/* Default Player Mode Switcher */}
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleDefaultPlayerMode}
            className="group w-12 h-12 flex items-center justify-center rounded-2xl cursor-pointer text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors duration-150 border border-transparent hover:border-[var(--color-primary)]/30 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
            title={`Default Player: ${defaultPlayerMode === 'full' ? 'Full Screen' : 'Mini Player'} (Click to switch)`}
            aria-label={`Default Player: ${defaultPlayerMode === 'full' ? 'Full Screen' : 'Mini Player'}`}
          >
            {defaultPlayerMode === 'full' ? (
              <Maximize2 size={20} className="text-[var(--color-primary)] transition-transform duration-150 group-hover:scale-110" />
            ) : (
              <Minimize2 size={20} className="text-[var(--color-on-surface-variant)] transition-transform duration-150 group-hover:scale-110" />
            )}
          </button>
        ) : (
          <div className="flex items-center justify-between py-1.5 px-3 rounded-2xl bg-[var(--color-surface-base)]/40 border border-[var(--color-border-default)]/60 text-xs my-0.5">
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
              {defaultPlayerMode === 'full' ? (
                <Maximize2 size={16} className="text-[var(--color-primary)] shrink-0" />
              ) : (
                <Minimize2 size={16} className="text-[var(--color-primary)] shrink-0" />
              )}
              <span className="font-semibold text-xs text-[var(--color-on-surface)]">Player</span>
            </div>
            <button
              type="button"
              onClick={toggleDefaultPlayerMode}
              className="inline-flex items-center p-0.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] cursor-pointer transition-colors duration-150 hover:border-[var(--color-primary)]/40 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
              title={`Default player mode: ${defaultPlayerMode === 'full' ? 'Full Screen' : 'Mini Player'} (Click to toggle)`}
            >
              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors duration-150',
                  defaultPlayerMode === 'full'
                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-xs'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                )}
              >
                Full
              </span>
              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors duration-150',
                  defaultPlayerMode === 'mini'
                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-xs'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                )}
              >
                Mini
              </span>
            </button>
          </div>
        )}

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'group flex items-center transition-colors duration-150 cursor-pointer text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40',
            isCollapsed 
              ? 'w-12 h-12 justify-center rounded-2xl' 
              : 'w-full py-2.5 px-3.5 gap-3 rounded-2xl'
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={20} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
          ) : (
            <>
              <PanelLeftClose size={20} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
              <span className="truncate text-xs font-semibold tracking-wider uppercase text-[var(--color-on-surface-variant)]">
                Collapse
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
