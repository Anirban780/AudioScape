import React, { useEffect, useState } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { fetchUserLikedSongs } from '../utils/api';
import MusicCard from '../components/Cards/MusicCard';
import usePlayerStore from "../store/usePlayerStore";
import Loader2 from '../components/Home/Loader2';
import toast from 'react-hot-toast';

const FavoritesPage = () => {
    const { user } = useAuth();
    const [likedSongs, setLikedSongs] = useState([]);
    const { setTrack } = usePlayerStore();
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
    }, [user?.uid]);

    return (
        <AppLayout>
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
        </AppLayout>
    );
};

export default FavoritesPage;
