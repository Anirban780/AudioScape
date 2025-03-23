// src/components/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"; // ShadCN button
import { useAuth } from "../context/AuthContext"; // Custom AuthContext
import { Music, LogIn } from "lucide-react";
import Footer from "../components/Home/Footer"; // Updated Footer

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  const handleAuth = async () => {
    if (!user) {
      await signInWithGoogle();
    }
    navigate("/home");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white overflow-hidden">
      {/* Navbar */}
      <header className="p-6 flex justify-between items-center bg-opacity-10 bg-black backdrop-blur-lg fixed w-full z-10 shadow-md">
        <h1 className="text-3xl font-extrabold flex items-center tracking-tight">
          <Music className="mr-3 w-8 h-8 animate-pulse text-pink-300" /> 
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
            Audioscape
          </span>
        </h1>
        <Button
          onClick={handleAuth}
          className="group bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-2 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105"
        >
          <LogIn className="mr-2 w-5 h-5 group-hover:animate-spin" /> Get Started
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 relative">
        {/* Background Decorative Element */}
        <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent"></div>
        
        <h2 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 animate-fade-in">
          Your Personalized Music Hub
        </h2>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-200 leading-relaxed animate-slide-up">
          Discover, stream, and immerse yourself in your favorite tracks with a seamless, modern music experience.
        </p>
        <Button
          onClick={handleAuth}
          className="mt-6 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-full shadow-xl transform transition-all duration-300 hover:scale-110 hover:shadow-2xl"
        >
          Get Started Now
        </Button>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;