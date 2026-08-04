import React, { useEffect, useState } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getExploreKeywords } from "@/utils/keywords";
import { fetchYoutubeMusic } from "@/utils/youtube";
import { cacheRelatedTracks } from "@/utils/api";
import Loader from "@/components/Home/Loader";
import toast from "react-hot-toast";

import ExploreFilterPills from "@/components/Explore/ExploreFilterPills";
import ExploreTrendingBanner from "@/components/Explore/ExploreTrendingBanner";
import ExploreCategoryGrid from "@/components/Explore/ExploreCategoryGrid";
import ExploreSection from "@/components/Explore/ExploreSection";
import ExplorePlaylistsCarousel from "@/components/Explore/ExplorePlaylistsCarousel";

/**
 * ============================================================================
 * EXPLORE MUSIC PAGE (ExplorePage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Assembles the primary Stitch Music Discovery & Search view. Features:
 * 1. Genre & Mood Filter Pills (`ExploreFilterPills.jsx`): Interactive pill filters.
 * 2. Trending Spotlight Hero Banner (`ExploreTrendingBanner.jsx`): Spotlight discovery mix.
 * 3. Browse Categories 4-Column Grid (`ExploreCategoryGrid.jsx`): Visual genre tiles with gradients.
 * 4. Keyword Music Track Sections (`ExploreSection.jsx`): 5-column responsive album grids.
 * 5. Saved User Playlists Carousel (`ExplorePlaylistsCarousel.jsx`): User's saved playlists.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Screen Alignment: Fully implements the design hierarchy from Stitch Explore screens
 *    (`6aaba54d100944a28329f65c95eb684f`, `3c52c41b3d7e40b89b4e98157e63aaae`, & `e8bef34ec53d4382bba063b4a4d375d1`).
 * 2. Personalised Discovery: Uses `getExploreKeywords(uid)` to dynamically fetch feeds matching taste.
 * 3. Cache & Quota Optimization: Caches fetched category tracks in `localStorage` for 30 minutes.
 * 
 * HOW IT WORKS:
 * - Fetches keyword sections via `fetchYoutubeMusic`.
 * - Derived `featuredTrack` supplies the Trending Spotlight Hero Banner.
 * - Selecting filter pills or category cards fetches and highlights targeted music feeds.
 */

const curatedGenres = [
  "lofi music",
  "pop hits",
  "indie rock",
  "anime music",
  "k-pop",
  "electronic",
  "jazz chill",
  "hip hop",
];

const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes cache

const ExplorePage = () => {
  const { user } = useAuth();
  const [exploreFeed, setExploreFeed] = useState([]);
  const [cache, setCache] = useState({});
  const [visibleTracks, setVisibleTracks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("All");

  const userId = user?.uid || "";

  useEffect(() => {
    let isMounted = true;

    const fetchExploreSections = async () => {
      setLoading(true);

      try {
        let keywords = await getExploreKeywords(userId);
        if (!keywords || keywords.length === 0) {
          keywords = curatedGenres;
        }

        const now = Date.now();
        const cachedFetchTime = localStorage.getItem("lastFetchTime");
        const isCacheValid = cachedFetchTime && now - parseInt(cachedFetchTime) < CACHE_EXPIRY_MS;

        const exploreData = await Promise.all(
          keywords.slice(0, 8).map(async (keyword) => {
            if (isCacheValid && cache[keyword]) {
              return { title: keyword, tracks: cache[keyword] };
            }

            const tracks = await fetchYoutubeMusic(keyword, 15);
            setCache((prev) => ({ ...prev, [keyword]: tracks }));
            await cacheRelatedTracks(keyword, tracks);
            return { title: keyword, tracks };
          })
        );

        if (!isMounted) return;

        setExploreFeed(exploreData);

        const initialVisible = {};
        exploreData.forEach(({ title }) => {
          initialVisible[title] = 5;
        });
        setVisibleTracks(initialVisible);
        localStorage.setItem("lastFetchTime", now.toString());
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
   * Filter Pill & Category Tile Selection Handler
   */
  const handleGenreSelect = async (genreQuery) => {
    setActiveGenre(genreQuery);

    if (genreQuery.toLowerCase() === "all") {
      return;
    }

    // Check if section already exists in explore feed
    const existingIndex = exploreFeed.findIndex(
      (sec) => sec.title.toLowerCase() === genreQuery.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Scroll to existing section
      const secElement = document.getElementById(`explore-sec-${existingIndex}`);
      secElement?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Otherwise fetch fresh music for this genre
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

        {/* 1. Genre & Mood Filter Pills */}
        <ExploreFilterPills
          activeGenre={activeGenre}
          onSelect={handleGenreSelect}
        />

        {/* 2. Trending Spotlight Hero Banner */}
        <ExploreTrendingBanner featuredTrack={featuredTrack} loading={loading} />

        {/* 3. Browse Categories 4-Column Grid */}
        <ExploreCategoryGrid onCategoryClick={handleGenreSelect} />

        {/* 4. Keyword Music Track Sections */}
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

        {/* 5. User Saved Playlists Carousel */}
        {userId && <ExplorePlaylistsCarousel userId={userId} />}
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
