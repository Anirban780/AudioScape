import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext"; // Import AuthContext
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import { ThemeProvider } from "./ThemeProvider";

function App() {
  
  const { user } = useAuth(); // Get the user state

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />
          <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
