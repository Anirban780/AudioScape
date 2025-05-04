import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./ThemeProvider";
import Loader from "./components/Home/Loader";
import { useState, useEffect } from "react";
import ExplorePage from "./pages/ExplorePage";
import { Toaster } from "react-hot-toast";
import FavoritesPage from "./pages/FavoritesPage";
import PlayerContainer from "./components/Player/PlayerContainer";
import usePlayerStore from "./store/usePlayerStore";
import HelpFeedback from "./pages/HelpFeedback";

function AppContent() {
  const { user } = useAuth();
  const { track } = usePlayerStore();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1000); // Simulate loading delay
    return () => clearTimeout(timer); // Cleanup on unmount
  }, [location]); // Trigger on route change

  return (
    <div className="relative">
      {isLoading && <Loader />}

      <Toaster position="top-right" reverseOrder={false} />

      {/* Persistent PlayerContainer to avoid unmounting during routing */}
      {user && track && <PlayerContainer uid={user.uid} />}

      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/favourites" element={user ? <FavoritesPage /> : <Navigate to="/" />} />
        <Route path='/help' element={<HelpFeedback />} />
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