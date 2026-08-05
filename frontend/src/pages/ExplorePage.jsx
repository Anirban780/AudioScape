import React, { useEffect, useState } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { fetchYoutubeMusic } from "@/utils/youtube";
import { fetchExploreFeed } from "@/utils/api";
import Loader from "@/components/Home/Loader";
import toast from "react-hot-toast";

import ExploreTrendingBanner from "@/components/Explore/ExploreTrendingBanner";
import ExploreCategoryGrid from "@/components/Explore/ExploreCategoryGrid";
import ExploreSection from "@/components/Explore/ExploreSection";
import ExplorePlaylistsCarousel from "@/components/Explore/ExplorePlaylistsCarousel";

/**
 * ============================================================================
 * EXPLORE MUSIC PAGE (ExplorePage.jsx) - V2 Consolidated Discovery Architecture
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Assembles the primary Stitch Music Discovery & Search view. Features:
 * 1. Trending Spotlight Hero Banner (`ExploreTrendingBanner.jsx`): Spotlight discovery mix.
 * 2. Browse Categories 4-Column Grid (`ExploreCategoryGrid.jsx`): Visual genre tiles with gradients.
 * 3. Categorized Music Track Sections (`ExploreSection.jsx`): 5-column responsive album grids.
 * 4. Saved User Playlists Carousel (`ExplorePlaylistsCarousel.jsx`): User's saved playlists.
 * 
 * WHY IT WAS DESIGNED THIS WAY (Phase 4 UI Consolidation):
 * 1. Single Category UI Source of Truth: Consolidated genre discovery into `ExploreCategoryGrid.jsx`
 *    and removed redundant filter pills (`ExploreFilterPills.jsx`) to eliminate UI duplication.
 * 2. Server-Driven Personalised Discovery: Fetches personalized categorized feeds in a single backend call (`fetchExploreFeed()`).
 * 3. Zero-Latency Page Loads: Served 100% DB-first from PostgreSQL with automated background pre-warming.
 * 
 * HOW IT WORKS:
 * - Mounts and fetches initial 10-category explore feed via `fetchExploreFeed()`.
 * - Derived `featuredTrack` supplies the Trending Spotlight Hero Banner.
 * - Selecting category tiles in `ExploreCategoryGrid` scrolls to matching section or loads category feed.
 */

const ExplorePage = () => {
  const { user } = useAuth();
  const [exploreFeed, setExploreFeed] = useState([]);
  const [visibleTracks, setVisibleTracks] = useState({});
  const [loading, setLoading] = useState(true);

  const userId = user?.uid || "";

  useEffect(() => {
    let isMounted = true;

    const fetchExploreSections = async () => {
      setLoading(true);

      try {
        const exploreData = await fetchExploreFeed();

        if (!isMounted) return;

        setExploreFeed(exploreData);

        const initialVisible = {};
        exploreData.forEach(({ title }) => {
          initialVisible[title] = 5;
        });
        setVisibleTracks(initialVisible);
      } catch (err) {
        console.error("Explore fetch failed:", err);
        if (isMounted) setExploreFeed([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExploreSections();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleLoadMore = (title) => {
    setVisibleTracks((prev) => ({
      ...prev,
      [title]: (prev[title] || 5) + 5,
    }));
  };

  /**
   * Category Tile Selection Handler
   */
  const handleCategoryClick = async (genreQuery) => {
    if (!genreQuery) return;

    // Check if section already exists in explore feed
    const existingIndex = exploreFeed.findIndex(
      (sec) => sec.title.toLowerCase() === genreQuery.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Scroll smoothly to existing section
      const secElement = document.getElementById(`explore-sec-${existingIndex}`);
      secElement?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Otherwise fetch fresh music section for this category
    toast.loading(`Loading ${genreQuery}...`, { id: "explore-genre" });
    try {
      const tracks = await fetchYoutubeMusic(genreQuery, 15);
      setExploreFeed((prev) => [{ title: genreQuery, tracks }, ...prev]);
      setVisibleTracks((prev) => ({ ...prev, [genreQuery]: 5 }));
      toast.success(`Loaded ${genreQuery}`, { id: "explore-genre" });
    } catch (e) {
      toast.error(`Failed to load ${genreQuery}`, { id: "explore-genre" });
    }
  };

  // Derive top featured track for Trending Spotlight Hero Banner
  const featuredTrack = exploreFeed.length > 0 && exploreFeed[0].tracks.length > 0
    ? exploreFeed[0].tracks[0]
    : null;

  return (
    <AppLayout>
      <div className="w-full max-w-[1280px] mx-auto py-2">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] tracking-tight">
            🔍 Explore Music 🎶
          </h1>
        </div>

        {/* 1. Trending Spotlight Hero Banner */}
        <ExploreTrendingBanner featuredTrack={featuredTrack} loading={loading} />

        {/* 2. Browse Categories 4-Column Grid */}
        <ExploreCategoryGrid onCategoryClick={handleCategoryClick} />

        {/* 3. Categorized Music Track Sections */}
        {loading ? (
          <Loader />
        ) : exploreFeed.length === 0 ? (
          <div className="text-center text-sm text-[var(--color-on-surface-variant)] py-12 bg-[var(--color-surface-raised)] rounded-[24px] border border-[var(--color-border-default)] mb-10">
            No music content available right now. Try searching or check back later!
          </div>
        ) : (
          <div className="space-y-6">
            {exploreFeed.map((section, index) => (
              <div key={`${section.title}-${index}`} id={`explore-sec-${index}`}>
                <ExploreSection
                  section={section}
                  visibleCount={visibleTracks[section.title] || 5}
                  onLoadMore={() => handleLoadMore(section.title)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 4. User Saved Playlists Carousel */}
        {userId && <ExplorePlaylistsCarousel userId={userId} />}
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
