import React, { useEffect, useState } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";
import MusicCard from "@/components/Cards/MusicCard";
import Loader from "@/components/Home/Loader";
import { Trash2, FolderHeart } from "lucide-react";
import { getPlaylists, deletePlaylist } from "@/utils/playlists";
import MediaGrid from "@/components/Layout/MediaGrid";

/**
 * ============================================================================
 * PLAYLISTS MANAGEMENT PAGE (PlaylistsPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Displays user's created playlists and custom track collections.
 * Supports playlist selection, playing all songs in a playlist, and deletion.
 */

const PlaylistsPage = () => {
  const user = useAuthStore((s) => s.user);
  const { playlists, setPlaylists } = usePlaylistStore();
  const { setTrack, setQueue } = usePlayerStore();
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPlaylists(user.id)
      .then(setPlaylists)
      .catch(() => toast.error("Failed to load playlists"))
      .finally(() => setLoading(false));
  }, [user, setPlaylists]);

  const confirmDeletePlaylist = (playlist) => {
    setDeleteModal({ open: true, playlist });
  };

  const handleDeletePlaylist = async () => {
    if (!user || !deleteModal.playlist) return toast.error("User not logged in");

    try {
      await deletePlaylist(user.id, deleteModal.playlist.id);
      const updated = await getPlaylists(user.id);
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
      <div className="w-full animate-in fade-in duration-300">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] tracking-tight mb-6 flex items-center gap-2.5">
          <FolderHeart className="text-[var(--color-primary)]" size={28} />
          <span>Your Playlists</span>
        </h2>

        {loading ? (
          <Loader message="Loading your playlists..." />
        ) : !playlists || playlists.length === 0 ? (
          <div className="text-center text-sm text-[var(--color-on-surface-variant)] py-12 px-6 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] max-w-md mx-auto my-8">
            <p className="font-bold text-base text-[var(--color-on-surface)] mb-1">No playlists created yet</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Save tracks to a new playlist from any song card!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="p-6 rounded-3xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[var(--color-on-surface)]">{pl.name}</h3>
                  <button
                    onClick={() => confirmDeletePlaylist(pl)}
                    className="p-2 rounded-xl text-[var(--color-on-surface-variant)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete Playlist"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <MediaGrid>
                  {pl.songs?.map((song, i) => (
                    <MusicCard
                      key={`${song.id}-${i}`}
                      id={song.id}
                      name={song.name}
                      artist={song.artist}
                      image={song.thumbnail}
                      onClick={() => {
                        usePlayerStore.getState().setTrack(song);
                        usePlayerStore.getState().setIsPlaying(true);
                      }}
                    />
                  ))}
                </MediaGrid>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] p-6 rounded-3xl max-w-sm w-full shadow-2xl">
              <h4 className="text-lg font-bold text-[var(--color-on-surface)] mb-2">Delete Playlist?</h4>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-6">
                Are you sure you want to delete <span className="font-bold">{deleteModal.playlist?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, playlist: null })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-state-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePlaylist}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Delete
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
