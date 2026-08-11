import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { fetchYoutubeMusic } from "@/utils/youtube";
import { fetchExploreFeed } from "@/utils/api";
import Loader from "@/components/Home/Loader";
import toast from "react-hot-toast";
import { Compass } from "lucide-react";

import ExploreTrendingBanner from "@/components/Explore/ExploreTrendingBanner";
import ExploreFilterBar from "@/components/Explore/ExploreFilterBar";
import ExploreSection from "@/components/Explore/ExploreSection";

/**
 * ============================================================================
 * EXPLORE MUSIC PAGE (ExplorePage.jsx) - V2 Filtered Discovery Architecture
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Assembles the primary Stitch Music Discovery & Search view. Features:
 * 1. Clean Vector Icon Page Header: `<Compass>` Lucide icon title.
 * 2. Category Filter Bar (`ExploreFilterBar.jsx`): Compact category filter pills.
 * 3. Spotlight Hero Banner Carousel (`ExploreTrendingBanner.jsx`):
 *    - In "All" mode: Displays top #1 song from each category section (up to 8 tracks).
 *    - In Filtered mode: Displays top 5 trending songs of the selected category.
 * 4. Categorized Music Track Sections (`ExploreSection.jsx`): Filtered or full category sections.
 * 5. Saved User Playlists Carousel (`ExplorePlaylistsCarousel.jsx`): User's saved playlists.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Declarative React Curation (`useMemo`): Replaced imperative if/else mutations with
 *    declarative `useMemo` hooks for reactive, optimized track & section filtering.
 * 2. Adjustable Hero Image Position: Passes `imageObjectPosition` prop ("center center" by default)
 *    to easily shift background artwork up or down.
 * 
 * HOW TO MOVE THE HERO BANNER IMAGE UP OR DOWN:
 * Edit line ~158 below or change `imageObjectPosition` value:
 * - "center top" or "center 15%"  -> Moves image UP (shows top of picture)
 * - "center center" or "center 50%" -> Default centered alignment
 * - "center bottom" or "center 85%" -> Moves image DOWN (shows bottom of picture)
 */

const ExplorePage = () => {
  const { user } = useAuth();
  const [exploreFeed, setExploreFeed] = useState([]);
  const [visibleTracks, setVisibleTracks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

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
   * Category Filter Selection Handler
   */
  const handleSelectCategory = async (categoryQuery) => {
    if (!categoryQuery) return;
    setActiveFilter(categoryQuery);

    if (categoryQuery === "All") return;

    // Check if section already exists in explore feed
    const existingIndex = exploreFeed.findIndex(
      (sec) => sec.title.toLowerCase().includes(categoryQuery.toLowerCase()) ||
               categoryQuery.toLowerCase().includes(sec.title.toLowerCase())
    );

    if (existingIndex !== -1) return;

    // Otherwise fetch fresh music section for this category
    toast.loading(`Loading ${categoryQuery}...`, { id: "explore-genre" });
    try {
      const tracks = await fetchYoutubeMusic(categoryQuery, 15);
      setExploreFeed((prev) => [{ title: categoryQuery, tracks }, ...prev]);
      setVisibleTracks((prev) => ({ ...prev, [categoryQuery]: 5 }));
      toast.success(`Loaded ${categoryQuery}`, { id: "explore-genre" });
    } catch (e) {
      toast.error(`Failed to load ${categoryQuery}`, { id: "explore-genre" });
    }
  };

  /**
   * Declarative Trending Tracks Derivation (useMemo):
   * - "All" mode: Top 1 song from each category section (up to 8 tracks)
   * - Filtered mode: Top 5 songs from the selected category section
   */
  const trendingTracks = useMemo(() => {
    if (activeFilter === "All") {
      return exploreFeed
        .map((sec) => sec.tracks?.[0] && { ...sec.tracks[0], categoryName: sec.title })
        .filter(Boolean)
        .slice(0, 8);
    }

    const matchingSec = exploreFeed.find(
      (sec) => sec.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
               activeFilter.toLowerCase().includes(sec.title.toLowerCase())
    );

    return (matchingSec?.tracks || []).slice(0, 5).map((t) => ({
      ...t,
      categoryName: matchingSec?.title || activeFilter,
    }));
  }, [exploreFeed, activeFilter]);

  /**
   * Declarative Section Filtering (useMemo)
   */
  const displayedSections = useMemo(() => {
    if (activeFilter === "All") return exploreFeed;

    return exploreFeed.filter(
      (sec) => sec.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
               activeFilter.toLowerCase().includes(sec.title.toLowerCase())
    );
  }, [exploreFeed, activeFilter]);

  return (
    <AppLayout>
      <div className="w-full max-w-[1280px] mx-auto py-2">
        
        {/* Page Title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] tracking-tight flex items-center gap-2.5">
            <Compass className="text-[var(--color-primary)] flex-shrink-0" size={28} />
            <span>Explore Music</span>
          </h1>
        </div>

        {/* 1. Category Filter Boxes (Compact Pill Bar) */}
        <ExploreFilterBar
          activeCategory={activeFilter}
          onSelectCategory={handleSelectCategory}
        />

        {/* 2. Trending Spotlight Hero Banner (Full-Width HD, Auto Slow-Pan & Carousel) */}
        <ExploreTrendingBanner
          trendingTracks={trendingTracks}
          activeCategory={activeFilter}
          loading={loading}
          enablePanAnimation={true} // Enables automatic top-to-bottom slow pan vertical image animation
          imageObjectPosition="center center"
        />

        {/* 3. Categorized Music Track Sections */}
        {loading ? (
          <Loader />
        ) : displayedSections.length === 0 ? (
          <div className="text-center text-sm text-[var(--color-on-surface-variant)] py-12 bg-[var(--color-surface-raised)] rounded-[24px] border border-[var(--color-border-default)] mb-10">
            No tracks found for "{activeFilter}". Try selecting "All" or picking another category!
          </div>
        ) : (
          <div className="space-y-6">
            {displayedSections.map((section, index) => (
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
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
