import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import usePlayerStore from "@/store/usePlayerStore";
import Loader from "@/components/Home/Loader";
import toast from "react-hot-toast";
import { ListMusic, Disc3, Trash2, X, Loader2, Pencil } from "lucide-react";
import { getPlaylists, getPlaylistById, deletePlaylist, createPlaylist, updatePlaylist } from "@/utils/playlists";
import PlaylistHeroHeader from "@/components/Playlist/PlaylistHeroHeader";
import PlaylistFilterBar from "@/components/Playlist/PlaylistFilterBar";
import PlaylistCard from "@/components/Playlist/PlaylistCard";
import PlaylistCreateModal from "@/components/Playlist/PlaylistCreateModal";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * PLAYLISTS PAGE (PlaylistsPage.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Full redesign of the Playlists list view (/playlists).
 * Renders the authenticated user's entire playlist library with:
 * - Glassmorphic hero header with stats and "Create Playlist" CTA
 * - Interactive 3-item Spotlight Quick-Switch Dock with 1-click playback
 * - Search, sort, and grid/list view controls
 * - Spotify-style 2x2 mosaic PlaylistCard grid
 * - Delete confirmation modal
 * - Inline rename modal
 * - Empty state for no playlists
 * - Robust Failsafe: Failed/broken list row thumbnails automatically degrade to gradient icon stubs.
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Two-level navigation: This page is the INDEX view; clicking a card goes
 *    to /playlists/:id (the DETAIL view built in Phase 4).
 * 2. Consistent with Favorites: Shares FilterBar, sticky position, and view
 *    mode toggle patterns from FavoritesPage.jsx for coherent UX.
 * 3. Brand purple accent: Uses var(--color-primary) throughout instead of
 *    the pink used by Favorites — differentiates the two sections.
 * 4. Client-side filtering/sorting: Fast, no-network search and sort on the
 *    already-fetched playlist array.
 * ============================================================================
 */
const PlaylistsPage = () => {
    const user = useAuthStore((s) => s.user);
    const { playlists, setPlaylists, openCreateModal, closeCreateModal, isCreateModalOpen } = usePlaylistStore();
    const { setTrack, setQueue, setIsPlaying } = usePlayerStore();
    const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

    const [loading, setLoading] = useState(true);

    /**
     * 1-Click Playback: plays an entire playlist from the hero spotlight.
     */
    const handlePlayPlaylist = async (playlist) => {
        if (!playlist) return;
        try {
            let tracks = playlist.songs || playlist.tracks || [];
            if (!tracks.length && playlist.id) {
                const fullPl = await getPlaylistById(user?.id, playlist.id);
                tracks = fullPl?.songs || fullPl?.tracks || [];
            }
            if (!tracks.length) {
                toast("This playlist is empty. Add songs to start playing!", { icon: "🎵" });
                return;
            }
            setQueue(tracks);
            await setTrack(tracks[0]);
            setIsPlaying(true);
            toast.success(`Playing "${playlist.name}"`);
        } catch (err) {
            console.error("Failed to play playlist:", err);
            toast.error("Failed to play playlist");
        }
    };

    // Search / sort / view mode state — persisted to localStorage
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("updated");
    const [sortDirection, setSortDirection] = useState(() =>
        localStorage.getItem("audioscape-playlists-sort-dir") || "desc"
    );
    const [viewMode, setViewMode] = useState(() =>
        localStorage.getItem("audioscape-playlists-view") || "grid"
    );

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null, loading: false });

    // Rename/edit modal state
    const [editModal, setEditModal] = useState({ open: false, playlist: null, newName: "", loading: false });

    // Persist view mode and sort direction changes
    useEffect(() => {
        localStorage.setItem("audioscape-playlists-view", viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem("audioscape-playlists-sort-dir", sortDirection);
    }, [sortDirection]);

    /**
     * Loads user playlists from the backend on mount or user change.
     */
    const loadPlaylists = async (showLoader = true) => {
        if (!user) {
            setLoading(false);
            return;
        }
        if (showLoader) setLoading(true);
        try {
            const data = await getPlaylists(user.id);
            setPlaylists(data);
        } catch (err) {
            toast.error("Failed to load playlists");
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        loadPlaylists(true);
    }, [user]);

    // ── Aggregated Stats ──────────────────────────────────────────────────────
    const totalTrackCount = useMemo(() => {
        return playlists.reduce((acc, pl) => acc + (pl.trackCount || pl.songs?.length || 0), 0);
    }, [playlists]);

    // ── Client-side filtering & sorting ──────────────────────────────────────
    const processedPlaylists = useMemo(() => {
        let result = [...playlists];

        // 1. Search filter by playlist name
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((pl) => pl.name.toLowerCase().includes(q));
        }

        // 2. Sort
        switch (sortBy) {
            case "updated":
                result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case "created":
                result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case "name":
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "tracks":
                result.sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0));
                break;
            default:
                break;
        }

        // 3. Direction
        if (sortDirection === "asc") result.reverse();

        return result;
    }, [playlists, searchQuery, sortBy, sortDirection]);

    // ── Create Playlist ───────────────────────────────────────────────────────
    /**
     * Called by PlaylistCreateModal on submit.
     * Creates the playlist in the backend then refreshes the list.
     */
    const handleCreatePlaylist = async (name, description) => {
        try {
            await createPlaylist(user.id, name, description);
            toast.success(`Playlist "${name}" created!`);
            await loadPlaylists(false);
        } catch (err) {
            toast.error(err.message || "Failed to create playlist");
            throw err; // Let the modal handle re-enabling the form
        }
    };

    // ── Delete Playlist ───────────────────────────────────────────────────────
    const confirmDelete = (playlist) => {
        setDeleteModal({ open: true, playlist, loading: false });
    };

    const handleDelete = async () => {
        if (!deleteModal.playlist) return;
        setDeleteModal((prev) => ({ ...prev, loading: true }));
        try {
            await deletePlaylist(user.id, deleteModal.playlist.id);
            toast.success(`"${deleteModal.playlist.name}" deleted`);
            await loadPlaylists(false);
        } catch (err) {
            toast.error("Failed to delete playlist");
        } finally {
            setDeleteModal({ open: false, playlist: null, loading: false });
        }
    };

    // ── Rename/Edit Playlist ──────────────────────────────────────────────────
    const openEditModal = (playlist) => {
        setEditModal({ open: true, playlist, newName: playlist.name, loading: false });
    };

    const handleRename = async () => {
        const trimmedName = editModal.newName.trim();
        if (!trimmedName) return toast.error("Playlist name cannot be empty");
        if (trimmedName === editModal.playlist.name) {
            setEditModal({ open: false, playlist: null, newName: "", loading: false });
            return;
        }
        setEditModal((prev) => ({ ...prev, loading: true }));
        try {
            await updatePlaylist(user.id, editModal.playlist.id, { name: trimmedName });
            toast.success("Playlist renamed");
            await loadPlaylists(false);
        } catch (err) {
            toast.error(err.message || "Failed to rename playlist");
        } finally {
            setEditModal({ open: false, playlist: null, newName: "", loading: false });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AppLayout>
            <div className="w-full animate-in fade-in duration-300 pb-24">

                {loading ? (
                    <Loader message="Loading your playlists..." />
                ) : (
                    <>
                        {/* Page Title Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center shadow-md shadow-[var(--color-primary)]/10 backdrop-blur-md shrink-0">
                                    <ListMusic className="text-[var(--color-primary)]" size={22} />
                                </div>
                                <div>
                                    <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
                                        My <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-purple-400">Playlists</span>
                                    </h1>
                                    <p className="text-xs font-semibold text-[var(--color-on-surface-variant)] tracking-wide mt-0.5">
                                        Organise, manage, and listen to your custom playlists
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 1. Hero Header — stats + create CTA + dynamic spotlight dock */}
                        <PlaylistHeroHeader
                            playlists={playlists}
                            playlistCount={playlists.length}
                            trackCount={totalTrackCount}
                            onCreatePlaylist={openCreateModal}
                            onPlayPlaylist={handlePlayPlaylist}
                        />

                        {/* Only show filter bar and content when there are playlists */}
                        {playlists.length === 0 ? (
                            /* ── Empty State ── */
                            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-5 mt-4">
                                <div className="w-24 h-24 rounded-3xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                                    <Disc3 size={48} className="text-[var(--color-primary)]/50 animate-spin" style={{ animationDuration: "10s" }} />
                                </div>
                                <div className="text-center max-w-sm">
                                    <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
                                        No playlists yet
                                    </h2>
                                    <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                                        Create your first playlist to organise your music. Click{" "}
                                        <span className="text-[var(--color-primary)] font-semibold">Create Playlist</span>{" "}
                                        above to get started!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* 2. Filter Bar — search, sort, view toggle */}
                                <PlaylistFilterBar
                                    searchQuery={searchQuery}
                                    onSearchChange={setSearchQuery}
                                    sortBy={sortBy}
                                    onSortChange={setSortBy}
                                    sortDirection={sortDirection}
                                    onDirectionToggle={() =>
                                        setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
                                    }
                                    viewMode={viewMode}
                                    onViewChange={setViewMode}
                                    totalCount={playlists.length}
                                    filteredCount={processedPlaylists.length}
                                />

                                {/* 3a. No search results */}
                                {processedPlaylists.length === 0 ? (
                                    <div className="text-center py-16">
                                        <ListMusic size={40} className="text-[var(--color-on-surface-variant)]/30 mx-auto mb-3" />
                                        <p className="text-[var(--color-on-surface)] font-medium mb-2">
                                            No playlists match "{searchQuery}"
                                        </p>
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="text-[var(--color-primary)] hover:underline text-sm font-bold cursor-pointer"
                                        >
                                            Clear search
                                        </button>
                                    </div>
                                ) : viewMode === "grid" ? (
                                    /* 3b. Grid View — Balanced 2/3/4/5 responsive columns */
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                                        {processedPlaylists.map((pl) => (
                                            <PlaylistCard
                                                key={pl.id}
                                                playlist={pl}
                                                onDelete={confirmDelete}
                                                onEdit={openEditModal}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    /* 3c. List View — spacious and highly visible table rows */
                                    <div className="flex flex-col gap-3">
                                        {processedPlaylists.map((pl, index) => {
                                            const thumb = pl.previewThumbnail || pl.previewThumbnails?.[0] || null;
                                            
                                            // Format relative date for list view
                                            const formatDate = (dateStr) => {
                                                if (!dateStr) return "";
                                                const date = new Date(dateStr);
                                                const now = new Date();
                                                const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                                                if (diffDays === 0) return "Updated today";
                                                if (diffDays === 1) return "Updated yesterday";
                                                if (diffDays < 7) return `Updated ${diffDays}d ago`;
                                                return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                                            };

                                            return (
                                                <div
                                                    key={pl.id}
                                                    className="flex items-center gap-5 bg-[var(--color-surface-raised)] px-6 py-4 rounded-2xl border border-white/5 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-overlay)] hover:shadow-[0_12px_24px_rgba(167,139,250,0.1)] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
                                                    onClick={() => window.location.href = `/playlists/${pl.id}`}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`Open ${pl.name}`}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") window.location.href = `/playlists/${pl.id}`;
                                                    }}
                                                >
                                                    {/* Index number */}
                                                    <span className="w-8 text-center text-sm font-bold text-[var(--color-on-surface-variant)]/60 group-hover:text-[var(--color-primary)] transition-colors shrink-0">
                                                        {index + 1}
                                                    </span>

                                                    {/* Cover thumbnail - significantly enlarged */}
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-surface-overlay)] shrink-0 shadow-md group-hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)] transition-shadow">
                                                        {thumb && !isImageDead(pl.id) ? (
                                                            <img
                                                                src={thumb}
                                                                alt={pl.name}
                                                                onLoad={(e) => handleImgLoad(e, pl.id)}
                                                                onError={(e) => handleImgError(e, pl.id)}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/20 to-violet-900/10 flex items-center justify-center border border-[var(--color-primary)]/10">
                                                                <ListMusic size={24} className="text-[var(--color-primary)]/50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Name & metadata */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <p className="text-base sm:text-lg font-bold text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors duration-200">
                                                            {pl.name}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <div className="flex items-center gap-1.5 bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-md text-[var(--color-primary)] font-bold text-[11px] transition-colors">
                                                                <ListMusic size={11} />
                                                                <span>{pl.trackCount || 0} {pl.trackCount === 1 ? "track" : "tracks"}</span>
                                                            </div>
                                                            <span className="text-xs font-medium text-[var(--color-on-surface-variant)]/70 hidden sm:block">
                                                                {formatDate(pl.updatedAt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Quick actions - larger buttons */}
                                                    <div
                                                        className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 mr-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(pl); }}
                                                            className="p-2.5 rounded-full bg-white/5 text-[var(--color-on-surface-variant)] hover:text-white hover:bg-[var(--color-primary)] hover:shadow-lg transition-all cursor-pointer"
                                                            title="Rename"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); confirmDelete(pl); }}
                                                            className="p-2.5 rounded-full bg-white/5 text-[var(--color-on-surface-variant)] hover:text-white hover:bg-red-500 hover:shadow-lg transition-all cursor-pointer"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ── Create Playlist Modal ── */}
                <PlaylistCreateModal
                    isOpen={isCreateModalOpen}
                    onClose={closeCreateModal}
                    onCreate={handleCreatePlaylist}
                />

                {/* ── Delete Confirmation Modal ── */}
                {deleteModal.open && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget && !deleteModal.loading) setDeleteModal({ open: false, playlist: null, loading: false }); }}
                    >
                        <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                                    <Trash2 size={18} className="text-red-500" />
                                </div>
                                <h4 className="text-base font-bold text-[var(--color-on-surface)]">Delete Playlist?</h4>
                            </div>
                            <p className="text-sm text-[var(--color-on-surface-variant)] mb-6 leading-relaxed">
                                Are you sure you want to delete{" "}
                                <span className="font-bold text-[var(--color-on-surface)]">
                                    "{deleteModal.playlist?.name}"
                                </span>
                                ? This cannot be undone.
                            </p>
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setDeleteModal({ open: false, playlist: null, loading: false })}
                                    disabled={deleteModal.loading}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-state-hover)] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteModal.loading}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-60 shadow-lg"
                                >
                                    {deleteModal.loading ? (
                                        <><Loader2 size={14} className="animate-spin" /><span>Deleting...</span></>
                                    ) : (
                                        <><Trash2 size={14} /><span>Delete</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Rename Playlist Modal ── */}
                {editModal.open && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget && !editModal.loading) setEditModal({ open: false, playlist: null, newName: "", loading: false }); }}
                    >
                        <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <h4 className="text-base font-bold text-[var(--color-on-surface)]">Rename Playlist</h4>
                                <button
                                    onClick={() => setEditModal({ open: false, playlist: null, newName: "", loading: false })}
                                    className="p-1.5 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Input */}
                            <input
                                type="text"
                                value={editModal.newName}
                                onChange={(e) => setEditModal((prev) => ({ ...prev, newName: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
                                maxLength={100}
                                autoFocus
                                placeholder="New playlist name"
                                className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all mb-5 placeholder:text-[var(--color-on-surface-variant)]/50"
                            />

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setEditModal({ open: false, playlist: null, newName: "", loading: false })}
                                    disabled={editModal.loading}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-state-hover)] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRename}
                                    disabled={editModal.loading || !editModal.newName.trim()}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-lg"
                                >
                                    {editModal.loading ? (
                                        <><Loader2 size={14} className="animate-spin" /><span>Saving...</span></>
                                    ) : (
                                        <span>Save</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default PlaylistsPage;
