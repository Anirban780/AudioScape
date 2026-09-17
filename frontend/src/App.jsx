import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { initGoogleAuth, promptGoogleOneTap } from "@/auth/googleAuth";
import Home from "@/pages/Home";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import { ThemeProvider } from "@/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import FavoritesPage from "@/pages/FavoritesPage";
import PlayerContainer from "@/components/Player/PlayerContainer";
import usePlayerStore from "@/store/usePlayerStore";
import HelpFeedback from "@/pages/HelpFeedback";
import PlaylistModal from "@/components/Playlist/PlaylistModal";
import PlaylistsPage from "@/pages/PlaylistsPage";
import PlaylistDetailPage from "@/pages/PlaylistDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import RecommendationsPage from "@/pages/RecommendationsPage";
import CategoryPage from "@/pages/CategoryPage";
import { getBackendURL } from "@/utils/api";
import useDynamicDocumentTitle from "@/hooks/useDynamicDocumentTitle";
import { AudioScapeMark } from "@/components/common/AudioScapeLogo";

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
 * 3. Protected Routes & Auth Gate: `isCheckingAuth` prevents premature redirects to `/`
 *    before silent token refresh finishes evaluating HttpOnly refresh cookies.
 * 4. Dynamic Document Title (Workstream J6): Updates browser tab title reactively.
 * ============================================================================
 */

function AppContent() {
  const user = useAuthStore((s) => s.user);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const { track } = usePlayerStore();

  // Workstream J6: Reactive document title hook
  useDynamicDocumentTitle();

  useEffect(() => {
    // 1. Early non-blocking background wake-up ping for Render & Neon PostgreSQL
    getBackendURL().then((backendUrl) => {
      if (backendUrl) {
        fetch(`${backendUrl}/healthcheck`, { method: "GET" })
          .then((res) => res.json())
          .then((data) => {
            if (data?.status === "ok") {
              console.log(`⚡ AudioScape Backend & Database operational (${data.database?.latencyMs ?? 0}ms)`);
            }
          })
          .catch(() => {
            console.log("⏳ AudioScape Backend waking up in background...");
          });
      }
    });

    // 2. Initial silent auth session check on startup
    useAuthStore.getState().checkAuth();

    // 3. Initialize Google Identity Services SDK once on application mount
    const timer = setTimeout(() => {
      initGoogleAuth();
      if (!useAuthStore.getState().user) {
        promptGoogleOneTap();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Workstream J7: Display sleek branded loader during initial auth verification
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-on-surface)] transition-colors select-none">
        <div className="relative flex flex-col items-center gap-5 animate-in fade-in duration-300">
          <div className="p-3.5 rounded-2xl bg-[#0A0E1A] border border-[#00F0FF]/40 shadow-[0_0_30px_rgba(0,240,255,0.3)] animate-pulse">
            <AudioScapeMark size={52} variant="gradient" hasGlow={true} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h2 className="font-display text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] via-[#8A2BE2] to-[#FF66CC]">
              AudioScape
            </h2>
            <p className="text-xs text-[var(--color-on-surface-variant)] tracking-wider uppercase font-semibold">
              Restoring Session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-surface-base)] text-[var(--color-on-surface)]">
      {/* Sonner Toast Notification Container (Theme-aware & physics-based) */}
      <Toaster />

      {/* Persistent Audio Player (Preserved across route changes) */}
      {user && track && <PlayerContainer uid={user.id} />}

      {/* Persistent Playlist Selection Modal */}
      <PlaylistModal userId={user?.id} />

      {/* Route Definitions */}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <LandingPage />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/recommendations" element={user ? <RecommendationsPage /> : <Navigate to="/" replace />} />
        <Route path="/explore" element={<Navigate to="/home" replace />} />
        <Route path="/favourites" element={user ? <FavoritesPage /> : <Navigate to="/" replace />} />
        <Route path="/playlists" element={user ? <PlaylistsPage /> : <Navigate to="/" replace />} />
        <Route path="/playlists/:id" element={user ? <PlaylistDetailPage /> : <Navigate to="/" replace />} />
        <Route path="/category/:slug" element={user ? <CategoryPage /> : <Navigate to="/" replace />} />
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
