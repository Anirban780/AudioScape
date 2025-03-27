import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./ThemeProvider";
import Loader from "./components/Home/Loader";
import { useState, useEffect } from "react";

function AppContent() {
  const { user } = useAuth();
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
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
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