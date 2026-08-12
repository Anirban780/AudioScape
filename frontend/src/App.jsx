import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
import HistoryPage from "@/pages/HistoryPage";

/**
 * ============================================================================
 * CORE APPLICATION ROUTER (App.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary application router and root provider orchestrator.
 * It manages authentication-guarded routes, persistent player/modal overlays,
 * toast notification containers, and theme context provider.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Persistent Audio Playback: PlayerContainer and PlaylistModal are mounted at the
 *    root router level (outside individual page route switches) so audio playback
 *    is never interrupted when navigating between pages.
 * 2. Instant Route Navigation: Removed legacy artificial 1-second setTimeout route delay
 *    (Known Bug #1 fix), allowing instant, responsive page switches.
 * 3. Protected Routes: Unauthenticated users attempting to access protected routes
 *    (/home, /explore, /favourites, /playlists, /history) are redirected to LandingPage ("/").
 * 
 * HOW IT WORKS:
 * - `ThemeProvider` wraps the application, applying `.dark` / `.light` root classes.
 * - `AppContent` checks `useAuth()` state and `usePlayerStore()` active track.
 * - Renders `<PlayerContainer>` when an active track is present and user is logged in.
 * - Renders `<PlaylistModal>` for global playlist management.
 */

function AppContent() {
  const { user } = useAuth();
  const { track } = usePlayerStore();

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
      {user && track && <PlayerContainer uid={user.uid} />}

      {/* Persistent Playlist Selection Modal */}
      {user && <PlaylistModal userId={user.uid} />}

      {/* Route Definitions */}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <LandingPage />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/explore" element={user ? <ExplorePage /> : <Navigate to="/" replace />} />
        <Route path="/favourites" element={user ? <FavoritesPage /> : <Navigate to="/" replace />} />
        <Route path="/playlists" element={user ? <PlaylistsPage /> : <Navigate to="/" replace />} />
        <Route path="/history" element={user ? <HistoryPage /> : <Navigate to="/" replace />} />
        <Route path="/help" element={<HelpFeedback />} />
        {/* Profile fallback route (Known Bug #2 fix) */}
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
