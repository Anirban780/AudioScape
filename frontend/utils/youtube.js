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

  const searchUrl = `${BASE_URL}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&videoCategoryId=${musicCategoryId}&key=${API_KEY}`;

  try {
    const searchResponse = await axios.get(searchUrl);
    const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(",");

    const detailsUrl = `${BASE_URL}/videos?part=contentDetails,snippet&id=${videoIds}&key=${API_KEY}`;
    const detailsResponse = await axios.get(detailsUrl);

    const tracks = detailsResponse.data.items
      .filter(item => {
        const duration = item.contentDetails.duration;

        // Parse ISO 8601 duration into total seconds
        const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        const minutes = parseInt(match?.[1] || "0", 10);
        const seconds = parseInt(match?.[2] || "0", 10);
        const totalSeconds = minutes * 60 + seconds;

        // Filter: only videos 60s to 360s (1 to 6 min)
        return totalSeconds >= 60 && totalSeconds <= 360;
      })
      .map(item => ({
        id: item.id,
        name: item.snippet.title || "Unknown Title",
        artist: item.snippet.channelTitle || "Unknown Artist",
        thumbnail: item.snippet.thumbnails.medium.url,
        channelId: item.snippet.channelId || "Unknown",
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
    console.error("Failed to fetch music:", error);
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
    } 
    else {
      console.log("⏰ Cache expired for:", query);
      // Cache expired, so make the API call
      return await fetchAndCacheYoutubeMusic(query, maxResults);
    }
  } 
  else {
    console.log("🔄 No cached data found for:", query);
    // No cache, make the API call
    return await fetchAndCacheYoutubeMusic(query, maxResults);
  }
};
