import React, { useState } from "react";
import Sidebar from "@/components/Home/Sidebar";
import SearchBar from "@/components/Home/SearchBar";
import UserMenu from "@/components/Auth/UserMenu";
import { useTheme } from "@/ThemeProvider";
import { Sun, Moon, Menu } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";

/**
 * ============================================================================
 * APP LAYOUT SHELL (AppLayout.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Serves as the primary application layout shell for all authenticated pages.
 * It houses the responsive navigation sidebar, sticky top header bar (search,
 * theme toggle, user avatar menu), and main content viewport.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Source of Layout Truth: Eliminates duplicated sidebar/navbar code across
 *    individual page components (Home, Explore, Favorites, Playlists, Help).
 * 2. Stitch Design System Token Integration: Uses semantic CSS tokens
 *    (--color-surface-base, --color-surface-raised, --color-border-default) to seamlessly
 *    switch between Midnight Studio (Dark) and Aura Lumina (Light) themes.
 * 3. Bottom Player Dock Clearance: Enforces a persistent `pb-28 md:pb-32` bottom padding
 *    on the main viewport so floating MiniPlayer and queue controls never cover page content.
 * 4. Responsive Breakpoints: Renders fixed sidebar on desktop (≥768px) and a sliding
 *    backdrop drawer on mobile (<768px).
 * 
 * HOW IT WORKS:
 * - Top header features a glassmorphic bar (`backdrop-blur-md`) containing SearchBar,
 *   Dark/Light theme toggle button, and UserMenu avatar.
 * - Mobile menu button toggles `isSidebarOpen` state to open/close the mobile overlay drawer.
 * - Main viewport wraps child page components in a max-width container (`max-w-7xl`).
 */
const AppLayout = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { setTrack } = usePlayerStore();

  return (
    <div className="h-screen flex overflow-hidden transition-colors duration-300 bg-[var(--color-surface-base)] text-[var(--color-on-surface)]">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 w-60 border-r border-[var(--color-border-default)] bg-[var(--color-surface-raised)]">
        <Sidebar />
      </aside>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Sliding drawer panel */}
          <div className="w-64 h-full relative z-50 bg-[var(--color-surface-raised)] shadow-2xl border-r border-[var(--color-border-default)]">
            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        {/* Sticky Top Navigation Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3 bg-[var(--color-surface-raised)]/80 backdrop-blur-md border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-3 w-full max-w-7xl mx-auto">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-[var(--color-surface-base)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Central Search Bar */}
            <div className="flex-1 max-w-lg mx-auto">
              <SearchBar onSelectTrack={setTrack} />
            </div>

            {/* Right Header Actions: Theme Toggle & User Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full bg-[var(--color-surface-base)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun size={18} className="text-yellow-400" />
                ) : (
                  <Moon size={18} className="text-indigo-600" />
                )}
              </button>

              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Page Content Area with Persistent Player Dock Clearance */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-28 md:pb-32">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
