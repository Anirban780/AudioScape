import React, { useEffect, useState } from "react";
import AppLayout from "../components/Layout/AppLayout";
import { useTheme } from "../ThemeProvider";
import { useAuth } from "../context/AuthContext";
import usePlaylistStore from "../store/usePlaylistStore";
import usePlayerStore from "../store/usePlayerStore";
import toast from "react-hot-toast";
import MusicCard from "../components/Cards/MusicCard";
import { Trash2 } from "lucide-react";
import { getPlaylists, deletePlaylist } from "../utils/playlists";

const PlaylistsPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { playlists, setPlaylists } = usePlaylistStore();
  const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null });

  useEffect(() => {
    if (!user) return;
    getPlaylists(user.uid)
      .then(setPlaylists)
      .catch(() => toast.error("Failed to load playlists"));
  }, [user, setPlaylists]);

  const confirmDeletePlaylist = (playlist) => {
    setDeleteModal({ open: true, playlist });
  };

  const handleDeletePlaylist = async () => {
    if (!user || !deleteModal.playlist) return toast.error("User not logged in");

    try {
      await deletePlaylist(user.uid, deleteModal.playlist.id);
      const updated = await getPlaylists(user.uid);
      setPlaylists(updated);
      toast.success("Playlist deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete playlist");
    } finally {
      setDeleteModal({ open: false, playlist: null });
    }
  };

  return (
    <AppLayout>
      <div className="lg:mx-8 mt-8 pb-24">
        <h2 className="text-3xl font-bold mb-6">🗂️ Your Playlists 🎶</h2>

        {!playlists.length && <p>You have no playlists.</p>}

        <div className="space-y-8">
          {playlists.map((playlist, index) => (
            <div
              key={`${playlist.id}-${index}`}
              className={`p-4 rounded-xl border-2 backdrop-blur-md bg-opacity-60 shadow transition-all duration-300 
                ${theme === "dark" ? "border-gray-700 bg-gray-800/60 shadow-blue-500" 
                  : "border-gray-200 bg-white/60 shadow-gray-500"}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold capitalize tracking-wide">
                  {playlist.name}
                </h3>
                <button
                  onClick={() => confirmDeletePlaylist(playlist)}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white shadow-lg transition-all duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                  title="Delete Playlist"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {!playlist.songs?.length && (
                <p className="italic text-gray-400">No songs in this playlist.</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {playlist.songs?.map((song, index) => (
                  <MusicCard
                    key={`${song.id}-${index}`}
                    id={song.id}
                    name={song.name}
                    artist={song.artist}
                    image={song.thumbnail}
                    onClick={() => {
                      usePlayerStore.getState().setTrack(song);
                      toast.success("Track selected successfully");
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
            <p className="mb-4">Are you sure you want to delete the playlist "{deleteModal.playlist?.name}"?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModal({ open: false, playlist: null })}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default PlaylistsPage;
