import { create } from 'zustand';

/**
 * ============================================================================
 * USE SIDEBAR STORE (Zustand)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Dedicated global state store for the navigation sidebar collapse/expand state.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Responsibility Principle: Decouples UI layout sidebar state from audio
 *    playback and track queue state (`usePlayerStore`), preventing unnecessary player
 *    re-renders when toggling the navigation rail.
 * 2. Persistent Across Navigation: Stores state in `localStorage` under key
 *    `audioscape_sidebar_collapsed` so user preference is preserved across page reloads.
 * 
 * HOW IT WORKS:
 * - `isSidebarCollapsed`: Boolean indicating if desktop sidebar is collapsed to 80px rail.
 * - `toggleSidebarCollapsed()`: Toggles state and saves preference in `localStorage`.
 * - `setSidebarCollapsed(collapsed)`: Explicitly sets collapsed state and updates `localStorage`.
 */

const STORAGE_KEY = 'audioscape_sidebar_collapsed';

const getInitialCollapsedState = () => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (e) {
    console.error('Failed to read sidebar state from localStorage:', e);
    return false;
  }
};

const useSidebarStore = create((set) => ({
  /**
   * WHAT: Collapsed sidebar state boolean (true = 80px icon rail, false = 240px expanded sidebar).
   */
  isSidebarCollapsed: getInitialCollapsedState(),

  /**
   * WHAT: Toggle collapsed state boolean.
   * WHY: Invoked by sidebar toggle button in AppLayout header and Sidebar component.
   */
  toggleSidebarCollapsed: () => set((state) => {
    const nextState = !state.isSidebarCollapsed;
    try {
      localStorage.setItem(STORAGE_KEY, String(nextState));
    } catch (e) {
      console.error('Failed to save sidebar state to localStorage:', e);
    }
    return { isSidebarCollapsed: nextState };
  }),

  /**
   * WHAT: Explicitly set collapsed state boolean.
   */
  setSidebarCollapsed: (collapsed) => set(() => {
    const nextState = Boolean(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(nextState));
    } catch (e) {
      console.error('Failed to save sidebar state to localStorage:', e);
    }
    return { isSidebarCollapsed: nextState };
  }),
}));

export default useSidebarStore;
