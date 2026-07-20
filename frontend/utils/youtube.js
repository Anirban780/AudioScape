// utils/youtube.js
import { getBackendURL } from "./api";

const fetchAndCacheYoutubeMusic = async (query) => {
  try {
    const API_URL = await getBackendURL();
    const response = await fetch(`${API_URL}/youtube/search?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Backend YouTube search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const rawTracks = data.tracks || [];

    const tracks = rawTracks.map(item => ({
      id: item.videoId || item.id,
      name: item.title || item.name || "Unknown Title",
      artist: item.channelTitle || item.artist || "Unknown Artist",
      thumbnail: item.thumbNail || item.thumbnail || "",
      channelId: item.channelId || "Unknown",
    }));

    const CACHE_KEY = `yt_music_cache_${query}`;
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: tracks,
      })
    );

    return tracks;
  } catch (error) {
    console.error("Failed to fetch music from backend proxy:", error);
    throw error;
  }
};

export const fetchYoutubeMusic = async (query, maxResults = 20) => {
  const CACHE_KEY = `yt_music_cache_${query}`;
  const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    const parsed = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp < CACHE_EXPIRY_MS) {
      console.log("✅ Using cached data for:", query);
      return parsed.data; // Return cached data if it's still valid
    } else {
      console.log("⏰ Cache expired for:", query);
      return await fetchAndCacheYoutubeMusic(query);
    }
  } else {
    console.log("🔄 No cached data found for:", query);
    return await fetchAndCacheYoutubeMusic(query);
  }
};
