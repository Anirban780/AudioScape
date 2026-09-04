import React, { useEffect, useState } from "react";
import {
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylists,
    createPlaylist,
    getTrackMembership,
} from "@/utils/playlists";
import { X, Plus, Check, ListMusic, Music, Loader2, AlertCircle } from "lucide-react";
import usePlaylistStore from "@/store/usePlaylistStore";
import useAuthStore from "@/store/useAuthStore";
import toast from "react-hot-toast";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * Robust helper to extract string ID from any track object shape.
 */
const getTrackId = (track) => {
    if (!track) return "";
    return String(track.id || track.videoId || track.songId || "").toLowerCase();
};

/**
 * Checks if a track is present in a playlist object.
 */
const isInPlaylist = (pl, track) => {
    if (!pl?.songs || !track) return false;
    const targetId = getTrackId(track);
    if (!targetId) return false;
    return pl.songs.some((s) => getTrackId(s) === targetId);
};

/**
 * ============================================================================
 * STAGED PLAYLIST SELECTION MODAL (PlaylistModal.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Staged track-saving modal with high-visibility pre-scan notice banner and Done button.
 * Features:
 * - Robust track ID pre-scanning across all playlist song lists.
 * - High-visibility Alert Banner right above the Done button when a song already exists in a selected playlist.
 * - Brand primary "Done" confirmation button that displays dynamic status messages.
 * - Staged selection workflow before sending batch network updates on "Done".
 */
const PlaylistModal = ({ userId }) => {
    const authUser = useAuthStore((s) => s.user);
    const effectiveUserId = userId || authUser?.id || authUser?.uid || "";

    const { selectedSong, selectedTracks, isModalOpen, closeModal } = usePlaylistStore();
    const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

    const [playlists, setPlaylists] = useState([]);
    const [initialSelectedMap, setInitialSelectedMap] = useState({}); // { [playlistId]: boolean }
    const [selectedMap, setSelectedMap] = useState({}); // { [playlistId]: boolean }
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);

    const targetTrack = selectedSong || (selectedTracks?.length > 0 ? selectedTracks[0] : null);

    useEffect(() => {
        if (!isModalOpen || !targetTrack) return;
        const videoId = targetTrack.id || targetTrack.videoId;

        setLoading(true);
        Promise.all([
            getPlaylists(effectiveUserId),
            videoId ? getTrackMembership(effectiveUserId, videoId) : Promise.resolve([]),
        ])
            .then(([data, memberPlaylistIds]) => {
                const memberSet = new Set(memberPlaylistIds || []);
                const allPlaylists = Array.isArray(data) ? data : (data?.playlists || []);
                
                setPlaylists(allPlaylists);
                
                const initialMap = {};
                allPlaylists.forEach((pl) => {
                    initialMap[pl.id] = memberSet.has(pl.id);
                });

                setInitialSelectedMap(initialMap);
                setSelectedMap(initialMap);
            })
            .catch((err) => {
                console.error("Failed to load playlist memberships:", err);
            })
            .finally(() => setLoading(false));
    }, [isModalOpen, targetTrack, effectiveUserId]);

    /**
     * Toggles local selection state.
     */
    const handleToggleLocal = (playlistId) => {
        setSelectedMap((prev) => ({
            ...prev,
            [playlistId]: !prev[playlistId],
        }));
    };

    /**
     * Creates a new playlist and automatically marks it as selected.
     */
    const handleCreateLocal = async () => {
        const name = newName.trim();
        if (!name) {
            toast.error("Playlist name cannot be empty");
            return;
        }

        if (!effectiveUserId) {
            toast.error("User authentication required");
            return;
        }

        setCreating(true);
        try {
            const docRef = await createPlaylist(effectiveUserId, name);
            const newPlId = docRef.id;

            const refreshed = await getPlaylists(effectiveUserId);
            setPlaylists(refreshed);

            setSelectedMap((prev) => ({
                ...prev,
                [newPlId]: true,
            }));

            setNewName("");
            toast.success(`Created "${name}" & selected`);
        } catch (err) {
            toast.error(err.message || "Failed to create playlist");
        } finally {
            setCreating(false);
        }
    };

    /**
     * Finalizes all pending add/remove changes when the user clicks "Done".
     */
    const handleFinalConfirm = async () => {
        if (!targetTrack || !effectiveUserId) return;
        setSaving(true);

        const trackId = getTrackId(targetTrack);
        let addedCount = 0;
        let removedCount = 0;

        try {
            for (const pl of playlists) {
                const wasSelected = Boolean(initialSelectedMap[pl.id]);
                const isNowSelected = Boolean(selectedMap[pl.id]);

                if (!wasSelected && isNowSelected) {
                    await addSongToPlaylist(effectiveUserId, pl.id, targetTrack);
                    addedCount++;
                } else if (wasSelected && !isNowSelected) {
                    await removeSongFromPlaylist(effectiveUserId, pl.id, trackId);
                    removedCount++;
                }
            }

            if (addedCount > 0) toast.success(`Saved to ${addedCount} playlist(s)!`);
            if (removedCount > 0) toast.success(`Removed from ${removedCount} playlist(s)`);

            closeModal();
        } catch (err) {
            console.error("Playlist save error:", err);
            toast.error(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (!isModalOpen || !targetTrack) return null;

    // Track preview details
    const trackTitle = targetTrack.name || targetTrack.title || "Selected Track";
    const trackArtist = targetTrack.artist || targetTrack.channelTitle || "Artist";
    const trackThumb = targetTrack.thumbnail || targetTrack.thumbNail || "";

    // Check pending changes
    const hasPendingChanges = playlists.some(
        (pl) => Boolean(initialSelectedMap[pl.id]) !== Boolean(selectedMap[pl.id])
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget && !saving) closeModal();
            }}
        >
            <div className="w-full max-w-md rounded-[28px] shadow-2xl p-6 relative bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border border-[var(--color-border-strong)] transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* ── Header Bar ── */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                            <ListMusic size={16} />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-[var(--color-on-surface)]">
                            Add to Playlist
                        </h2>
                    </div>

                    <button
                        className="p-1.5 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] transition-colors cursor-pointer"
                        onClick={closeModal}
                        disabled={saving}
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Track Preview Card ── */}
                <div className="flex items-center gap-3 bg-[var(--color-surface-base)] p-3 rounded-2xl border border-[var(--color-border-default)] mb-4 shadow-inner">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/20 shrink-0 border border-white/10">
                        {trackThumb && !isImageDead("previewTrack") ? (
                            <img
                                src={trackThumb}
                                alt={trackTitle}
                                onLoad={(e) => handleImgLoad(e, "previewTrack", targetTrack.id || targetTrack.videoId)}
                                onError={(e) => handleImgError(e, "previewTrack", targetTrack.id || targetTrack.videoId)}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                                <Music size={20} className="text-[var(--color-primary)]" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[var(--color-on-surface)] truncate">
                            {trackTitle}
                        </h4>
                        <p className="text-xs text-[var(--color-on-surface-variant)] truncate">
                            {trackArtist}
                        </p>
                    </div>
                </div>

                {/* ── Playlists Checklist Container ── */}
                <div className="flex-1 min-h-0 flex flex-col mb-4">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                            Select Playlists
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]/70">
                            {playlists.length} available
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-sm text-[var(--color-on-surface-variant)]">
                            <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                            <span>Checking playlists...</span>
                        </div>
                    ) : playlists.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-[var(--color-surface-base)]/50 rounded-2xl border border-[var(--color-border-default)]">
                            <p className="text-xs text-[var(--color-on-surface-variant)]">
                                No playlists found. Create your first playlist below!
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 scrollbar-custom">
                            {playlists.map((pl) => {
                                const isSelected = Boolean(selectedMap[pl.id]);
                                const plThumb = pl.coverUrl || pl.previewThumbnails?.[0] || null;

                                return (
                                    <div
                                        key={pl.id}
                                        onClick={() => handleToggleLocal(pl.id)}
                                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all duration-200 ${
                                            isSelected
                                                ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 shadow-sm"
                                                : "bg-[var(--color-surface-base)] border-[var(--color-border-default)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface-raised)]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/20 shrink-0 border border-white/5">
                                                {plThumb && !isImageDead(pl.id) ? (
                                                    <img
                                                        src={plThumb}
                                                        alt={pl.name}
                                                        onLoad={(e) => handleImgLoad(e, pl.id)}
                                                        onError={(e) => handleImgError(e, pl.id)}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/30 to-purple-900/20 flex items-center justify-center">
                                                        <ListMusic size={16} className="text-[var(--color-primary)]" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <h5 className="text-sm font-bold text-[var(--color-on-surface)] truncate">
                                                    {pl.name}
                                                </h5>

                                                <p className="text-xs text-[var(--color-on-surface-variant)]">
                                                    {pl.trackCount || pl.songs?.length || 0} tracks
                                                </p>
                                            </div>
                                        </div>

                                        {/* Selection Indicator Pill */}
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                                isSelected
                                                    ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-md shadow-[var(--color-primary)]/30 scale-105"
                                                    : "bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)]"
                                            }`}
                                        >
                                            {isSelected ? <Check size={16} strokeWidth={3} /> : <Plus size={15} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Create New Playlist Input Bar ── */}
                <div className="pt-3 mb-4 border-t border-[var(--color-border-subtle)]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] block mb-2 px-1">
                        New Playlist
                    </span>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50"
                            placeholder="Playlist name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateLocal();
                            }}
                            maxLength={100}
                            disabled={saving}
                        />
                        <button
                            className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs font-bold hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            onClick={handleCreateLocal}
                            disabled={creating || saving || !newName.trim()}
                        >
                            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
                            <span>Create</span>
                        </button>
                    </div>
                </div>

                {/* ── Removed Amber Banner per user request ── */}

                {/* ── Conditional Brand Primary "Done" Confirmation Button ── */}
                {hasPendingChanges && (
                    <button
                        onClick={handleFinalConfirm}
                        disabled={saving || loading}
                        className="w-full py-3 rounded-2xl bg-[var(--color-primary)] hover:opacity-90 active:scale-[0.99] text-[var(--color-text-on-primary)] font-bold text-sm shadow-lg shadow-[var(--color-primary)]/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 animate-in fade-in slide-in-from-bottom-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Saving Changes...</span>
                            </>
                        ) : (
                            <>
                                <Check size={18} strokeWidth={3} />
                                <span>Done</span>
                            </>
                        )}
                    </button>
                )}

            </div>
        </div>
    );
};

export default PlaylistModal;
