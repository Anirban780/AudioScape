import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Home/Sidebar';
import SearchBar from '../components/Home/SearchBar';
import UserMenu from '../components/Auth/UserMenu';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { getPersonalizedExploreKeywords } from '../utils/keywords';
import { fetchYoutubeMusic } from '../utils/youtube';
import MusicCard from '../components/Cards/MusicCard';
import { Sun, Moon, Menu } from 'lucide-react';
import PlayerContainer from '../components/Player/PlayerContainer';
import ResponsiveLayout from "../ResponsiveLayout";
import { cacheRelatedTracks } from '../utils/api';
import usePlayerStore from "../store/usePlayerStore";

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
  const [lastFetchTime, setLastFetchTime] = useState(null);

  useEffect(() => {
    const fetchExploreSections = async () => {
      try {
        let keywords = await getPersonalizedExploreKeywords(user.uid);

        if (!keywords || keywords.length === 0) {
          keywords = curatedGenres;
        }

        // Check if cache is valid and not expired (1 hour)
        const now = Date.now();
        if (!lastFetchTime || now - lastFetchTime > CACHE_EXPIRY_MS) {
          // Cache expired, make the API call
          console.log("🔄 Fetching new data for all keywords");

          // Fetch data for all the keywords (personalized + curated)
          const exploreData = await Promise.all(
            keywords.slice(0, 10).map(async (keyword) => {
              if (cache[keyword]) {
                return { title: keyword, tracks: cache[keyword] }; // Use cache if available
              }

              const tracks = await fetchYoutubeMusic(keyword, 20);
              setCache((prev) => ({ ...prev, [keyword]: tracks })); // Store the tracks in cache

              // Cache related tracks to Firestore
              await cacheRelatedTracks(keyword, tracks);
              return { title: keyword, tracks };
            })
          );

          const initialVisible = {};
          exploreData.forEach(({ title }) => {
            initialVisible[title] = 5; // Set initial visible tracks for each keyword
          });

          setVisibleTracks(initialVisible);
          setExploreFeed(exploreData);
          setLastFetchTime(now); // Update the last fetch time

        } 
        else {
          // Cache is valid, fetch from cache
          console.log("✅ Using cached data");

          const exploreData = await Promise.all(
            keywords.slice(0, 10).map(async (keyword) => {
              if (cache[keyword]) {
                return { title: keyword, tracks: cache[keyword] }; // Use cache if available
              }
              return { title: keyword, tracks: [] }; // No tracks, just empty array (this case shouldn't happen)
            })
          );

          const initialVisible = {};
          exploreData.forEach(({ title }) => {
            initialVisible[title] = 5; // Set initial visible tracks for each keyword
          });

          setVisibleTracks(initialVisible);
          setExploreFeed(exploreData);
        }
      } catch (err) {
        console.error("Explore fetch failed:", err);
      }
    };

    fetchExploreSections();
  }, [user, lastFetchTime]);


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

      {/* Sidebar - Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Sidebar */}
          <div className="w-60 h-full bg-white dark:bg-gray-900  shadow-md relative z-50">

            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>

        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <ResponsiveLayout>
          {/* Navbar Section */}
          <div className="flex justify-between items-center w-full">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded bg-gray-200 dark:bg-gray-700"
            >
              <Menu size={20} />
            </button>

            {/* Search Bar */}
            <div className="w-full max-w-lg mx-auto">
              <SearchBar onSelectTrack={setTrack} />
            </div>

            {/* Theme Toggle */}
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

            {/* User Menu */}
            <UserMenu />
          </div>

          <div className='lg:mx-8 mt-8'>
            {/* Explore Title */}
            <h1 className="text-3xl font-bold mb-4">Explore Music</h1>

            {/* Explore Sections */}
            {exploreFeed.map((section) => (
              <div key={section.title} className="mb-10">
                <h2 className="text-xl font-semibold mb-3 capitalize">{section.title}</h2>

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
                        }}
                      />
                    ))}
                </div>

                {/* Load More */}
                {visibleTracks[section.title] < section.tracks.length && (
                  <div className="mt-4 flex justify-end mr-12">
                    <button
                      onClick={() => handleLoadMore(section.title)}
                      className="bg-blue-600 text-white px-4 py-2  rounded hover:bg-blue-700 transition-all dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ResponsiveLayout>
      </div>

      {track && (
        <PlayerContainer
          onClose={() => setTrack(null)}
          uid={user.uid}
        />
      )}
    </div>
  );
};

export default ExplorePage;
