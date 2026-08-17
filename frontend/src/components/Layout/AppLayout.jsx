import React, { useState } from "react";
import Sidebar from "@/components/Home/Sidebar";
import SearchBar from "@/components/Home/SearchBar";
import UserMenu from "@/components/Auth/UserMenu";
import { useTheme } from "@/ThemeProvider";
import { Sun, Moon, Menu } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import useSidebarStore from "@/store/useSidebarStore";
import Footer from "@/components/Home/Footer";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * APP LAYOUT SHELL (AppLayout.jsx) - Global State & Ultra-Smooth Pacing
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary layout shell uniting top navigation header bar, desktop adjustable sidebar,
 * mobile drawer, and main content viewport.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Persisted Global Sidebar State: Connects to `useSidebarStore` (`isSidebarCollapsed`)
 *    so collapsing or expanding the sidebar stays persisted across all page navigations.
 * 2. Ultra-Smooth Layout Pacing: Applies `.sidebar-transition` utility with synchronized
 *    cubic-bezier easing curve (`cubic-bezier(0.4, 0, 0.2, 1)`), eliminating jittering during resizes.
 * 3. Rich Header & Content Spacing: Restored generous padding on search bar header (`py-4 px-6 md:px-10`)
 *    and outer page margins (`px-6 sm:px-10 md:px-14 lg:px-16 pt-8`).
 * 
 * HOW IT WORKS:
 * - Desktop `<aside>` width dynamically syncs with `isSidebarCollapsed` (`w-60` <-> `w-20`).
 * - Mobile drawer is toggled via `isSidebarOpen`.
 */

const AppLayout = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarStore();
  const { setTrack } = usePlayerStore();

  return (
    <div className="h-screen flex overflow-hidden transition-colors duration-300 bg-[var(--color-surface-base)] text-[var(--color-on-surface)]">
      
      {/* 1. Desktop Fixed Adjustable Sidebar Container (Global Zustand State & Smooth Pacing) */}
      <aside
        className={cn(
          "hidden md:flex flex-shrink-0 h-full sidebar-transition border-r border-[var(--color-border-default)] bg-[var(--color-surface-raised)] overflow-hidden",
          isSidebarCollapsed ? "w-20" : "w-60"
        )}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </aside>

      {/* 2. Mobile Drawer Overlay Panel */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Sliding drawer panel */}
          <div className="w-64 h-full relative z-50 bg-[var(--color-surface-raised)] shadow-2xl border-r border-[var(--color-border-default)]">
            <Sidebar
              isCollapsed={false}
              isMobile={true}
              onToggleCollapse={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Main Viewport Container (Smooth Cubic-Bezier Reflow Pacing) */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto sidebar-transition">
        
        {/* Sticky Top Navigation Header Bar with Rich Padding */}
        <header className="sticky top-0 z-30 py-4 px-6 md:px-10 bg-[var(--color-surface-raised)]/85 backdrop-blur-md border-b border-[var(--color-border-default)] sidebar-transition">
          <div className="flex items-center gap-4 w-full max-w-[1400px] mx-auto">
            
            {/* Mobile Hamburger Drawer Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[var(--color-surface-base)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] transition-colors text-[var(--color-on-surface)]"
              aria-label="Open navigation menu"
              title="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Central Search Bar Container */}
            <div className="flex-1 max-w-xl mx-auto">
              <SearchBar onSelectTrack={setTrack} />
            </div>

            {/* Right Header Actions: Theme Toggle & User Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2.5 rounded-full bg-[var(--color-surface-base)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] transition-all cursor-pointer text-[var(--color-on-surface)] shadow-xs"
                aria-label="Toggle theme"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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

        {/* Main Page Content Area with Integrated Compact Footer */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 lg:px-16 pt-8 pb-20 sidebar-transition">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
