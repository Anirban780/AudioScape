import React, { useEffect, useState } from "react";
import {
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylists,
    createPlaylist,
} from "@/utils/playlists";
import { X } from "lucide-react";
import usePlaylistStore from "@/store/usePlaylistStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * PLAYLIST MODAL DIALOG (PlaylistModal.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Global modal dialog for adding selected tracks to existing playlists or
 * creating new playlists in Firebase Firestore.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Surface Tokens & Zero-Green Rule: Replaced hardcoded `bg-neutral-900` and green
 *    `bg-green-600` buttons with `bg-[var(--color-surface-overlay)]` and `bg-[var(--color-primary)]`.
 * 2. Store-Driven Visibility: Rendered at root level in App.jsx and toggles visibility via
 *    `isModalOpen` state in `usePlaylistStore`.
 * 3. Single / Batch Support: Handles both individual tracks (`selectedSong`) and array batches
 *    (`selectedTracks`).
 * 
 * HOW IT WORKS:
 * - `handleToggle`: Toggles track inclusion in an existing playlist (adds if missing, removes if present).
 * - `handleCreate`: Creates a new playlist with given title and automatically attaches selected track(s).
 */
const PlaylistModal = ({ userId }) => {
    const { selectedSong, selectedTracks, isModalOpen, closeModal } = usePlaylistStore();

    const [playlists, setPlaylists] = useState([]);
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState(false);

    const tracksToHandle = selectedTracks?.length > 0 ? selectedTracks : selectedSong ? [selectedSong] : [];

    useEffect(() => {
        if (!isModalOpen) return;
        setLoading(true);
        getPlaylists(userId)
            .then(setPlaylists)
            .finally(() => setLoading(false));
    }, [isModalOpen, userId]);

    const isInPlaylist = (pl, track) => pl.songs?.some((s) => s.id === track.id);

    const handleToggle = async (pl) => {
        try {
            let added = 0;
            let removed = 0;

            for (const track of tracksToHandle) {
                if (isInPlaylist(pl, track)) {
                    await removeSongFromPlaylist(userId, pl.id, track.id);
                    removed++;
                } else {
                    await addSongToPlaylist(userId, pl.id, track);
                    added++;
                }
            }

            const updated = await getPlaylists(userId);
            setPlaylists(updated);

            if (added) toast.success(`Added ${added} track(s) to "${pl.name}"`);
            if (removed) toast.success(`Removed ${removed} track(s) from "${pl.name}"`);
        } catch (err) {
            toast.error("Failed to update playlist");
        }
    };

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) {
            toast.error("Playlist name cannot be empty");
            return;
        }

        try {
            const docRef = await createPlaylist(userId, name);
            for (const track of tracksToHandle) {
                await addSongToPlaylist(userId, docRef.id, track);
            }
            const refreshed = await getPlaylists(userId);
            setPlaylists(refreshed);
            setNewName("");
            toast.success("Playlist created and tracks added!");
        } catch (err) {
            toast.error(err.message || "Failed to create playlist");
        }
    };

    if (!isModalOpen || tracksToHandle.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 relative bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] border border-[var(--color-border-strong)] transition-all">
                {/* Close Button */}
                <button
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--color-state-hover)] transition-colors"
                    onClick={closeModal}
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>

                <h2 className="text-xl font-bold mb-5 text-center tracking-tight">
                    Save to Playlist
                </h2>

                {/* Create New Playlist Input */}
                <div className="mb-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-70">
                        Create New Playlist
                    </h3>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border border-[var(--color-border-default)] focus:border-[var(--color-primary)] transition-all"
                            placeholder="Playlist name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-sm font-semibold hover:opacity-90 transition-all shadow-md"
                            onClick={handleCreate}
                        >
                            Create
                        </button>
                    </div>
                </div>

                {/* User's Existing Playlists Checklist */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-70">
                        Your Playlists
                    </h3>
                    {loading ? (
                        <p className="text-center text-sm opacity-70 py-4">Loading playlists...</p>
                    ) : playlists.length === 0 ? (
                        <p className="text-center text-sm opacity-70 py-4">No playlists found. Create one above!</p>
                    ) : (
                        <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                            {playlists.map((pl) => (
                                <label
                                    key={pl.id}
                                    className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer hover:bg-[var(--color-state-hover)] transition-colors border border-transparent hover:border-[var(--color-border-default)]"
                                >
                                    <span className="text-sm font-medium">{pl.name}</span>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-[var(--color-primary)] rounded cursor-pointer"
                                        checked={tracksToHandle.every((track) => isInPlaylist(pl, track))}
                                        onChange={() => handleToggle(pl)}
                                    />
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistModal;
