import React, { useState, useEffect } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import HeroSection from "@/components/Home/HeroSection";
import RecentlyPlayed from "@/components/Home/RecentlyPlayed";
import RecommendForYou from "@/components/Home/RecommendForYou";
import GenreCategorySlider from "@/components/Home/GenreCategorySlider";
import FavoriteSongs from "@/components/Home/FavoriteSongs";
import useAuthStore from "@/store/useAuthStore";
import { getRecommendations } from "@/utils/api";

/**
 * ============================================================================
 * HOME DASHBOARD PAGE (Home.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Primary Stitch Dashboard view for AudioScape users.
 * 
 * MODULE HIERARCHY:
 * 1. HeroSection: Stitch Visual Platform Hero Spotlight & Daily Mix Cards
 * 2. RecentlyPlayed: Recent listening history (Hero Spotlight + Compact List)
 * 3. RecommendForYou: Personalized AI recommendations & daily mix
 * 4. GenreCategorySlider: 10 curated music realms sliding carousel with HD artwork
 * 5. FavoriteSongs: Personal liked songs collection with vinyl record hover
 * ============================================================================
 */

const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || "";

  // Initialize recommendations from SWR localStorage cache for instant Hero & Mix card rendering on refresh
  const [recommendations, setRecommendations] = useState(() => {
    try {
      const raw = localStorage.getItem("audioscape_cached_recommendations");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000 && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    } catch {
      return [];
    }
    return [];
  });

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

        {/* 3. Featured Daily Mix & AI Recommendations (reusing shared recommendations to prevent duplicate fetches) */}
        <RecommendForYou userId={userId} sharedRecommendations={recommendations} />

        {/* 4. Browse Categories Horizontal Sliding Showcase */}
        <GenreCategorySlider />

        {/* 5. Favorite Songs Carousel (At the bottom) */}
        <FavoriteSongs userId={userId} />
      </div>
    </AppLayout>
  );
};

export default HomePage;

