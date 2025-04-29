import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Home/Sidebar';
import SearchBar from '../components/Home/SearchBar';
import UserMenu from '../components/Auth/UserMenu';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { fetchUserLikedSongs } from '../utils/api';
import MusicCard from '../components/Cards/MusicCard';
import { Sun, Moon, Menu } from 'lucide-react';
import ResponsiveLayout from "../ResponsiveLayout";
import usePlayerStore from "../store/usePlayerStore";
import Loader2 from '../components/Home/Loader2';
import toast from 'react-hot-toast';

const FavoritesPage = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [likedSongs, setLikedSongs] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { track, setTrack } = usePlayerStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLikedSongs = async () => {
            try {
                setLoading(true);

                const favorites = await fetchUserLikedSongs(user.uid);
                if (!favorites) {
                    toast.error('Failed to fetch liked songs.');
                    return;
                }

                setLikedSongs(favorites);

            } catch (error) {
                toast.error('Failed to fetch liked songs.');
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) {
            fetchLikedSongs();
        }
    }, [user.uid]);

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

                    <div className='lg:mx-8 mt-8'>
                        <h1 className="text-3xl font-bold mb-4">Your Favourites</h1>

                        {loading ? (
                            <Loader2 />
                        ) : likedSongs.length === 0 ? (
                            <p className="text-muted-foreground text-center text-lg mt-10">
                                You haven't liked any songs yet.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mt-6">
                                {likedSongs.map((track, index) => (
                                    <MusicCard
                                        key={`${track.id}-${index}`}
                                        id={track.id}
                                        name={track.name}
                                        artist={track.artist}
                                        image={track.thumbnail}
                                        onClick={() => {
                                            setTrack(track);
                                            toast.success("Track selected");
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </ResponsiveLayout>
            </div>

        </div>
    );
};

export default FavoritesPage;
