import React, { useEffect, useState } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { getExploreKeywords } from '../utils/keywords';
import { fetchYoutubeMusic } from '../utils/youtube';
import MusicCard from '../components/Cards/MusicCard';
import { RefreshCcw } from 'lucide-react';
import { cacheRelatedTracks } from '../utils/api';
import usePlayerStore from "../store/usePlayerStore";
import toast from 'react-hot-toast';
import Loader2 from '../components/Home/Loader2';

const curatedGenres = [
  "lofi music", "pop hits", "indie rock", "anime music", "k-pop", "electronic", "jazz chill", "hip hop",
];

const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

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
        let keywords = await getExploreKeywords(user.uid);
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
      <div className='lg:mx-8 mt-8 pb-32'>
        <h1 className="text-3xl font-bold mb-6 text-center md:text-left">🔍 Explore Music 🎶</h1>

        {loading ? (
          <Loader2 />
        ) : exploreFeed.length === 0 ? (
          <div className="text-center text-lg text-gray-500 dark:text-gray-400">
            No music content available. Try searching or check back later!
          </div>
        ) : (
          <div className="space-y-8">
            {exploreFeed.map((section, index) => (
              <div
                key={`${section.title}-${index}`}
                className="p-4 rounded-2xl border-2 shadow backdrop-blur-lg transition-all duration-300 border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 shadow-gray-500 dark:shadow-blue-500"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold capitalize">{section.title}</h2>
                </div>

                {section.tracks.length === 0 ? (
                  <p className="text-gray-500">No tracks available for {section.title}</p>
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
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <RefreshCcw size={18} />
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