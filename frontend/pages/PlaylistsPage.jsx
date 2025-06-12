import React, { useEffect, useState } from "react";
import Sidebar from "../components/Home/Sidebar";
import SearchBar from "../components/Home/SearchBar";
import UserMenu from "../components/Auth/UserMenu";
import { useTheme } from "../ThemeProvider";
import { useAuth } from "../context/AuthContext";
import usePlaylistStore from "../store/usePlaylistStore";
import usePlayerStore from "../store/usePlayerStore";
import toast from "react-hot-toast";
import MusicCard from "../components/Cards/MusicCard";
import { Sun, Moon, Menu, Trash2 } from "lucide-react";
import ResponsiveLayout from "../ResponsiveLayout";
import {
  getPlaylists,
  deletePlaylist,
} from "../utils/playlists";

const PlaylistsPage = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { playlists, setPlaylists } = usePlaylistStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      toast.success("Deleted from Firestore");
      const updated = await getPlaylists(user.uid);
      setPlaylists(updated);
      toast.success("Playlist deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete playlist");
    }
  };

  return (
    <div className={`h-screen flex transition-all duration-300 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-gray-100 text-black"}`}>
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 h-full bg-white dark:bg-gray-900 shadow-md relative z-50">
            <Sidebar isOpen={true} onToggle={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <ResponsiveLayout>
          <div className="flex justify-between items-center w-full">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded bg-gray-200 dark:bg-gray-700"
            >
              <Menu size={20} />
            </button>

            <div className="w-full max-w-lg mx-auto">
              <SearchBar onSelectTrack={usePlayerStore.getState().setTrack} />
            </div>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 mx-4 rounded-full bg-gray-300 dark:bg-gray-700 transition-all"
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-gray-900" />
              )}
            </button>

            <UserMenu />
          </div>

          <div className="lg:mx-8 mt-8 pb-24">
            <h2 className="text-3xl font-bold mb-6">🗂️ Your Playlists 🎶</h2>

            {!playlists.length && <p>You have no playlists.</p>}

            <div className="space-y-8">
              {playlists.map((playlist, index) => (
                <div
                  key={`${playlist.id}-${index}`}
                  className={`p-4 rounded-xl border-2 backdrop-blur-md bg-opacity-60 shadow transition-all duration-300 ${theme === "dark"
                    ? "border-gray-700 bg-gray-800/60 shadow-blue-500"
                    : "border-gray-200 bg-white/60 shadow-gray-500"
                    }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold capitalize tracking-wide">
                      {playlist.name}
                    </h3>
                    <button
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white shadow-lg transition-all duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                      title="Delete Playlist"
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">Delete</span>
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
        </ResponsiveLayout>
      </div>
    </div>
  );
};

export default PlaylistsPage;
