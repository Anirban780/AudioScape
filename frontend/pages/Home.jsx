import React from "react";
import AppLayout from "../components/Layout/AppLayout";
import HeroSection from "../components/Home/HeroSection";
import RecentlyPlayed from "../components/Home/RecentlyPlayed";
import { useAuth } from "../context/AuthContext";
import RecommendForYou from "../components/Home/RecommendForYou";

const HomePage = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      {/* Track Info & Hero */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mt-6 flex flex-col relative">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">🌐 Now Streaming 🎧</h1>
        <HeroSection />
      </div>

      {/* Recently Played */}
      {user && (
        <div className="mt-4">
          <RecentlyPlayed userId={user.uid} />
        </div>
      )}

      {/* Recommended for you */}
      {user && (
        <div className="mt-6">
          <RecommendForYou userId={user.uid} />
        </div>
      )}
    </AppLayout>
  );
};

export default HomePage;
