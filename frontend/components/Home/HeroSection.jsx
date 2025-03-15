import React, { useEffect, useState } from "react";

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

  
  return (
    <section className="relative w-[85%] flex flex-col items-center text-center p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold">Welcome {user?.displayName || "User"}!</h1>
      <p className="text-lg text-gray-200 mt-2">Enjoy your personalized music experience 🎵</p>

      <div className="mt-6 relative w-full max-w-4xl overflow-x-auto">
        {loading ? (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="w-[180px] h-40 rounded-lg flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4">
            {tracks.slice(0,10).map((track) => (
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
