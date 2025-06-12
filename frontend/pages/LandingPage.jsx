// src/components/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { Music, LogIn, Search, PlayCircle, Heart, Users, Sun, Moon } from "lucide-react";
import Footer from "../components/Home/Footer";
import { useTheme } from "../ThemeProvider";

const features = [
  {
    title: "Smart Search",
    icon: <Search className="w-6 h-6 text-indigo-500" />,
    description: "Find your favorite songs instantly using YouTube-powered smart search.",
  },
  {
    title: "Custom Player",
    icon: <PlayCircle className="w-6 h-6 text-pink-500" />,
    description: "Enjoy a seamless music experience with our YouTube IFrame-powered player.",
  },
  {
    title: "Personalized Queue",
    icon: <Heart className="w-6 h-6 text-red-500" />,
    description: "Tracks you’ll love — generated from your history and YouTube suggestions.",
  },
  {
    title: "One-Tap Login",
    icon: <Users className="w-6 h-6 text-purple-500" />,
    description: "Get started instantly with secure Google login.",
  },
  {
    title: "Explore Section",
    icon: <Search className="w-6 h-6 text-yellow-500" />,
    description: "Explore new music and videos with personalized keyword-based recommendations.",
  },
  {
    title: "AI-Powered Recommendations",
    icon: <Heart className="w-6 h-6 text-teal-500" />,
    description: "Get smart music recommendations based on your listening habits and preferences.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleAuth = async () => {
    if (!user) {
      await signInWithGoogle();
    }
    navigate("/home");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-sky-300 via-pink-200 to-yellow-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 text-gray-900 dark:text-white overflow-hidden">
      {/* Navbar */}
      <header className="p-6 flex justify-between items-center bg-opacity-60 bg-white dark:bg-gray-800 backdrop-blur-lg fixed w-full z-10 shadow-md rounded-b-lg">
        <h1 className="text-3xl font-extrabold flex items-center tracking-tight text-gray-800 dark:text-white">
          <Music className="mr-3 w-8 h-8 text-pink-400 animate-pulse" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
            Audioscape
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 mx-4 rounded-full bg-gray-300 dark:bg-gray-700 transition-all"
          >
            {theme === "dark" ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-gray-900" />
            )}
          </button>
          <Button
            onClick={handleAuth}
            className="group bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-5 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105"
          >
            <LogIn className="mr-2 w-5 h-5 group-hover:animate-spin" /> Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-10 relative min-h-[70vh]">
        <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-100 via-transparent to-transparent dark:from-gray-700" />

        <h2 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 animate-fade-in">
          Your Personalized Music Hub
        </h2>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-700 dark:text-gray-300 leading-relaxed animate-slide-up">
          Discover, stream, and immerse yourself in your favorite tracks with a seamless, modern music experience.
        </p>
        <Button
          onClick={handleAuth}
          className="mt-6 px-8 py-8 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-full shadow-xl transform transition-all duration-300 hover:scale-110 hover:shadow-2xl"
        >
          Get Started Now
        </Button>
      </main>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-900 py-16 px-6 md:px-12 shadow-lg rounded-t-3xl">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800 dark:text-white">
          Why Audioscape?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-8">
          {features.slice(0, 4).map((feature, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center transform transition-all hover:scale-105 hover:shadow-2xl flex flex-col items-center justify-center"
            >
              <div className="mb-4 flex justify-center">{feature.icon}</div>
              <h4 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">{feature.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-8 justify-center">
          {features.slice(4).map((feature, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center transform transition-all hover:scale-105 hover:shadow-2xl flex flex-col items-center justify-center"
            >
              <div className="mb-4 flex justify-center">{feature.icon}</div>
              <h4 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">{feature.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;