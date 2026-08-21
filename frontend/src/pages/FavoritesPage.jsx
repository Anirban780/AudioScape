import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import useAuthStore from '@/store/useAuthStore';
import { fetchUserLikedSongs, saveLikeSong } from '@/utils/api';
import MusicCard from '@/components/Cards/MusicCard';
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from '@/store/usePlaylistStore';
import { useRefreshOn } from "@/store/useDataRefreshStore";
import Loader from '@/components/Home/Loader';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import MediaGrid from '@/components/Layout/MediaGrid';
import FavoritesHeroBanner from '@/components/Favorites/FavoritesHeroBanner';
import FavoritesFilterBar from '@/components/Favorites/FavoritesFilterBar';
import FavoritesVinylCard from '@/components/Favorites/FavoritesVinylCard';
import PlaylistModal from '@/components/Playlist/PlaylistModal';

/**
 * ============================================================================
 * FAVORITES PAGE (FavoritesPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the authenticated user's liked/favourited music collection with
 * premium features like a cinematic hero banner, filtering, sorting, and 
 * multiple view modes.
 */
const FavoritesPage = () => {
    const user = useAuthStore((s) => s.user);
    const [likedSongs, setLikedSongs] = useState([]);
    const { setTrack, setQueue, playTrack } = usePlayerStore();
    const { setIsPlaylistModalOpen, setSelectedSongForPlaylist } = usePlaylistStore();
    const [loading, setLoading] = useState(true);

    const userId = user?.id || user?.uid || "";

    // Filters and View State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("most-played");
    const [sortDirection, setSortDirection] = useState("desc"); // "asc" | "desc"
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem("audioscape-favorites-view") || "grid";
    });

    useEffect(() => {
        localStorage.setItem("audioscape-favorites-view", viewMode);
    }, [viewMode]);

    const fetchLikedSongs = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);

            const favorites = await fetchUserLikedSongs(userId);
            if (!favorites) {
                if (showLoader) toast.error('Failed to fetch liked songs.');
                return;
            }

            setLikedSongs(favorites);

        } catch (error) {
            if (showLoader) toast.error('Failed to fetch liked songs.');
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchLikedSongs(true);
        } else {
            setLoading(false);
        }
    }, [userId]);

    // Automatically refetch favorites 5 seconds after any like/unlike mutation
    useRefreshOn("favorites", () => fetchLikedSongs(false), 5000);

    // Handle Remove from Favorites
    const handleRemoveFavorite = async (song) => {
        const previousSongs = [...likedSongs];
        // Optimistic update
        setLikedSongs(prev => prev.filter(s => (s.id || s.videoId) !== (song.id || song.videoId)));
        
        try {
            const success = await saveLikeSong(userId, song, false);
            if (success !== false) {
                toast.success('Removed from favourites', {
                    icon: '💔',
                });
            } else {
                throw new Error("Failed to remove");
            }
        } catch (error) {
            // Revert on failure
            setLikedSongs(previousSongs);
            toast.error('Failed to remove from favourites');
        }
    };

    // Client-side filtering and sorting
    const processedSongs = useMemo(() => {
        let result = [...likedSongs];

        // 1. Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(song => {
                const title = (song.name || song.title || "").toLowerCase();
                const artist = (song.artist || song.channelTitle || "").toLowerCase();
                return title.includes(query) || artist.includes(query);
            });
        }

        // 2. Sort
        switch (sortBy) {
            case "most-played":
                result.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
                break;
            case "last-added":
                result.sort((a, b) => {
                    const dateA = a.likedAt ? new Date(a.likedAt).getTime() : 0;
                    const dateB = b.likedAt ? new Date(b.likedAt).getTime() : 0;
                    return dateB - dateA;
                });
                break;
            case "title-asc":
                result.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
                break;
            case "artist-asc":
                result.sort((a, b) => (a.artist || a.channelTitle || "").localeCompare(b.artist || b.channelTitle || ""));
                break;
            default:
                break;
        }

        // 3. Direction
        if (sortDirection === "asc") {
            result.reverse();
        }

        return result;
    }, [likedSongs, searchQuery, sortBy, sortDirection]);

    // Playback Handlers
    const handlePlayTrack = (track) => {
        setQueue(processedSongs);
        setTrack(track);
        playTrack(track);
    };

    const handlePlayAll = () => {
        if (processedSongs.length === 0) return;
        setQueue(processedSongs);
        setTrack(processedSongs[0]);
        playTrack(processedSongs[0]);
    };

    const handleShuffle = () => {
        if (processedSongs.length === 0) return;
        const shuffled = [...processedSongs].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setTrack(shuffled[0]);
        playTrack(shuffled[0]);
    };

    const handleAddToPlaylist = (song) => {
        setSelectedSongForPlaylist(song);
        setIsPlaylistModalOpen(true);
    };

    return (
        <AppLayout>
            <div className="w-full animate-in fade-in duration-300 pb-20">
                
                {loading ? (
                    <div className="mt-20">
                        <Loader message="Loading your favourites..." />
                    </div>
                ) : likedSongs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="w-24 h-24 bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
                            <Heart size={48} className="text-pink-500 fill-pink-500/20" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--color-on-surface)] mb-3">No favourites yet</h2>
                        <p className="text-[var(--color-on-surface-variant)] text-center max-w-md mb-8">
                            Build your personal vault of cherished melodies. Click the heart icon on any track to save it here!
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 1. Hero Banner */}
                        <FavoritesHeroBanner 
                            tracks={likedSongs.slice(0, 5)} 
                            onPlayAll={handlePlayAll}
                            onShuffle={handleShuffle}
                            trackCount={likedSongs.length}
                        />

                        {/* 2. Filter & Sort Bar */}
                        <FavoritesFilterBar 
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            viewMode={viewMode}
                            onViewChange={setViewMode}
                            totalCount={likedSongs.length}
                            filteredCount={processedSongs.length}
                            sortDirection={sortDirection}
                            onDirectionToggle={() => setSortDirection(prev => prev === "desc" ? "asc" : "desc")}
                        />

                        {/* 3. Track Grid / List */}
                        {processedSongs.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-[var(--color-on-surface)] font-medium">No matches found for "{searchQuery}"</p>
                                <button 
                                    onClick={() => setSearchQuery("")}
                                    className="mt-4 text-pink-500 hover:underline text-sm font-bold cursor-pointer"
                                >
                                    Clear search
                                </button>
                            </div>
                        ) : viewMode === "grid" ? (
                            <MediaGrid>
                                {processedSongs.map((track, index) => (
                                    <FavoritesVinylCard
                                        key={`${track.id || track.videoId}-${index}`}
                                        song={track}
                                        index={index}
                                        onPlay={handlePlayTrack}
                                        onAddToPlaylist={handleAddToPlaylist}
                                        onRemove={handleRemoveFavorite}
                                    />
                                ))}
                            </MediaGrid>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {processedSongs.map((track, index) => {
                                    const title = track.name || track.title || "Unknown Title";
                                    const artist = track.artist || track.channelTitle || "Unknown Artist";
                                    const thumb = track.thumbnail || track.thumbNail || "";
                                    return (
                                        <div key={`${track.id || track.videoId}-${index}`} 
                                             onClick={() => handlePlayTrack(track)}
                                             className="flex items-center gap-3 bg-[var(--color-surface-raised)] p-2.5 pr-4 rounded-xl hover:bg-[var(--color-surface-overlay)] transition-colors group cursor-pointer border border-[var(--color-border-subtle)] hover:border-pink-500/30">
                                            <div className="w-7 text-center text-xs font-bold text-[var(--color-on-surface-variant)] group-hover:text-pink-500 transition-colors">
                                                {index + 1}
                                            </div>
                                            <div className="relative w-12 h-12 shrink-0">
                                                <img src={thumb} alt={title} className="w-full h-full object-cover rounded-lg shadow-sm" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate group-hover:text-pink-500 transition-colors">{title}</p>
                                                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">{artist}</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToPlaylist(track);
                                                    }}
                                                    className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface)] rounded-full transition-colors"
                                                    title="Add to playlist"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveFavorite(track);
                                                    }}
                                                    className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface)] rounded-full transition-colors"
                                                    title="Remove from favorites"
                                                >
                                                    <Heart size={18} className="fill-pink-500 text-pink-500" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
            <PlaylistModal />
        </AppLayout>
    );
};

export default FavoritesPage;
