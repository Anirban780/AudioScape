import React, { useEffect, useState } from "react";
import { fetchNewReleases } from "../../utils/api/spotifyApi";
import { useAuth } from "../../context/AuthContext";
import useSpotifyToken from "../../utils/auth/fetchToken";
import { Skeleton } from "@/components/ui/skeleton";
import MusicCard from "../Cards/MusicCard"; // Import MusicCard component
import placeholder from "../../assets/placeholder.jpg";

const HeroSection = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useSpotifyToken();

  useEffect(() => {
    if (!token) return;

    const getNewReleases = async () => {
      setLoading(true);
      const newReleases = await fetchNewReleases(token);
      setTracks(newReleases);
      setLoading(false);
    };

    getNewReleases();
  }, [token]);

  const handlePlay = (id) => {
    console.log("Playing track with ID:", id);
    // Implement play functionality later
  };

  return (
    <section className="relative w-[85%] flex flex-col items-center text-center p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold">Welcome {user?.displayName || "User"}!</h1>
      <p className="text-lg text-gray-200 mt-2">Enjoy your personalized music experience 🎵</p>

      <div className="mt-6 w-full max-w-4xl">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="w-full h-40 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tracks.slice(0, 4).map((track) => (
              <MusicCard
                key={track.id}
                id={track.id}
                name={track.name}
                artist={track.artists[0]?.name || "Unknown Artist"}
                image={track.albumArt || placeholder}
                onClick={handlePlay}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
