import React, { useEffect, useState } from "react";
import {
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylists,
    createPlaylist,
} from "../../utils/playlists";
import { X } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import usePlaylistStore from "../../store/usePlaylistStore";
import toast from "react-hot-toast";

const PlaylistModal = ({ userId }) => {
    const { theme } = useTheme();
    const { selectedSong, isModalOpen, closeModal } = usePlaylistStore();

    const [playlists, setPlaylists] = useState([]);
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isModalOpen) return;
        setLoading(true);
        getPlaylists(userId)
            .then(setPlaylists)
            .finally(() => setLoading(false));
    }, [isModalOpen, userId]);

    const inPlaylist = (pl) =>
        pl.songs?.some((s) => s.id === selectedSong.id) ?? false;

    const handleToggle = async (pl) => {
        try {
            if (inPlaylist(pl)) {
                await removeSongFromPlaylist(userId, pl.id, selectedSong.id);
                toast.success(`Removed from "${pl.name}"`);
            } else {
                await addSongToPlaylist(userId, pl.id, selectedSong);
                toast.success(`Added to "${pl.name}"`);
            }
            const updated = await getPlaylists(userId);
            setPlaylists(updated);
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
            await addSongToPlaylist(userId, docRef.id, selectedSong);
            const refreshed = await getPlaylists(userId);
            setPlaylists(refreshed);
            setNewName("");
            toast.success("Playlist created successfully!");
        } catch (err) {
            toast.error(err.message || "Failed to create playlist");
        }
    };


    if (!isModalOpen || !selectedSong) return null;

    const baseBg =
        theme === "dark" ? "bg-neutral-900 text-white" : "bg-white text-black";
    const border = theme === "dark" ? "border-neutral-700" : "border-gray-300";
    const inputBg =
        theme === "dark" ? "bg-neutral-800 text-white" : "bg-gray-100 text-black";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
                className={`w-[320px] rounded-xl shadow-lg p-5 relative ${baseBg} ${border}`}
            >
                {/* Close button */}
                <button
                    className="absolute top-2 right-3 p-1 rounded-full hover:bg-red-500"
                    onClick={closeModal}
                >
                    <X size={18} />
                </button>

                {/* Modal Header */}
                <h2 className="text-lg font-semibold mb-4 text-center">
                    Save to Playlist
                </h2>

                {/* Create Playlist Section */}
                <div className="mb-2">
                    <h3 className="text-sm font-medium mb-2 opacity-80">Create a New Playlist</h3>
                    <div className="flex gap-2">
                        <input
                            className={`flex-1 px-3 py-2 rounded-md text-sm outline-none ${inputBg} ${border}`}
                            placeholder="New playlist name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                            onClick={handleCreate}
                        >
                            Create
                        </button>
                    </div>
                </div>

                {/* Existing Playlists Section */}
                <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2 opacity-80">Your Playlists</h3>
                    {loading ? (
                        <p className="text-center text-sm opacity-70">Loading...</p>
                    ) : playlists.length === 0 ? (
                        <p className="text-center text-sm opacity-70">No playlists yet.</p>
                    ) : (
                        <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                            {playlists.map((pl) => {
                                const checked = inPlaylist(pl);
                                return (
                                    <label
                                        key={pl.id}
                                        className={`flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors ${theme === "dark"
                                            ? "hover:bg-neutral-800"
                                            : "hover:bg-gray-100"
                                            }`}
                                    >
                                        <span className="text-sm">{pl.name}</span>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleToggle(pl)}
                                            className="form-checkbox h-4 w-4 accent-green-600"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistModal;
