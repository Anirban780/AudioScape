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

export const fetchYoutubeMusic = async (query = "popular music", maxResults) => {
    const CACHE_KEY = `yt_music_cache_${query}`;
    const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour
  
    const cached = localStorage.getItem(CACHE_KEY);
  
    if (cached) {
      const parsed = JSON.parse(cached);
      const now = Date.now();
  
      // Return cached data if it's still valid
      if (now - parsed.timestamp < CACHE_EXPIRY_MS) {
        console.log("Returning cached YouTube music for:", query);
        return parsed.data;
      }
    }
  
    // --- Call API since no valid cache found ---
    const musicCategoryId = await getMusicCategoryId();
    if (!musicCategoryId) throw new Error("Music category not found");
  
    const url = `${BASE_URL}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&videoCategoryId=${musicCategoryId}&key=${API_KEY}`;
  
    try {
      const response = await axios.get(url);
      const tracks = response.data.items.map((item) => ({
        id: item.id.videoId,
        name: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));
  
      // Save result to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: tracks,
        timestamp: Date.now(),
      }));
  
      return tracks;
    } catch (error) {
      console.error("Error fetching YouTube music:", error);
      throw new Error("Failed to fetch YouTube music");
    }
  };