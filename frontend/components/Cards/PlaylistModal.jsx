import React, { useEffect, useRef, useState } from 'react';
import usePlaylistStore from '../../store/usePlaylistStore';
import { addSongToPlaylist, getPlaylists, createPlaylist } from '../../utils/playlists';
import { useTheme } from '../../ThemeProvider';
import { ArrowLeft, X } from 'lucide-react';

const PlaylistModal = ({ userId }) => {
    const { theme } = useTheme();
    const { selectedSong, isModalOpen, closeModal } = usePlaylistStore();
    const [step, setStep] = useState("select"); // 'select' | 'create' | 'add'
    const [playlists, setPlaylists] = useState([]);
    const [newName, setNewName] = useState("");

    const modalRef = useRef();

    useEffect(() => {
        if (isModalOpen && step === "add") {
            getPlaylists(userId).then(setPlaylists);
        }
    }, [isModalOpen, step]);

    const handleCreateNew = async () => {
        if (!newName.trim()) return;
        const docRef = await createPlaylist(userId, newName.trim());
        await addSongToPlaylist(userId, docRef.id, selectedSong);
        closeModal();
        resetState();
    };

    const handleAddToExisting = async (playlistId) => {
        await addSongToPlaylist(userId, playlistId, selectedSong);
        closeModal();
        resetState();
    };

    const resetState = () => {
        setStep("select");
        setNewName("");
    };

    if (!isModalOpen || !selectedSong) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div
                ref={modalRef}
                className={`bg-white dark:bg-neutral-900 rounded-xl shadow-md p-4 w-[300px] space-y-4 relative`}
            >
                {/* Close */}
                <button
                    className="absolute top-2 right-3 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-500 dark:hover:text-white transition-colors"
                    onClick={() => {
                        closeModal();
                        resetState();
                    }}
                >
                    <X size={18} />
                </button>

                {step === "select" && (
                    <div className="space-y-3">
                        <h3 className="text-md font-medium text-neutral-800 dark:text-white text-center">Add to Playlist</h3>
                        <button
                            className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                            onClick={() => setStep("create")}
                        >
                            ➕ Create New Playlist
                        </button>
                        <button
                            className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                            onClick={() => setStep("add")}
                        >
                            📁 Add to Existing Playlist
                        </button>
                    </div>
                )}

                {step === "create" && (
                    <div className="space-y-3">
                        <h3 className="text-md font-medium text-neutral-800 dark:text-white text-center">Create New Playlist</h3>
                        <input
                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 dark:bg-neutral-800 dark:text-white"
                            placeholder="New Playlist Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white rounded-md hover:bg-green-700 dark:hover:bg-green-700 transition"
                            onClick={handleCreateNew}
                        >
                            Create & Add
                        </button>
                        <button
                            className="text-sm text-center w-full text-neutral-600 dark:text-neutral-400 hover:underline"
                            onClick={() => setStep("select")}
                        >
                            ← Back
                        </button>
                    </div>
                )}

                {step === "add" && (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        <h3 className="text-md font-medium text-neutral-800 dark:text-white text-center">Select Playlist</h3>
                        {playlists.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center">No playlists found.</p>
                        ) : (
                            playlists.map((pl) => (
                                <div
                                    key={pl.id}
                                    className="flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-md"
                                >
                                    <span className="text-sm dark:text-white">{pl.name}</span>
                                    <button
                                        className="text-sm text-primary hover:underline"
                                        onClick={() => handleAddToExisting(pl.id)}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))
                        )}
                        <button
                            className="flex items-center justify-center gap-2 text-sm w-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-3 py-2 rounded-md transition-colors"
                            onClick={() => setStep("select")}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistModal;
