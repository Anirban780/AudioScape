import React from "react";
import AppLayout from "@/components/Layout/AppLayout";
import HeroSection from "@/components/Home/HeroSection";
import RecentlyPlayed from "@/components/Home/RecentlyPlayed";
import { useAuth } from "@/context/AuthContext";
import RecommendForYou from "@/components/Home/RecommendForYou";

/**
 * ============================================================================
 * HOME DASHBOARD PAGE (Home.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary dashboard view for authenticated AudioScape users.
 * Displays the hero banner stream, recently played listening history carousel,
 * and AI-personalized track recommendations.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. AppLayout Shell Unification: Wraps content cleanly in `<AppLayout>` to inherit
 *    the global sidebar, sticky search header, theme toggle, and bottom player padding.
 * 2. Surface Token Hierarchy: Replaced hardcoded `bg-white dark:bg-gray-800` with
 *    semantic surface tokens (`bg-[var(--color-surface-raised)]`) to align with Stitch theme rules.
 * 
 * HOW IT WORKS:
 * - Reads `user` object from `useAuth()`.
 * - Renders HeroSection streaming showcase.
 * - Conditionally renders `RecentlyPlayed` and `RecommendForYou` passing `user.uid`.
 */
const HomePage = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      {/* Hero Banner Section */}
      <div className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col relative">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🌐</span> Now Streaming 🎧
        </h1>
        <HeroSection />
      </div>

      {/* Recently Played Listening History */}
      {user && (
        <div className="mt-6">
          <RecentlyPlayed userId={user.uid} />
        </div>
      )}

      {/* Recommended Songs Grid */}
      {user && (
        <div className="mt-8">
          <RecommendForYou userId={user.uid} />
        </div>
      )}
    </AppLayout>
  );
};

export default HomePage;
