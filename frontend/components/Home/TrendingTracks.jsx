import React, { useEffect, useState } from "react";
import axios from "axios";
import useSpotifyToken from "../../utils/auth/fetchToken";
import MusicCard from "../Cards/MusicCard";
import { Skeleton } from "@/components/ui/skeleton";

const TrendingTracks = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useSpotifyToken();

  useEffect(() => {
    if (!token) return;

    const fetchTrendingTracks = async () => {
      setLoading(true);
      try {
        const response = await axios.get("https://api.spotify.com/v1/browse/new-releases", {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 10 },
        });

        setAlbums(response.data?.albums?.items || []);
      } catch (error) {
        console.error("Error fetching trending tracks:", error);
      }
      setLoading(false);
    };

    fetchTrendingTracks();
  }, [token]);

  return (
    <section className="mt-6 px-6">
      <h2 className="text-2xl font-semibold mb-4">Trending Albums</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="w-full h-40 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.map((album) => (
            <MusicCard
              key={album.id}
              id={album.id}
              name={album.name}
              artist={album.artists[0]?.name || "Unknown Artist"}
              image={album.images?.[0]?.url || "/placeholder.jpg"}
              onClick={() => console.log(`Playing ${album.name}`)}
            />
          ))}
        </div>

      )}
    </section>
  );
};

export default TrendingTracks;
