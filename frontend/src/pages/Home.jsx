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
 * Primary Stitch Dashboard view for authenticated AudioScape users.
 * Assembles:
 * 1. Stitch Hero Spotlight Grid (`HeroSection.jsx`): Main active track spotlight & Focus Flow.
 * 2. Recently Played Album Grid (`RecentlyPlayed.jsx`): Responsive 5-column album card grid.
 * 3. Featured Daily Mix & Recommendations (`RecommendForYou.jsx`): Wide featured mix banner.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Midnight Studio & Fragrant Glassy Alignment: Rebuild matches screens
 *    `721d44993cd748aca88d8a328189655e` & `8ac7f54565f9488ebb1bc86ad5bfe597`.
 * 2. Unified AppLayout Shell: Inherits sticky glassmorphic top header, sidebar navigation,
 *    theme mode switcher, and bottom player dock clearance.
 * 3. Zero-Green Brand Palette: All primary actions use `var(--color-primary)` & `var(--color-secondary)`.
 * 
 * HOW IT WORKS:
 * - Obtains `user` from `useAuth()`.
 * - Passes `user.uid` to `RecentlyPlayed` and `RecommendForYou` to fetch Firestore history and TF-IDF recommendations.
 */

const HomePage = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="w-full max-w-[1280px] mx-auto py-2">
        {/* Stitch 2-Column Hero Spotlight */}
        <HeroSection />

        {/* Recently Played Album Grid */}
        {user && <RecentlyPlayed userId={user.uid} />}

        {/* Featured Daily Mix & AI Recommendations */}
        {user && <RecommendForYou userId={user.uid} />}
      </div>
    </AppLayout>
  );
};

export default HomePage;
