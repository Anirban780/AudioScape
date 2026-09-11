import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import { fetchYoutubeMusic } from "@/utils/youtube";
import { fetchExploreFeed } from "@/utils/api";
import Loader from "@/components/Home/Loader";
import toast from "react-hot-toast";
import { Compass } from "lucide-react";

import ExploreTrendingBanner from "./ExploreTrendingBanner";
import ExploreFilterBar from "./ExploreFilterBar";
import ExploreSection from "./ExploreSection";

/**
 * ============================================================================
 * ARCHIVED: EXPLORE MUSIC PAGE (ExplorePage.jsx)
 * ============================================================================
 * Archived during Phase 3 of Explore-to-Home migration.
 * Superseded by Home GenreCategorySlider and CategoryPage (/category/:slug).
 */

const CACHE_KEY_PREFIX = "audioscape_cached_explore_feed";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 mins

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

  const handleSelectCategory = async (categoryQuery) => {
    if (!categoryQuery) return;
    setActiveFilter(categoryQuery);

    if (categoryQuery === "All") return;

    const existingIndex = exploreFeed.findIndex(
      (sec) => sec.title.toLowerCase().includes(categoryQuery.toLowerCase()) ||
               categoryQuery.toLowerCase().includes(sec.title.toLowerCase())
    );

    if (existingIndex !== -1) return;

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

  const displayedSections = useMemo(() => {
    if (activeFilter === "All") return exploreFeed;

    return exploreFeed.filter(
      (sec) => sec.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
               activeFilter.toLowerCase().includes(sec.title.toLowerCase())
    );
  }, [exploreFeed, activeFilter]);

  return (
    <AppLayout>
      <div className="w-full mx-auto py-2 animate-in fade-in duration-300">
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

        <ExploreFilterBar
          activeCategory={activeFilter}
          onSelectCategory={handleSelectCategory}
        />

        <ExploreTrendingBanner
          trendingTracks={trendingTracks}
          activeCategory={activeFilter}
          loading={loading}
          enablePanAnimation={true}
          imageObjectPosition="center center"
        />

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
