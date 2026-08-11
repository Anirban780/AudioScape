import React from "react";
import AppLayout from "@/components/Layout/AppLayout";
import HeroSection from "@/components/Home/HeroSection";
import RecentlyPlayed from "@/components/Home/RecentlyPlayed";
import RecommendForYou from "@/components/Home/RecommendForYou";
import FavoriteSongs from "@/components/Home/FavoriteSongs";
import { useAuth } from "@/context/AuthContext";

/**
 * ============================================================================
 * HOME DASHBOARD PAGE (Home.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary Stitch Dashboard view for AudioScape users.
 * Assembles Home page sections in order:
 * 1. Stitch Hero Spotlight Grid (`HeroSection.jsx`): Platform soundscape banners & Focus Flow.
 * 2. Featured Daily Mix & AI Recommendations (`RecommendForYou.jsx`): 5s auto-rotating banner.
 * 3. Recently Played Album Grid (`RecentlyPlayed.jsx`): Responsive 5-column album card grid.
 * 4. Favorite Songs Carousel (`FavoriteSongs.jsx`): User liked tracks collection at the last.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Always-Visible Layout Sections: Passes `userId` (or fallback) to ensure all sections
 *    render their loading skeletons or empty state cards rather than disappearing silently.
 * 2. Stitch Theme Alignment: Rebuild matches screens `721d44993cd748aca88d8a328189655e`
 *    & `8ac7f54565f9488ebb1bc86ad5bfe597` with unified Light & Dark surface tokens.
 * 
 * HOW IT WORKS:
 * - Obtains `user` from `useAuth()`.
 * - Passes `user?.uid` to `RecommendForYou`, `RecentlyPlayed`, and `FavoriteSongs`.
 */

const HomePage = () => {
  const { user } = useAuth();
  const userId = user?.uid || "";

  return (
    <AppLayout>
      <div className="w-full max-w-[1280px] mx-auto py-2">
        {/* 1. Stitch Visual Platform Hero Spotlight */}
        <HeroSection />

        {/* 2. Featured Daily Mix & AI Recommendations */}
        <RecommendForYou userId={userId} />

        {/* 3. Recently Played Album Grid */}
        <RecentlyPlayed userId={userId} />

        {/* 4. Favorite Songs Carousel (At the last) */}
        <FavoriteSongs userId={userId} />
      </div>
    </AppLayout>
  );
};

export default HomePage;
