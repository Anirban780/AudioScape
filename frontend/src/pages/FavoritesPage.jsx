import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import useAuthStore from '@/store/useAuthStore';
import { fetchUserLikedSongs, saveLikeSong } from '@/utils/api';
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from '@/store/usePlaylistStore';
import { useRefreshOn } from "@/store/useDataRefreshStore";
import Loader from '@/components/Home/Loader';
import toast from 'react-hot-toast';
import { Heart, HeartOff, ListPlus, Loader2, X, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import MediaGrid from '@/components/Layout/MediaGrid';
import FavoritesHeroBanner from '@/components/Favorites/FavoritesHeroBanner';
import FavoritesFilterBar from '@/components/Favorites/FavoritesFilterBar';
import FavoritesVinylCard from '@/components/Favorites/FavoritesVinylCard';
import placeholder from '@/assets/placeholder.jpg';
import { getHighResThumbnailUrl } from '@/utils/youtubeUtils';
import useThumbnailFailsafe from '@/hooks/useThumbnailFailsafe';

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
    const { openModal } = usePlaylistStore();
    const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();
    const [loading, setLoading] = useState(true);

    // Modal state for confirming track removal from favorites (prevents accidental unliking)
    const [confirmRemoveModal, setConfirmRemoveModal] = useState({
        open: false,
        song: null,
        loading: false,
    });

    const userId = user?.id || user?.uid || "";

    // Filters and View State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("most-played");
    const [sortDirection, setSortDirection] = useState("desc"); // "asc" | "desc"
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem("audioscape-favorites-view") || "grid";
    });

    // Pagination State (matching Discover page pagination pattern)
    const [page, setPage] = useState(1);
    const [jumpInput, setJumpInput] = useState("");
    const limit = 50; // max 50 songs per page

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
        if (!song) return;
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

    /**
     * Intercepts removal requests from FavoritesVinylCard and list rows,
     * presenting a confirmation modal to avoid accidental unliking & list reshuffling.
     */
    const initiateRemoveFavorite = (song) => {
        setConfirmRemoveModal({
            open: true,
            song,
            loading: false,
        });
    };

    const cancelRemoveFavorite = () => {
        setConfirmRemoveModal({
            open: false,
            song: null,
            loading: false,
        });
    };

    const confirmRemoveFavorite = async () => {
        const songToRemove = confirmRemoveModal.song;
        if (!songToRemove) return;

        setConfirmRemoveModal(prev => ({ ...prev, loading: true }));
        try {
            await handleRemoveFavorite(songToRemove);
        } finally {
            setConfirmRemoveModal({
                open: false,
                song: null,
                loading: false,
            });
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

    const totalPages = Math.max(1, Math.ceil(processedSongs.length / limit));

    // Auto-adjust page if current page exceeds totalPages (e.g. after removing favorite)
    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    // Paginated songs slice for the active page
    const paginatedSongs = useMemo(() => {
        const start = (page - 1) * limit;
        return processedSongs.slice(start, start + limit);
    }, [processedSongs, page, limit]);

    // Pagination Handlers matching Discover page UX
    const handleGoToPage = (targetPage) => {
        const pageNum = Number(targetPage);
        const maxPage = totalPages || 1;
        if (pageNum >= 1 && pageNum <= maxPage && pageNum !== page) {
            setPage(pageNum);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handlePrevPage = () => {
        if (page > 1) {
            handleGoToPage(page - 1);
        }
    };

    const handleNextPage = () => {
        if (page < totalPages) {
            handleGoToPage(page + 1);
        }
    };

    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const target = parseInt(jumpInput, 10);
        const maxPage = totalPages || 1;
        if (!isNaN(target) && target >= 1 && target <= maxPage) {
            handleGoToPage(target);
            setJumpInput("");
        } else {
            toast.error(`Please enter a page number between 1 and ${maxPage}`);
        }
    };

    // Generate numbered page buttons (with ellipsis for large page counts)
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = new Set([1, totalPages, page]);
        if (page > 1) pages.add(page - 1);
        if (page < totalPages) pages.add(page + 1);
        if (page === 1) { pages.add(2); pages.add(3); }
        if (page === totalPages) { pages.add(totalPages - 1); pages.add(totalPages - 2); }

        const sorted = Array.from(pages).sort((a, b) => a - b);
        const result = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
                result.push("...");
            }
            result.push(sorted[i]);
        }
        return result;
    }, [totalPages, page]);

    // Handlers for search/sort resetting page to 1
    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setPage(1);
    };

    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        setPage(1);
    };

    const handleDirectionToggle = () => {
        setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
        setPage(1);
    };

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

    /**
     * Triggers the global staged playlist modal with the selected song.
     */
    const handleAddToPlaylist = (song) => {
        if (!song) return;
        openModal(song);
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
                        {/* Page Title Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shadow-md shadow-pink-500/10 backdrop-blur-md shrink-0">
                                    <Heart className="text-pink-500 fill-pink-500/30" size={22} />
                                </div>
                                <div>
                                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
                                        Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">Favorites</span>
                                    </h1>
                                    <p className="text-xs font-semibold text-[var(--color-on-surface-variant)] tracking-wide mt-0.5">
                                        Your personal collection of cherished melodies
                                    </p>
                                </div>
                            </div>
                        </div>

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
                            onSortChange={handleSortChange}
                            searchQuery={searchQuery}
                            onSearchChange={handleSearchChange}
                            viewMode={viewMode}
                            onViewChange={setViewMode}
                            totalCount={likedSongs.length}
                            filteredCount={processedSongs.length}
                            sortDirection={sortDirection}
                            onDirectionToggle={handleDirectionToggle}
                        />

                        {/* 3. Track Grid / List */}
                        {processedSongs.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-[var(--color-on-surface)] font-medium">No matches found for "{searchQuery}"</p>
                                <button 
                                    onClick={() => handleSearchChange("")}
                                    className="mt-4 text-pink-500 hover:underline text-sm font-bold cursor-pointer"
                                >
                                    Clear search
                                </button>
                            </div>
                        ) : viewMode === "grid" ? (
                            <MediaGrid>
                                {paginatedSongs.map((track, index) => {
                                    const absoluteIndex = (page - 1) * limit + index;
                                    return (
                                        <FavoritesVinylCard
                                            key={`${track.id || track.videoId}-${absoluteIndex}`}
                                            song={track}
                                            index={absoluteIndex}
                                            onPlay={handlePlayTrack}
                                            onAddToPlaylist={handleAddToPlaylist}
                                            onRemove={initiateRemoveFavorite}
                                        />
                                    );
                                })}
                            </MediaGrid>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {paginatedSongs.map((track, index) => {
                                    const absoluteIndex = (page - 1) * limit + index;
                                    const title = track.name || track.title || "Unknown Title";
                                    const artist = track.artist || track.channelTitle || "Unknown Artist";
                                    const thumb = track.thumbnail || track.thumbNail || "";
                                    return (
                                        <div key={`${track.id || track.videoId}-${absoluteIndex}`} 
                                             onClick={() => handlePlayTrack(track)}
                                             className="flex items-center gap-3 bg-[var(--color-surface-raised)] p-2.5 pr-4 rounded-xl hover:bg-[var(--color-surface-overlay)] transition-colors group cursor-pointer border border-[var(--color-border-subtle)] hover:border-pink-500/30">
                                            <div className="w-7 text-center text-xs font-bold text-[var(--color-on-surface-variant)] group-hover:text-pink-500 transition-colors">
                                                {absoluteIndex + 1}
                                            </div>
                                            <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-overlay)] flex items-center justify-center">
                                                {thumb && !isImageDead(track.id || track.videoId) ? (
                                                    <img 
                                                        src={getHighResThumbnailUrl(thumb, track.id || track.videoId) || thumb} 
                                                        alt={title} 
                                                        className="w-full h-full object-cover rounded-lg shadow-sm"
                                                        onLoad={(e) => handleImgLoad(e, track.id || track.videoId, track.id || track.videoId)}
                                                        onError={(e) => handleImgError(e, track.id || track.videoId, track.id || track.videoId)}
                                                    />
                                                ) : (
                                                    <Music size={18} className="text-pink-500/70" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate group-hover:text-pink-500 transition-colors">{title}</p>
                                                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">{artist}</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleAddToPlaylist(track);
                                                    }}
                                                    className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer"
                                                    title="Add to playlist"
                                                    aria-label="Add to playlist"
                                                >
                                                    <ListPlus size={18} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        initiateRemoveFavorite(track);
                                                    }}
                                                    className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer"
                                                    title="Remove from favorites"
                                                    aria-label="Remove from favorites"
                                                >
                                                    <Heart size={18} className="fill-pink-500 text-pink-500" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 4. Pagination Footer Controls (Discover-style) */}
                        {!loading && processedSongs.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-[var(--color-border-default)]">
                                <div className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                                    Showing <span className="text-[var(--color-on-surface)] font-bold">{paginatedSongs.length}</span> of {processedSongs.length} tracks • Page {page} of {totalPages || 1}
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                                    {/* Previous Page Button */}
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={page <= 1}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-pink-500/50 text-[var(--color-on-surface)] font-bold text-xs transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                        title="Previous page"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={16} />
                                        <span className="hidden sm:inline">Prev</span>
                                    </button>

                                    {/* Numbered Page Buttons */}
                                    <div className="flex items-center gap-1">
                                        {pageNumbers.map((item, idx) => {
                                            if (item === "...") {
                                                return (
                                                    <span
                                                        key={`ellipsis-${idx}`}
                                                        className="w-8 h-8 flex items-center justify-center text-xs text-[var(--color-on-surface-variant)] select-none"
                                                    >
                                                        ...
                                                    </span>
                                                );
                                            }
                                            const pageNum = Number(item);
                                            const isActive = pageNum === page;
                                            return (
                                                <button
                                                    key={`page-${pageNum}`}
                                                    onClick={() => handleGoToPage(pageNum)}
                                                    className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                                                        isActive
                                                            ? "bg-pink-500 text-white shadow-md shadow-pink-500/25 scale-105 border border-pink-500"
                                                            : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-pink-500/50 hover:bg-[var(--color-state-hover)]"
                                                    }`}
                                                    title={`Go to page ${pageNum}`}
                                                    aria-label={`Go to page ${pageNum}`}
                                                    aria-current={isActive ? "page" : undefined}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Next Page Button */}
                                    <button
                                        onClick={handleNextPage}
                                        disabled={page >= totalPages}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-pink-500/50 text-[var(--color-on-surface)] font-bold text-xs transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                        title="Next page"
                                        aria-label="Next page"
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <ChevronRight size={16} />
                                    </button>

                                    {/* Explicit "Go To" Page Input Jumper */}
                                    {totalPages > 1 && (
                                        <form
                                            onSubmit={handleJumpSubmit}
                                            className="flex items-center gap-1.5 ml-1 pl-2 sm:ml-3 sm:pl-3 border-l border-[var(--color-border-default)]"
                                        >
                                            <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] hidden sm:inline">Go to:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max={totalPages}
                                                value={jumpInput}
                                                onChange={(e) => setJumpInput(e.target.value)}
                                                placeholder={page.toString()}
                                                className="w-11 h-[32px] px-1 text-xs text-center font-bold rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] focus:border-pink-500 focus:outline-none text-[var(--color-on-surface)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                aria-label="Target page number"
                                            />
                                            <button
                                                type="submit"
                                                className="h-[32px] px-2.5 text-xs font-bold rounded-lg bg-[var(--color-surface-overlay)] text-pink-400 border border-pink-500/40 hover:bg-pink-500 hover:text-white transition-all cursor-pointer shadow-xs"
                                                title="Jump to page"
                                            >
                                                Go
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Confirmation Dialog for Removing Song from Liked Songs */}
            {confirmRemoveModal.open && confirmRemoveModal.song && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={cancelRemoveFavorite}
                >
                    <div 
                        className="w-full max-w-md bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Ambient Glow Accent */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

                        {/* Close button */}
                        <button 
                            onClick={cancelRemoveFavorite}
                            className="absolute top-4 right-4 p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-full hover:bg-[var(--color-surface-overlay)] transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X size={18} />
                        </button>

                        {/* Header Warning Icon */}
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-500 mb-4 shadow-lg shadow-pink-500/10">
                            <HeartOff size={26} />
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-1">
                            Remove from Liked Songs?
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] max-w-xs mb-5">
                            Are you sure you want to remove this song from your collection? This will alter your favorites ranking.
                        </p>

                        {/* Track Info Preview Box */}
                        <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-3 flex items-center gap-3 mb-6 text-left">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/20 shrink-0 border border-white/10 flex items-center justify-center">
                                {confirmRemoveModal.song && !isImageDead(confirmRemoveModal.song.id || confirmRemoveModal.song.videoId) ? (
                                    <img 
                                        src={
                                            getHighResThumbnailUrl(
                                                confirmRemoveModal.song.thumbnail || confirmRemoveModal.song.thumbNail,
                                                confirmRemoveModal.song.id || confirmRemoveModal.song.videoId
                                            ) || placeholder
                                        } 
                                        alt={confirmRemoveModal.song.name || confirmRemoveModal.song.title}
                                        className="w-full h-full object-cover"
                                        onLoad={(e) => handleImgLoad(e, confirmRemoveModal.song.id || confirmRemoveModal.song.videoId, confirmRemoveModal.song.id || confirmRemoveModal.song.videoId)}
                                        onError={(e) => handleImgError(e, confirmRemoveModal.song.id || confirmRemoveModal.song.videoId, confirmRemoveModal.song.id || confirmRemoveModal.song.videoId)}
                                    />
                                ) : (
                                    <Music size={20} className="text-pink-500" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[var(--color-on-surface)] truncate">
                                    {confirmRemoveModal.song.name || confirmRemoveModal.song.title || "Untitled Track"}
                                </p>
                                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                                    {confirmRemoveModal.song.artist || confirmRemoveModal.song.channelTitle || "Unknown Artist"}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 w-full">
                            <button
                                type="button"
                                onClick={cancelRemoveFavorite}
                                disabled={confirmRemoveModal.loading}
                                className="flex-1 py-3 px-4 rounded-full text-sm font-bold text-[var(--color-on-surface)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmRemoveFavorite}
                                disabled={confirmRemoveModal.loading}
                                className="flex-1 py-3 px-4 rounded-full text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {confirmRemoveModal.loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Removing...</span>
                                    </>
                                ) : (
                                    <span>Remove</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
};

export default FavoritesPage;
