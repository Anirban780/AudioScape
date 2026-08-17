import React, { useState, useEffect } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import HeroSection from "@/components/Home/HeroSection";
import RecentlyPlayed from "@/components/Home/RecentlyPlayed";
import RecommendForYou from "@/components/Home/RecommendForYou";
import FavoriteSongs from "@/components/Home/FavoriteSongs";
import { useAuth } from "@/context/AuthContext";
import { getRecommendations } from "@/utils/api";

/**
 * ============================================================================
 * HOME DASHBOARD PAGE (Home.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary Stitch Dashboard view for AudioScape users.
 * Assembles Home page sections in order:
 * 1. Stitch Hero Spotlight Grid (`HeroSection.jsx`): Banners & `DailyMixCards` (grouped by top history keywords).
 * 2. Recently Played Album Grid (`RecentlyPlayed.jsx`): Listening history directly after the hero grid.
 * 3. Featured Daily Mix & AI Recommendations (`RecommendForYou.jsx`): 5s auto-rotating banner & track grid.
 * 4. Favorite Songs Carousel (`FavoriteSongs.jsx`): User liked tracks collection at the bottom.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Personalized Daily Mix Hero: Replaced static marketing banner with 2–3 grouped mix cards
 *    (e.g., "Mix: Lo-fi", "Mix: K-pop", "Mix: Ambient") seeded directly from user history recommendation keywords.
 * 2. High Density Layout: Removes redundant chip controls to give immediate focus to hero mixes and listening history.
 * 3. Stitch Theme Alignment: Rebuild matches screens `721d44993cd748aca88d8a328189655e`
 *    & `8ac7f54565f9488ebb1bc86ad5bfe597` with unified Light & Dark surface tokens.
 * 
 * HOW IT WORKS:
 * - Obtains `user` from `useAuth()`.
 * - Fetches `getRecommendations(20)` to supply keyword-grouped tracks to `<HeroSection />`.
 * - Passes `userId` to `RecentlyPlayed`, `RecommendForYou`, and `FavoriteSongs`.
 */

const HomePage = () => {
  const { user } = useAuth();
  const userId = user?.uid || "";
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (userId) {
      getRecommendations(20)
        .then((recs) => {
          if (!isMounted) return;
          if (Array.isArray(recs) && recs.length > 0) {
            setRecommendations(recs);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch recommendations for hero mix cards:", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <AppLayout>
      <div className="w-full mx-auto py-2 animate-in fade-in duration-300">
        {/* 1. Stitch Visual Platform Hero Spotlight (With Daily Mix Grouped Cards) */}
        <HeroSection recommendations={recommendations} />

        {/* 2. Recently Played Album Grid */}
        <RecentlyPlayed userId={userId} />

        {/* 3. Featured Daily Mix & AI Recommendations */}
        <RecommendForYou userId={userId} />

        {/* 4. Favorite Songs Carousel (At the bottom) */}
        <FavoriteSongs userId={userId} />
      </div>
    </AppLayout>
  );
};

export default HomePage;

