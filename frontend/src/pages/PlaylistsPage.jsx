import React, { useEffect, useState } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import usePlaylistStore from "@/store/usePlaylistStore";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";
import MusicCard from "@/components/Cards/MusicCard";
import { Trash2 } from "lucide-react";
import { getPlaylists, deletePlaylist } from "@/utils/playlists";

/**
 * ============================================================================
 * PLAYLISTS MANAGEMENT PAGE (PlaylistsPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays all custom playlists created by the user and allows playing tracks
 * or deleting playlists.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. AppLayout Unification: Uses AppLayout for unified sidebar, sticky search header,
 *    and automatic player dock padding.
 * 2. Surface Token Hierarchy: Uses Stitch surface tokens (`bg-[var(--color-surface-raised)]`,
 *    `border-[var(--color-border-default)]`) for playlist cards and confirm deletion dialogs.
 * 
 * HOW IT WORKS:
 * - Reads `user` object from `useAuth()` and fetches playlists on mount via `getPlaylists(uid)`.
 * - Stores playlists in `usePlaylistStore`.
 * - Confirms deletion using a modal dialog before invoking `deletePlaylist(uid, playlistId)`.
 */
const PlaylistsPage = () => {
  const { user } = useAuth();
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
      <div className="w-full">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <span>🗂️</span> Your Playlists 🎶
        </h2>

        {!playlists.length && (
          <div className="text-center text-lg opacity-70 mt-12 p-8 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] max-w-md mx-auto">
            <p className="font-medium mb-1">No playlists created yet</p>
            <p className="text-sm opacity-80">Save tracks to a new playlist from any song card!</p>
          </div>
        )}

        <div className="space-y-8">
          {playlists.map((playlist, index) => (
            <div
              key={`${playlist.id}-${index}`}
              className="p-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold capitalize tracking-wide">
                  {playlist.name}
                </h3>
                <button
                  onClick={() => confirmDeletePlaylist(playlist)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  title="Delete Playlist"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {!playlist.songs?.length && (
                <p className="italic opacity-70">No songs in this playlist.</p>
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

      {/* Delete Confirmation Modal Overlay */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] p-6 rounded-2xl shadow-2xl max-w-sm w-full">
            <h2 className="text-lg font-bold mb-3">Confirm Deletion</h2>
            <p className="mb-6 opacity-80 text-sm">
              Are you sure you want to delete the playlist <span className="font-semibold">"{deleteModal.playlist?.name}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, playlist: null })}
                className="px-4 py-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-state-hover)] text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-md"
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
