// src/components/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { Music, LogIn, Search, PlayCircle, Heart, Users } from "lucide-react";
import Footer from "../components/Home/Footer";

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
];

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
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-10 relative">
        <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent" />

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

      {/* Features Section */}
      <section className="bg-black bg-opacity-30 backdrop-blur-md py-16 px-6 md:px-12">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Audioscape?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white bg-opacity-10 p-6 rounded-2xl shadow-lg text-center transform transition hover:scale-105 hover:shadow-2xl"
            >
              <div className="mb-4 flex justify-center">{feature.icon}</div>
              <h4 className="text-xl font-semibold mb-2 text-white">{feature.title}</h4>
              <p className="text-sm text-gray-200">{feature.description}</p>
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
