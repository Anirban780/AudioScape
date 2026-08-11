import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { fetchUserLikedSongs } from '@/utils/api';
import MusicCard from '@/components/Cards/MusicCard';
import usePlayerStore from "@/store/usePlayerStore";
import Loader from '@/components/Home/Loader';
import toast from 'react-hot-toast';

/**
 * ============================================================================
 * FAVORITES PAGE (FavoritesPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the authenticated user's liked/favourited music collection.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. AppLayout Shell Unification: Wraps content cleanly in `<AppLayout>` to inherit
 *    the global sidebar, sticky search header, theme toggle, and bottom player padding.
 * 2. Firestore Sync: Queries `fetchUserLikedSongs(user.uid)` from `@/utils/api`
 *    to retrieve all tracks marked as favourite in Firestore.
 * 
 * HOW IT WORKS:
 * - On mount, checks `user?.uid` and triggers async fetch of liked songs.
 * - Displays loading spinner via `Loader` while data resolves.
 * - Renders a responsive grid of `MusicCard` components for each liked song.
 */
const FavoritesPage = () => {
    const { user } = useAuth();
    const [likedSongs, setLikedSongs] = useState([]);
    const { setTrack } = usePlayerStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLikedSongs = async () => {
            try {
                setLoading(true);

                const favorites = await fetchUserLikedSongs(user?.uid);
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
    }, [user?.uid]);

    return (
        <AppLayout>
            <div className="w-full">
                <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                    <span>❤️</span> Your Favourites 🎶
                </h1>

                {loading ? (
                    <Loader />
                ) : likedSongs.length === 0 ? (
                    <div className="text-center text-lg opacity-70 mt-12 p-8 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] max-w-md mx-auto">
                        <p className="font-medium mb-1">No favourites yet</p>
                        <p className="text-sm opacity-80">Click the heart icon on any song to save it here!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
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
        </AppLayout>
    );
};

export default FavoritesPage;
