import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import usePlayerStore from "@/store/usePlayerStore";
import { getPlaylistById, updatePlaylist, reorderPlaylistTracks, removeSongFromPlaylist } from "@/utils/playlists";
import toast from "react-hot-toast";
import { ChevronLeft, Loader2, X, Disc3 } from "lucide-react";

// Drag and Drop
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

// Components
import PlaylistDetailHero from "@/components/Playlist/PlaylistDetailHero";
import PlaylistDetailFilterBar from "@/components/Playlist/PlaylistDetailFilterBar";
import PlaylistTrackRow from "@/components/Playlist/PlaylistTrackRow";
import Loader from "@/components/Home/Loader";

/**
 * ============================================================================
 * PLAYLIST DETAIL PAGE (PlaylistDetailPage.jsx) - Revamped Aesthetics
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the detail page for a specific playlist (/playlists/:id) with:
 * - Glassmorphic Hero & Filter bar
 * - Glassmorphic track container panel with header bar
 * - dnd-kit sortable track rows with playing state indicators
 * - Inline metadata edit modal
 */
const PlaylistDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const { activePlaylist, setActivePlaylist, openModal: openAddToPlaylistModal } = usePlaylistStore();
    const { track: currentPlayingTrack, setTrack, setQueue, playTrack } = usePlayerStore();

    const [loading, setLoading] = useState(true);
    const [localTracks, setLocalTracks] = useState([]);

    // Filters & Sorting
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("custom"); // custom = drag-and-drop manual order
    const [sortDirection, setSortDirection] = useState("desc");

    // Edit Modal State
    const [editModal, setEditModal] = useState({ open: false, name: "", description: "", loading: false });

    // Active track ID for active playing highlight
    const currentPlayingId = currentPlayingTrack?.id || currentPlayingTrack?.videoId || null;

    // ── Data Fetching ─────────────────────────────────────────────────────────
    const loadPlaylist = useCallback(async (showLoader = true) => {
        if (!user || !id) return;
        if (showLoader) setLoading(true);

        try {
            const data = await getPlaylistById(user.id, id);
            if (!data) {
                toast.error("Playlist not found");
                navigate("/playlists");
                return;
            }
            setActivePlaylist(data);
            setLocalTracks(data.songs || []);
        } catch (error) {
            toast.error("Failed to load playlist details");
            navigate("/playlists");
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [user, id, navigate, setActivePlaylist]);

    useEffect(() => {
        loadPlaylist(true);
        return () => setActivePlaylist(null);
    }, [loadPlaylist, setActivePlaylist]);

    // ── Edit Playlist ─────────────────────────────────────────────────────────
    const openEditModal = () => {
        if (!activePlaylist) return;
        setEditModal({
            open: true,
            name: activePlaylist.name,
            description: activePlaylist.description || "",
            loading: false
        });
    };

    const handleSaveEdit = async () => {
        const trimmedName = editModal.name.trim();
        if (!trimmedName) return toast.error("Name is required");

        setEditModal(prev => ({ ...prev, loading: true }));
        try {
            await updatePlaylist(user.id, activePlaylist.id, {
                name: trimmedName,
                description: editModal.description.trim()
            });
            toast.success("Playlist updated");
            await loadPlaylist(false);
            setEditModal({ open: false, name: "", description: "", loading: false });
        } catch (error) {
            toast.error(error.message || "Failed to update playlist");
            setEditModal(prev => ({ ...prev, loading: false }));
        }
    };

    // ── Track Management & Playback ───────────────────────────────────────────
    const handlePlayTrack = (track) => {
        if (!localTracks.length) return;
        setQueue(localTracks);
        setTrack(track);
        playTrack(track);
    };

    const handlePlayAll = () => {
        if (!localTracks.length) return;
        setQueue(localTracks);
        setTrack(localTracks[0]);
        playTrack(localTracks[0]);
    };

    const handleShuffle = () => {
        if (!localTracks.length) return;
        const shuffled = [...localTracks].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setTrack(shuffled[0]);
        playTrack(shuffled[0]);
    };

    const handleRemoveTrack = async (track) => {
        const previousTracks = [...localTracks];
        setLocalTracks(prev => prev.filter(t => t.id !== track.id));

        try {
            await removeSongFromPlaylist(user.id, activePlaylist.id, track.id);
            toast.success("Track removed");
            loadPlaylist(false);
        } catch (error) {
            setLocalTracks(previousTracks);
            toast.error("Failed to remove track");
        }
    };

    // ── Client-side Filtering & Sorting ──────────────────────────────────────
    const processedTracks = useMemo(() => {
        let result = [...localTracks];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.name?.toLowerCase().includes(q)) ||
                (t.artist?.toLowerCase().includes(q))
            );
        }

        if (sortBy !== "custom") {
            switch (sortBy) {
                case "added":
                    result.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
                    break;
                case "title":
                    result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                    break;
                case "artist":
                    result.sort((a, b) => (a.artist || "").localeCompare(b.artist || ""));
                    break;
                default:
                    break;
            }

            if (sortDirection === "asc") {
                result.reverse();
            }
        }

        return result;
    }, [localTracks, searchQuery, sortBy, sortDirection]);

    const isDraggable = sortBy === "custom" && !searchQuery.trim();

    // ── Drag & Drop Configuration (dnd-kit) ──────────────────────────────────
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const [activeId, setActiveId] = useState(null);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = localTracks.findIndex((t) => t.id === active.id);
            const newIndex = localTracks.findIndex((t) => t.id === over.id);

            const newTracks = arrayMove(localTracks, oldIndex, newIndex);
            setLocalTracks(newTracks);

            try {
                await reorderPlaylistTracks(user.id, activePlaylist.id, newTracks);
            } catch (error) {
                toast.error("Failed to save track order");
                setLocalTracks(localTracks);
            }
        }
    };

    const activeTrack = useMemo(() =>
        activeId ? localTracks.find(t => t.id === activeId) : null,
    [activeId, localTracks]);

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <AppLayout>
                <div className="w-full h-full flex items-center justify-center pt-20">
                    <Loader message="Loading Playlist..." />
                </div>
            </AppLayout>
        );
    }

    if (!activePlaylist) return null;

    return (
        <AppLayout>
            <div className="w-full animate-in fade-in duration-300 pb-24">

                {/* Back button */}
                <button
                    onClick={() => navigate("/playlists")}
                    className="flex items-center gap-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors text-sm font-medium mb-6 mt-2 cursor-pointer w-fit"
                >
                    <ChevronLeft size={16} />
                    Back to Playlists
                </button>

                {/* Hero Header */}
                <PlaylistDetailHero
                    playlist={activePlaylist}
                    onPlayAll={handlePlayAll}
                    onShuffle={handleShuffle}
                    onEdit={openEditModal}
                />

                {/* Filter Bar */}
                <PlaylistDetailFilterBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    sortDirection={sortDirection}
                    onDirectionToggle={() => setSortDirection(prev => prev === "desc" ? "asc" : "desc")}
                    totalCount={localTracks.length}
                    filteredCount={processedTracks.length}
                />

                {/* Glassmorphic Track List Panel */}
                {localTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-[var(--color-surface-raised)]/60 border border-[var(--color-border-default)] shadow-lg">
                        <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center mb-4">
                            <Disc3 size={36} className="text-[var(--color-primary)]/60 animate-spin" style={{ animationDuration: '12s' }} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">Playlist is empty</h3>
                        <p className="text-sm text-[var(--color-on-surface-variant)] max-w-sm">
                            Explore tracks or visit your Favorites to add songs to this playlist.
                        </p>
                    </div>
                ) : processedTracks.length === 0 ? (
                    <div className="text-center py-16 rounded-3xl bg-[var(--color-surface-raised)]/60 border border-[var(--color-border-default)]">
                        <p className="text-[var(--color-on-surface-variant)]">No tracks match "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="rounded-3xl bg-[var(--color-surface)]/40 backdrop-blur-md border border-[var(--color-border-default)] p-3 sm:p-5 shadow-xl">
                        
                        {/* Table Header Bar */}
                        <div className="flex items-center gap-4 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-on-surface-variant)]/60 border-b border-[var(--color-border-subtle)] mb-3">
                            <span className="w-8 text-center">#</span>
                            <span className="flex-1">Title & Artist</span>
                            <span className="w-16 text-right hidden sm:block">Actions</span>
                        </div>

                        {/* Sortable List Context */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={processedTracks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-2">
                                    {processedTracks.map((track, idx) => {
                                        const trackId = track.id || track.videoId;
                                        const isPlaying = Boolean(currentPlayingId && currentPlayingId === trackId);

                                        return (
                                            <PlaylistTrackRow
                                                key={track.id}
                                                track={track}
                                                index={idx}
                                                isDraggable={isDraggable}
                                                isPlayingTrack={isPlaying}
                                                onPlay={handlePlayTrack}
                                                onRemove={handleRemoveTrack}
                                                onAdd={(t) => openAddToPlaylistModal(t)}
                                            />
                                        );
                                    })}
                                </div>
                            </SortableContext>

                            {/* Drag Overlay */}
                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeTrack ? (
                                    <PlaylistTrackRow
                                        track={activeTrack}
                                        index={0}
                                        isDraggable={true}
                                        isPlayingTrack={false}
                                        onPlay={() => {}}
                                        onRemove={() => {}}
                                        onAdd={() => {}}
                                    />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                )}
            </div>

            {/* Rename/Edit Modal */}
            {editModal.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget && !editModal.loading) setEditModal({ open: false, name: "", description: "", loading: false }); }}
                >
                    <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h4 className="text-base font-bold text-[var(--color-on-surface)]">Edit Details</h4>
                            <button
                                onClick={() => setEditModal({ open: false, name: "", description: "", loading: false })}
                                className="p-1.5 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 mb-6">
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1 block">Name</label>
                                <input
                                    type="text"
                                    value={editModal.name}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, name: e.target.value }))}
                                    maxLength={100}
                                    className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1 block">Description</label>
                                <textarea
                                    value={editModal.description}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, description: e.target.value }))}
                                    maxLength={500}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setEditModal({ open: false, name: "", description: "", loading: false })}
                                disabled={editModal.loading}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-state-hover)] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={editModal.loading || !editModal.name.trim()}
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
        </AppLayout>
    );
};

export default PlaylistDetailPage;
