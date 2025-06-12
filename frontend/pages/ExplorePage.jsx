import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Home/Sidebar';
import SearchBar from '../components/Home/SearchBar';
import UserMenu from '../components/Auth/UserMenu';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { getExploreKeywords } from '../utils/keywords';
import { fetchYoutubeMusic } from '../utils/youtube';
import MusicCard from '../components/Cards/MusicCard';
import { Sun, Moon, Menu, RefreshCcw } from 'lucide-react';
import ResponsiveLayout from "../ResponsiveLayout";
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
  const { theme, setTheme } = useTheme();
  const [exploreFeed, setExploreFeed] = useState([]);
  const [cache, setCache] = useState({});
  const [visibleTracks, setVisibleTracks] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { track, setTrack } = usePlayerStore();
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
        setExploreFeed([]); // Ensure exploreFeed is reset
      } finally {
        setLoading(false); // Always stop loader
      }
    };

    if (user?.uid) {
      fetchExploreSections();
    } else {
      setLoading(false); // No user, stop loading
      setExploreFeed([]); // Reset feed
    }
  }, [user]); // Depend only on user

  const handleLoadMore = (title) => {
    setVisibleTracks((prev) => ({
      ...prev,
      [title]: prev[title] + 5,
    }));
  };

  return (
    <div className={`h-screen flex transition-all duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"}`}>
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 h-full bg-white dark:bg-gray-900 shadow-md relative z-50">
            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <ResponsiveLayout>
          <div className="flex justify-between items-center w-full">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded bg-gray-200 dark:bg-gray-700"
            >
              <Menu size={20} />
            </button>

            <div className="w-full max-w-lg mx-auto">
              <SearchBar onSelectTrack={setTrack} />
            </div>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 mx-4 rounded-full bg-gray-300 dark:bg-gray-700 transition-all"
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-gray-900" />
              )}
            </button>

            <UserMenu />
          </div>

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
                    className={`p-4 rounded-2xl border-2 shadow backdrop-blur-lg transition-all duration-300 ${theme === "dark"
                      ? "border-gray-700 bg-gray-900/60 shadow-blue-500"
                      : "border-gray-200 bg-white/60 shadow-gray-500"
                      }`}
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

        </ResponsiveLayout>
      </div>

    </div>
  );
};

export default ExplorePage;