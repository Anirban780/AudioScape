import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { getExploreKeywords } from '@/utils/keywords';
import { fetchYoutubeMusic } from '@/utils/youtube';
import MusicCard from '@/components/Cards/MusicCard';
import { RefreshCcw } from 'lucide-react';
import { cacheRelatedTracks } from '@/utils/api';
import usePlayerStore from "@/store/usePlayerStore";
import toast from 'react-hot-toast';
import Loader from '@/components/Home/Loader';

/**
 * ============================================================================
 * EXPLORE MUSIC PAGE (ExplorePage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Music discovery page that fetches YouTube music categories based on user's
 * listening history keywords or curated fallback genres (lofi, pop, indie, etc.).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Keyword-based Personalisation: Queries `getExploreKeywords(uid)` to dynamically
 *    generate category feeds tailored to user taste.
 * 2. Caching Strategy: Caches fetched category tracks in local storage for 30 minutes
 *    (`CACHE_EXPIRY_MS`) to conserve YouTube Data API quota.
 * 3. AppLayout Unification: Uses AppLayout shell for global sidebar/header navigation
 *    and clean surface token styling.
 * 
 * HOW IT WORKS:
 * - Fetches up to 10 keyword sections in parallel via `fetchYoutubeMusic`.
 * - Manages track visibility pagination per section via `visibleTracks` state.
 * - Clicking any track card sets active track in `usePlayerStore`.
 */

const curatedGenres = [
  "lofi music", "pop hits", "indie rock", "anime music", "k-pop", "electronic", "jazz chill", "hip hop",
];

const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes cache

const ExplorePage = () => {
  const { user } = useAuth();
  const [exploreFeed, setExploreFeed] = useState([]);
  const [cache, setCache] = useState({});
  const [visibleTracks, setVisibleTracks] = useState({});
  const { setTrack } = usePlayerStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExploreSections = async () => {
      setLoading(true);

      try {
        let keywords = await getExploreKeywords(user?.uid);
        if (!keywords || keywords.length === 0) {
          keywords = curatedGenres;
        }

        const now = Date.now();
        const cachedFetchTime = localStorage.getItem('lastFetchTime');
        const isCacheValid = cachedFetchTime && (now - parseInt(cachedFetchTime) < CACHE_EXPIRY_MS);

        const exploreData = await Promise.all(
          keywords.slice(0, 10).map(async (keyword) => {
            if (isCacheValid && cache[keyword]) {
              return { title: keyword, tracks: cache[keyword] };
            }

            const tracks = await fetchYoutubeMusic(keyword, 20);
            setCache((prev) => ({ ...prev, [keyword]: tracks }));
            await cacheRelatedTracks(keyword, tracks);
            return { title: keyword, tracks };
          })
        );

        setExploreFeed(exploreData);

        const initialVisible = {};
        exploreData.forEach(({ title }) => {
          initialVisible[title] = 5;
        });
        setVisibleTracks(initialVisible);
        localStorage.setItem('lastFetchTime', now.toString());

        toast.success("Explore page contents fetched successfully");
      } catch (err) {
        console.error("Explore fetch failed:", err);
        toast.error("Explore page contents couldn't be fetched");
        setExploreFeed([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      fetchExploreSections();
    } else {
      setLoading(false);
      setExploreFeed([]);
    }
  }, [user]);

  const handleLoadMore = (title) => {
    setVisibleTracks((prev) => ({
      ...prev,
      [title]: prev[title] + 5,
    }));
  };

  return (
    <AppLayout>
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-left">🔍 Explore Music 🎶</h1>

        {loading ? (
          <Loader />
        ) : exploreFeed.length === 0 ? (
          <div className="text-center text-lg opacity-70 mt-10">
            No music content available. Try searching or check back later!
          </div>
        ) : (
          <div className="space-y-8">
            {exploreFeed.map((section, index) => (
              <div
                key={`${section.title}-${index}`}
                className="p-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md transition-all duration-300"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold capitalize tracking-wide">{section.title}</h2>
                </div>

                {section.tracks.length === 0 ? (
                  <p className="opacity-70 italic">No tracks available for {section.title}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {section.tracks
                      .slice(0, visibleTracks[section.title] || 5)
                      .map((track, index) => (
                        <MusicCard
                          key={`${track.id}-${index}`}
                          id={track.id}
                          name={track.name}
                          artist={track.artist}
                          image={track.thumbnail}
                          onClick={() => {
                            setTrack(track);
                            toast.success("Track selected successfully");
                          }}
                        />
                      ))}
                  </div>
                )}

                {visibleTracks[section.title] < section.tracks.length && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleLoadMore(section.title)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-medium hover:opacity-90 transition-all shadow-md"
                    >
                      <RefreshCcw size={16} />
                      <span>More</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
