import { getBackendURL } from "./api";
import { getValidThumbnailUrl } from "./youtubeUtils";

/**
 * Fetches search results from NestJS YouTube proxy controller (/youtube/search)
 * and caches results in localStorage for 30 minutes.
 */
const fetchAndCacheYoutubeMusic = async (query) => {
  try {
    const API_URL = await getBackendURL();
    const response = await fetch(`${API_URL}/youtube/search?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Backend YouTube search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const rawTracks = data.tracks || [];

    const tracks = rawTracks.map((item) => {
      const rawThumb = item.thumbNail || item.thumbnail || "";
      const sanitizedThumb = getValidThumbnailUrl(rawThumb) || "";

      return {
        id: item.videoId || item.id,
        videoId: item.videoId || item.id,
        name: item.title || item.name || "Unknown Title",
        title: item.title || item.name || "Unknown Title",
        artist: item.channelTitle || item.artist || "Unknown Artist",
        channelTitle: item.channelTitle || item.artist || "Unknown Artist",
        thumbnail: sanitizedThumb,
        thumbNail: sanitizedThumb,
        channelId: item.channelId || "Unknown",
      };
    });

    const CACHE_KEY = `yt_music_cache_${query}`;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: tracks,
        })
      );
    } catch (e) {
      // Catch quota errors gracefully (e.g. Incognito)
    }

    return tracks;
  } catch (error) {
    console.error("Failed to fetch music from backend proxy:", error);
    throw error;
  }
};

/**
 * High-level helper fetching YouTube music search results with local caching.
 */
export const fetchYoutubeMusic = async (query, maxResults = 20) => {
  if (!query || !query.trim()) return [];

  const CACHE_KEY = `yt_music_cache_${query.trim()}`;
  const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore cache parsing errors
  }

  return await fetchAndCacheYoutubeMusic(query.trim());
};
