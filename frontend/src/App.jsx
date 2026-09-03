import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { initGoogleAuth, promptGoogleOneTap } from "@/auth/googleAuth";
import Home from "@/pages/Home";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import { ThemeProvider } from "@/ThemeProvider";
import ExplorePage from "@/pages/ExplorePage";
import { Toaster } from "react-hot-toast";
import FavoritesPage from "@/pages/FavoritesPage";
import PlayerContainer from "@/components/Player/PlayerContainer";
import usePlayerStore from "@/store/usePlayerStore";
import HelpFeedback from "@/pages/HelpFeedback";
import PlaylistModal from "@/components/Playlist/PlaylistModal";
import PlaylistsPage from "@/pages/PlaylistsPage";
import PlaylistDetailPage from "@/pages/PlaylistDetailPage";
import HistoryPage from "@/pages/HistoryPage";

/**
 * ============================================================================
 * CORE APPLICATION ROUTER (App.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary application router and root provider orchestrator.
 * Manages authentication-guarded routes, Google Identity Services initialization,
 * persistent player/modal overlays, toast notification containers, and theme context provider.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Direct Google OAuth Integration: Initializes Google Identity Services (GIS) on mount
 *    and triggers One Tap prompt for returning users.
 * 2. Persistent Audio Playback: PlayerContainer and PlaylistModal are mounted at the
 *    root router level (outside individual page route switches) so audio playback
 *    is never interrupted when navigating between pages.
 * 3. Protected Routes: Unauthenticated users attempting to access protected routes
 *    (/home, /explore, /favourites, /playlists, /history) are redirected to LandingPage ("/").
 * ============================================================================
 */

function AppContent() {
  const user = useAuthStore((s) => s.user);
  const { track } = usePlayerStore();

  useEffect(() => {
    // Attempt silent auth session refresh on mount using HttpOnly refresh cookie
    useAuthStore.getState().refreshAuthSession();

    // Initialize Google Identity Services SDK once on application mount
    const timer = setTimeout(() => {
      initGoogleAuth();
      if (!useAuthStore.getState().user) {
        promptGoogleOneTap();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--color-surface-base)] text-[var(--color-on-surface)]">
      {/* Toast Notification Container */}
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'var(--color-surface-raised)',
            color: 'var(--color-on-surface)',
            border: '1px solid var(--color-border-default)',
          },
        }}
      />

      {/* Persistent Audio Player (Preserved across route changes) */}
      {user && track && <PlayerContainer uid={user.id} />}

      {/* Persistent Playlist Selection Modal */}
      {user && <PlaylistModal userId={user.id} />}

      {/* Route Definitions */}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <LandingPage />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/explore" element={user ? <ExplorePage /> : <Navigate to="/" replace />} />
        <Route path="/favourites" element={user ? <FavoritesPage /> : <Navigate to="/" replace />} />
        <Route path="/playlists" element={user ? <PlaylistsPage /> : <Navigate to="/" replace />} />
        <Route path="/playlists/:id" element={user ? <PlaylistDetailPage /> : <Navigate to="/" replace />} />
        <Route path="/history" element={user ? <HistoryPage /> : <Navigate to="/" replace />} />
        <Route path="/help" element={<HelpFeedback />} />
        {/* Profile fallback route */}
        <Route path="/profile" element={user ? <Navigate to="/home" replace /> : <Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
