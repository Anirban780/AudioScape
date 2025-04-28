import React, { useEffect, useState } from "react";
import placeholder from "../assets/placeholder.jpg";
import usePlayerStore from "../store/usePlayerStore";
import { useAuth } from "../context/AuthContext";

const ProfilePage = () => {
  const { user } = useAuth();

  const [likedSongs, setLikedSongs] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  const { setTrack, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    // Fetch liked songs from localStorage for now (Replace with Firestore logic later)
    const fetchLikedSongs = async () => {
      const dummyLiked = JSON.parse(localStorage.getItem("likedTracks")) || [];
      setLikedSongs(dummyLiked);
    };

    // Fetch recently played songs from localStorage for now (Replace with Firestore logic later)
    const fetchRecentlyPlayed = async () => {
      const dummyRecent = JSON.parse(localStorage.getItem("recentlyPlayed")) || [];
      setRecentlyPlayed(dummyRecent);
    };

    fetchLikedSongs();
    fetchRecentlyPlayed();
  }, []);

  const handlePlay = (track) => {
    setTrack(track);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen p-6 bg-white text-black">
      <div className="flex flex-col items-center mb-10">
        <img
          src={user?.photoURL || placeholder}
          alt="Profile"
          className="w-24 h-24 rounded-full mb-4"
        />
        <h2 className="text-2xl font-semibold">{user?.displayName || "User"}</h2>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </div>

      {/* Liked Songs */}
      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4">Liked Songs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {likedSongs.length > 0 ? (
            likedSongs.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="bg-gray-100 p-4 rounded-lg cursor-pointer hover:bg-gray-200"
                onClick={() => handlePlay(track)}
              >
                <img
                  src={track.thumbnail || placeholder}
                  alt={track.name}
                  className="w-full h-40 object-cover rounded mb-2"
                />
                <h4 className="font-medium truncate">{track.name}</h4>
                <p className="text-sm text-gray-600 truncate">{track.artist}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-600">You haven't liked any songs yet.</p>
          )}
        </div>
      </section>

      {/* Recently Played */}
      <section>
        <h3 className="text-xl font-semibold mb-4">Recently Played</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recentlyPlayed.length > 0 ? (
            recentlyPlayed.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="bg-gray-100 p-4 rounded-lg cursor-pointer hover:bg-gray-200"
                onClick={() => handlePlay(track)}
              >
                <img
                  src={track.thumbnail || placeholder}
                  alt={track.name}
                  className="w-full h-40 object-cover rounded mb-2"
                />
                <h4 className="font-medium truncate">{track.name}</h4>
                <p className="text-sm text-gray-600 truncate">{track.artist}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No recently played songs.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
