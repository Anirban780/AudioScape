// utils/youtube.js

import axios from "axios";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const getMusicCategoryId = async () => {
  const url = `${BASE_URL}/videoCategories?part=snippet&regionCode=US&key=${API_KEY}`;
  const response = await axios.get(url);
  const musicCategory = response.data.items.find(
    item => item.snippet.title.toLowerCase() === "music"
  );
  return musicCategory ? musicCategory.id : null;
};

const fetchAndCacheYoutubeMusic = async (query, maxResults = 20) => {
  const musicCategoryId = await getMusicCategoryId();
  if (!musicCategoryId) throw new Error("Music category not found");

  const url = `${BASE_URL}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&videoCategoryId=${musicCategoryId}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const tracks = response.data.items.map(item => ({
      id: item.id.videoId,
      name: item.snippet.title || "Unknown Title",
      artist: item.snippet.channelTitle || "Unknown Artist",
      thumbnail: item.snippet.thumbnails.medium.url,
      duration: item.contentDetails?.duration || 'PTOS',
      genre: item.snippet.tags || [],
      channelId: item.snippet.channelId || "Unknown",

    }));

    // Cache the data
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
    console.error("Failed to fetch music:", error);
    throw error;
  }
};

export const fetchYoutubeMusic = async (query, maxResults = 20) => {
  const CACHE_KEY = `yt_music_cache_${query}`;
  const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    const parsed = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp < CACHE_EXPIRY_MS) {
      console.log("✅ Using cached data for:", query);
      return parsed.data; // Return cached data if it's still valid
    } else {
      console.log("⏰ Cache expired for:", query);
      // Cache expired, so make the API call
      return await fetchAndCacheYoutubeMusic(query, maxResults);
    }
  } else {
    console.log("🔄 No cached data found for:", query);
    // No cache, make the API call
    return await fetchAndCacheYoutubeMusic(query, maxResults);
  }
};
