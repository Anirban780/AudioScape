import React, { useEffect, useState } from "react";
import { fetchRecommendedTracks } from "../../utils/api/spotifyApi"; // API function to fetch recommendations
import { useAuth } from "../../context/AuthContext"; // Firebase Auth Context
import { Skeleton } from "@/components/ui/skeleton"; // ShadCN Skeleton for loading effect

const HeroSection = () => {
  const { user } = useAuth(); // Get logged-in user data
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRecommendations = async () => {
      try {
        const recommendedTracks = await fetchRecommendedTracks(); // Fetch from Spotify API
        setTracks(recommendedTracks);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    getRecommendations();
  }, []);

  return (
    <section className="relative w-[85%] h-100 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold">Welcome {user?.displayName || "User"}!</h1>
      <p className="text-lg text-gray-200 mt-2">Enjoy your personalized music experience 🎵</p>

      {/* Display recommended songs */}
      <div className="mt-6 w-full max-w-4xl">
        {loading ? (
          <Skeleton className="w-full h-40 rounded-lg" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tracks.slice(0, 4).map((track) => (
              <div key={track.id} className="bg-gray-900 p-4 rounded-lg shadow-md hover:scale-105 transition">
                <img src={track.albumArt} alt={track.name} className="w-full h-32 object-cover rounded-md" />
                <p className="mt-2 font-semibold">{track.name}</p>
                <p className="text-sm text-gray-300">{track.artist}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
