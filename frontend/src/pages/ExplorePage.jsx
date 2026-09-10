import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import { fetchExploreFeed, fetchCategoryTracks } from "@/utils/api";
import Loader from "@/components/Home/Loader";
import toast from "react-hot-toast";
import { Compass } from "lucide-react";

import ExploreSplitHero from "@/components/Explore/ExploreSplitHero";
import ExploreDiscoveryBar from "@/components/Explore/ExploreDiscoveryBar";
import ExploreSection from "@/components/Explore/ExploreSection";
import { matchesCategory } from "@/constants/curatedCategories";
import usePlayerStore from "@/store/usePlayerStore";

/**
 * ============================================================================
 * EXPLORE MUSIC PAGE (ExplorePage.jsx) - V2 Filtered Discovery Architecture
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Assembles the primary Stitch Music Discovery & Search view.
 */

const CACHE_KEY_PREFIX = "audioscape_cached_explore_feed_v3";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 mins

/**
 * Safely reads cached explore feed sections from localStorage for instant, zero-latency initial render on page refresh or navigation.
 * Adheres to Stale-While-Revalidate (SWR): renders cached sections and hero spotlight instantly, then revalidates in the background.
 */
const getInitialCachedExploreFeed = (uid) => {
  try {
    const key = uid ? `${CACHE_KEY_PREFIX}_${uid}` : CACHE_KEY_PREFIX;
    const raw = localStorage.getItem(key) || (!uid ? null : localStorage.getItem(CACHE_KEY_PREFIX));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data) && parsed.data.length > 0) {
      return parsed.data;
    }
  } catch {
    return null;
  }
  return null;
};

const ExplorePage = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || "";
  const cachedInitial = useMemo(() => getInitialCachedExploreFeed(userId), [userId]);
  const [exploreFeed, setExploreFeed] = useState(cachedInitial || []);
  const [visibleTracks, setVisibleTracks] = useState(() => {
    if (cachedInitial && Array.isArray(cachedInitial)) {
      const initialVisible = {};
      cachedInitial.forEach(({ title }) => {
        initialVisible[title] = 5;
      });
      return initialVisible;
    }
    return {};
  });
  const [loading, setLoading] = useState(!cachedInitial || cachedInitial.length === 0);
  const [activeFilter, setActiveFilter] = useState("All");

  // Sync cache if userId updates after mount
  useEffect(() => {
    if (userId) {
      const userCached = getInitialCachedExploreFeed(userId);
      if (userCached && userCached.length > 0) {
        setExploreFeed(userCached);
        setVisibleTracks((prev) => {
          const next = { ...prev };
          userCached.forEach(({ title }) => {
            if (!next[title]) next[title] = 5;
          });
          return next;
        });
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    const fetchExploreSections = async () => {
      // SWR: Only display full screen loader if no cached explore feed data is currently rendered
      if (!exploreFeed || exploreFeed.length === 0) {
        setLoading(true);
      }

      try {
        const exploreData = await fetchExploreFeed();

        if (!isMounted) return;

        if (Array.isArray(exploreData) && exploreData.length > 0) {
          setExploreFeed(exploreData);

          setVisibleTracks((prev) => {
            const nextVisible = { ...prev };
            exploreData.forEach(({ title }) => {
              if (!nextVisible[title]) {
                nextVisible[title] = 5;
              }
            });
            return nextVisible;
          });

          // Update SWR cache in localStorage for instant render on subsequent visits
          try {
            const key = userId ? `${CACHE_KEY_PREFIX}_${userId}` : CACHE_KEY_PREFIX;
            localStorage.setItem(
              key,
              JSON.stringify({ timestamp: Date.now(), data: exploreData })
            );
          } catch {
            // Ignore localStorage quota errors
          }
        }
      } catch (err) {
        console.error("Explore fetch failed:", err);
        if (isMounted && (!exploreFeed || exploreFeed.length === 0)) {
          setExploreFeed([]);
        }
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

  const handleCollapse = (title) => {
    setVisibleTracks((prev) => ({
      ...prev,
      [title]: 5,
    }));
  };

  /**
   * Category Filter Selection Handler
   */
  const handleSelectCategory = async (categoryQuery, categoryMeta = null) => {
    if (!categoryQuery) return;
    setActiveFilter(categoryQuery);

    if (categoryQuery === "All") return;

    // Check if section already exists in explore feed using canonical taxonomy matching
    const existingIndex = exploreFeed.findIndex((sec) => matchesCategory(sec, categoryQuery));

    // If section already exists with tracks, ensure visible count is set and reuse it
    if (existingIndex !== -1 && exploreFeed[existingIndex]?.tracks?.length > 0) {
      const existingSec = exploreFeed[existingIndex];
      setVisibleTracks((prev) => ({
        ...prev,
        [existingSec.title]: prev[existingSec.title] || 5,
      }));
      return;
    }

    // Otherwise fetch fresh music section for this category from PostgreSQL (0-Quota rule)
    const displayName = categoryMeta?.name || categoryQuery;
    toast.loading(`Loading ${displayName}...`, { id: "explore-genre" });
    try {
      const { title, category, keyword, tracks } = await fetchCategoryTracks(categoryQuery, 20);
      if (tracks && tracks.length > 0) {
        const sectionTitle = title || categoryMeta?.name || categoryQuery;
        const newSection = {
          title: sectionTitle,
          category: category || categoryQuery,
          keyword: keyword || categoryQuery,
          tracks,
        };

        // Prepend new section and remove any prior empty or duplicate section for this category
        setExploreFeed((prev) => [
          newSection,
          ...prev.filter((sec) => !matchesCategory(sec, categoryQuery)),
        ]);

        setVisibleTracks((prev) => ({
          ...prev,
          [sectionTitle]: 5,
          [categoryQuery]: 5,
        }));
        toast.success(`Loaded ${sectionTitle}`, { id: "explore-genre" });
      } else {
        toast.error(`No tracks found for ${displayName}`, { id: "explore-genre" });
      }
    } catch (e) {
      toast.error(`Failed to load ${displayName}`, { id: "explore-genre" });
    }
  };

  /**
   * Surprise Me / Random Station Mix Generator (Option 3 Discovery Bar)
   * Samples a randomized 20-track mix across loaded sections for serendipitous listening.
   */
  const handleSurpriseMe = () => {
    if (!exploreFeed || exploreFeed.length === 0) return;

    // Aggregate all unique tracks across currently loaded sections
    const allTracks = [];
    exploreFeed.forEach((sec) => {
      (sec.tracks || []).forEach((trk) => {
        const id = trk.id || trk.videoId;
        if (id && !allTracks.some((t) => (t.id || t.videoId) === id)) {
          allTracks.push(trk);
        }
      });
    });

    if (allTracks.length === 0) {
      toast.error("No tracks available for surprise mix");
      return;
    }

    // Pick a random seed track and shuffle 20 tracks
    const shuffled = [...allTracks].sort(() => 0.5 - Math.random()).slice(0, 20);

    usePlayerStore.getState().playStation(shuffled, {
      shuffle: true,
      stationName: "Surprise Discovery Mix",
      source: "EXPLORE_SURPRISE",
    });

    toast.success("🎲 Tuning into Surprise Discovery Mix (20 Tracks)!");
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

    const matchingSec = exploreFeed.find((sec) => matchesCategory(sec, activeFilter));

    return (matchingSec?.tracks || []).slice(0, 5).map((t) => ({
      ...t,
      categoryName: matchingSec?.title || activeFilter,
    }));
  }, [exploreFeed, activeFilter]);

  /**
   * Top 4 Trending Leaderboard Tracks for ExploreSplitHero (Phase 4.4):
   * - "All" mode: Selects top 4 ranked tracks across all sections in exploreFeed
   * - Filtered mode: Selects top 4 ranked tracks of the selected category
   */
  const leaderboardTracks = useMemo(() => {
    if (activeFilter === "All") {
      const pool = [];
      for (const sec of exploreFeed || []) {
        for (const trk of sec.tracks || []) {
          const id = trk.id || trk.videoId;
          if (id && !pool.some((t) => (t.id || t.videoId) === id)) {
            pool.push({ ...trk, categoryName: sec.title });
            if (pool.length >= 4) break;
          }
        }
        if (pool.length >= 4) break;
      }
      return pool.slice(0, 4);
    }

    const matchingSec = exploreFeed.find((sec) => matchesCategory(sec, activeFilter));
    return (matchingSec?.tracks || []).slice(0, 4).map((t) => ({
      ...t,
      categoryName: matchingSec?.title || activeFilter,
    }));
  }, [exploreFeed, activeFilter]);

  /**
   * Complete 20-track Station Playlist for Hero Spotlight Banner "Play Station" CTA:
   * - Filtered mode: Full 20-track section of the active category
   * - "All" mode: Round-robin across explore sections to guarantee exactly 20 unique tracks
   */
  const spotlightStationTracks = useMemo(() => {
    if (activeFilter === "All") {
      const allTracks = [];
      let round = 0;
      while (allTracks.length < 20 && round < 20) {
        let addedThisRound = false;
        for (const sec of exploreFeed || []) {
          if (Array.isArray(sec.tracks) && sec.tracks[round]) {
            const trk = sec.tracks[round];
            const trkId = trk.id || trk.videoId;
            if (trkId && !allTracks.some((t) => (t.id || t.videoId) === trkId)) {
              allTracks.push({
                ...trk,
                categoryName: sec.title || "Explore Spotlight",
              });
              addedThisRound = true;
              if (allTracks.length >= 20) break;
            }
          }
        }
        if (!addedThisRound) break;
        round++;
      }
      return allTracks.slice(0, 20);
    }

    const matchingSec = exploreFeed.find((sec) => matchesCategory(sec, activeFilter));
    return matchingSec?.tracks || [];
  }, [exploreFeed, activeFilter]);

  /**
   * Declarative Section Filtering (useMemo)
   */
  const displayedSections = useMemo(() => {
    if (activeFilter === "All") return exploreFeed;

    return exploreFeed.filter((sec) => matchesCategory(sec, activeFilter));
  }, [exploreFeed, activeFilter]);

  /**
   * Total tracks currently available across displayed sections
   */
  const totalAvailableTracks = useMemo(() => {
    return displayedSections.reduce((acc, sec) => acc + (sec.tracks?.length || 0), 0);
  }, [displayedSections]);

  return (
    <AppLayout>
      <div className="w-full mx-auto py-2 animate-in fade-in duration-300">
        
        {/* Page Title Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center shadow-md shadow-[var(--color-primary)]/10 backdrop-blur-md shrink-0">
              <Compass className="text-[var(--color-primary)] animate-spin-slow" size={22} />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
                Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-pink-500">Music</span>
              </h1>
              <p className="text-xs font-semibold text-[var(--color-on-surface-variant)] tracking-wide mt-0.5">
                Discover trending tracks, genres, and spotlight mixes
              </p>
            </div>
          </div>
        </div>

        {/* 1. Cinematic Split Hero Layout (Phase 4.4: 70% Banner + 30% Hot 4 Leaderboard) */}
        <ExploreSplitHero
          trendingTracks={trendingTracks}
          stationTracks={spotlightStationTracks}
          leaderboardTracks={leaderboardTracks}
          activeCategory={activeFilter}
          loading={loading}
          enablePanAnimation={true}
          imageObjectPosition="center center"
        />

        {/* 2. Sleek Discovery Control Bar (Option 3: Grouped Dropdown & Surprise Mix) */}
        <ExploreDiscoveryBar
          activeCategory={activeFilter}
          onSelectCategory={handleSelectCategory}
          onSurpriseMe={handleSurpriseMe}
          totalSections={displayedSections.length}
          totalTracks={totalAvailableTracks}
        />

        {/* 3. Categorized Music Track Sections */}
        {loading ? (
          <Loader message="Curating Explore Discovery Feed..." />
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
                  onCollapse={() => handleCollapse(section.title)}
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
