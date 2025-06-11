import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import usePlaylistStore from "../store/usePlaylistStore";
import usePlayerStore from "../store/usePlayerStore";
import toast from "react-hot-toast";
import MusicCard from "../components/Cards/MusicCard";
import { useTheme } from "../ThemeProvider"; // Make sure this is the correct path
import {
  getPlaylists,
  deletePlaylist,
  removeSongFromPlaylist,
} from "../utils/playlists";

const PlaylistsPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme(); // ⬅️ Use theme context
  const { playlists, setPlaylists, removePlaylist, updatePlaylist } = usePlaylistStore();

  // Fetch playlists on mount
  useEffect(() => {
    if (!user) return;
    getPlaylists(user.uid)
      .then(setPlaylists)
      .catch(() => toast.error("Failed to load playlists"));
  }, [user, setPlaylists]);

  const handleDeletePlaylist = async (playlistId) => {
    if (!user) return toast.error("User not logged in");
    try {
      await deletePlaylist(user.uid, playlistId);
      removePlaylist(playlistId);

      const updatedPlaylists = await getPlaylists(user.uid);
      setPlaylists(updatedPlaylists);
      
      toast.success("Playlist deleted");
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  const handleRemoveSong = async (playlistId, songId) => {
    if (!user) return toast.error("User not logged in");
    try {
      await removeSongFromPlaylist(user.uid, playlistId, songId);
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return;
      const updated = {
        ...playlist,
        songs: (playlist.songs || []).filter((s) => s.id !== songId),
      };
      updatePlaylist(updated);
      toast.success("Song removed");
    } catch {
      toast.error("Failed to remove song");
    }
  };

  return (
    <div
      className={`mx-auto max-w-7xl px-4 py-8 transition-colors duration-300 ${theme === "dark" ? "bg-black text-white" : "bg-white text-black"
        }`}
    >
      <h2 className="text-2xl font-bold mb-6">Your Playlists</h2>

      {!playlists.length && <p>You have no playlists.</p>}

      <div className="space-y-8">
        {playlists.map((playlist, index) => (
          <div
            key={`${playlist.id}-${index}`}
            className={`p-4 rounded-md border transition-all duration-200 ${theme === "dark"
              ? "border-gray-700 bg-gray-900"
              : "border-gray-200 bg-gray-100"
              }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{playlist.name}</h3>
              <button
                onClick={() => handleDeletePlaylist(playlist.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
              >
                Delete Playlist
              </button>
            </div>

            {!playlist.songs?.length && <p>No songs in this playlist.</p>}

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
  );
};

export default PlaylistsPage;
