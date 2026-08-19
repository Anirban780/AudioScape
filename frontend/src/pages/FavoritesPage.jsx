import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import useAuthStore from '@/store/useAuthStore';
import { fetchUserLikedSongs } from '@/utils/api';
import MusicCard from '@/components/Cards/MusicCard';
import usePlayerStore from "@/store/usePlayerStore";
import Loader from '@/components/Home/Loader';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import MediaGrid from '@/components/Layout/MediaGrid';

/**
 * ============================================================================
 * FAVORITES PAGE (FavoritesPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the authenticated user's liked/favourited music collection.
 */
const FavoritesPage = () => {
    const user = useAuthStore((s) => s.user);
    const [likedSongs, setLikedSongs] = useState([]);
    const { setTrack } = usePlayerStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLikedSongs = async () => {
            try {
                setLoading(true);

                const favorites = await fetchUserLikedSongs(user?.id);
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
        } else {
            setLoading(false);
        }
    }, [user?.uid]);

    return (
        <AppLayout>
            <div className="w-full animate-in fade-in duration-300">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] tracking-tight mb-6 flex items-center gap-2.5">
                    <Heart className="text-pink-500 fill-pink-500/20" size={28} />
                    <span>Your Favourites</span>
                </h1>

                {loading ? (
                    <Loader message="Loading your favourites..." />
                ) : likedSongs.length === 0 ? (
                    <div className="text-center text-sm text-[var(--color-on-surface-variant)] py-12 px-6 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] max-w-md mx-auto my-8">
                        <p className="font-bold text-base text-[var(--color-on-surface)] mb-1">No favourites yet</p>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">Click the heart icon on any song to save it here!</p>
                    </div>
                ) : (
                    <MediaGrid>
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
                    </MediaGrid>
                )}
            </div>
        </AppLayout>
    );
};

export default FavoritesPage;
