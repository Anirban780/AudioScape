import useAuthStore from "../store/useAuthStore";
import { getValidThumbnailUrl } from "./youtubeUtils";

const LOCAL_API_URL = "http://localhost:5000";
const PROD_API_URL = import.meta.env.VITE_PROD_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;

/**
 * Dynamically determines whether to use the local or production backend.
 */
export async function getBackendURL() {
    try {
        const response = await fetch(`${LOCAL_API_URL}/healthcheck`, { method: "GET" });
        if (response.ok) {
            console.log("Using Local Backend");
            return LOCAL_API_URL;
        }
    } catch (error) {
        console.log("Local backend not found, using Vercel/Production Backend");
    }
    return PROD_API_URL || LOCAL_API_URL;
}

/**
 * Helper to retrieve Google OAuth ID Token from useAuthStore for NestJS Authorization header.
 */
async function getAuthHeader() {
    const { idToken } = useAuthStore.getState();
    if (!idToken) return {};
    return { Authorization: `Bearer ${idToken}` };
}

/**
 * Saves a song listen event to NestJS backend database.
 * @param {string} videoId - The ID of the song/video.
 */
export async function saveSongListen(videoId) {
    if (!videoId) return;

    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/history`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to save song listen: ${response.status} ${response.statusText}`);
        }

        console.log("Song saved to database successfully");
    } catch (error) {
        console.error("Error saving song/track:", error);
    }
}

/**
 * Fetches the last played songs from NestJS backend for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - An array of the last played songs.
 */
export async function fetchLastPlayed(userId) {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/history?limit=50`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch listen history: ${response.statusText}`);
        }

        const data = await response.json();
        const rawHistory = data.data || data.history || (Array.isArray(data) ? data : []);

        return rawHistory.map((item) => {
            const track = item.track || item;
            const thumb = getValidThumbnailUrl(track.thumbnailUrl || item.thumbNail || item.thumbnail || "") || "";
            return {
                id: track.youtubeVideoId || item.videoId || item.id,
                videoId: track.youtubeVideoId || item.videoId || item.id,
                title: track.title || item.title || "Unknown Title",
                name: track.title || item.title || "Unknown Title",
                artist: track.artist || item.channelTitle || item.artist || "Unknown Artist",
                channelTitle: track.artist || item.channelTitle || item.artist || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                lastPlayedAt: item.lastPlayedAt || item.playedAt || new Date(),
                liked: item.liked || false,
            };
        });
    } catch (error) {
        console.error("Error fetching last played songs:", error);
        return [];
    }
}

/**
 * Fetches user's liked songs from NestJS backend.
 */
export async function fetchUserLikedSongs(userId) {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/favorites`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch liked songs: ${response.statusText}`);
        }

        const data = await response.json();
        const rawFavorites = data.favorites || data.likedTracks || (Array.isArray(data) ? data : []);

        return rawFavorites.map((item) => {
            const track = item.track || item;
            const thumb = getValidThumbnailUrl(track.thumbnailUrl || item.thumbNail || item.thumbnail || "") || "";
            return {
                id: track.youtubeVideoId || item.videoId || item.id,
                videoId: track.youtubeVideoId || item.videoId || item.id,
                title: track.title || item.title || "Unknown Title",
                name: track.title || item.title || "Unknown Title",
                artist: track.artist || item.channelTitle || item.artist || "Unknown Artist",
                channelTitle: track.artist || item.channelTitle || item.artist || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                liked: true,
            };
        });
    } catch (error) {
        console.error("Error fetching liked songs:", error);
        return [];
    }
}

/**
 * Saves/updates like status for a track via NestJS backend.
 */
export async function saveLikeSong(userId, track, liked) {
    const videoId = track?.id || track?.videoId;
    if (!videoId) {
        console.warn("⚠️ Track Video ID is missing");
        return;
    }

    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/like`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ videoId, liked }),
        });

        if (!response.ok) {
            throw new Error(`Failed to save like status: ${response.status}`);
        }
    } catch (error) {
        console.error("Error saving like status:", error);
    }
}

/**
 * Fetches liked status for a track.
 */
export async function fetchLikedStatus(userId, videoId) {
    if (!videoId) return false;
    try {
        const likedSongs = await fetchUserLikedSongs(userId);
        return likedSongs.some((song) => song.id === videoId || song.videoId === videoId);
    } catch (error) {
        console.error("Error fetching liked status:", error);
        return false;
    }
}

/**
 * Caches related tracks to NestJS backend database under `search_queries`.
 */
export const cacheRelatedTracks = async (keyword, tracks) => {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/cache-related-tracks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ keyword, tracks }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to cache related tracks");
        }

        console.log(`Songs with keyword '${keyword}' cached successfully`);
        return { success: true, message: data.message };
    } catch (error) {
        console.error("Error caching related tracks:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Fetches TF-IDF AI music recommendations from NestJS recommendations service.
 */
export const getRecommendations = async (topN = 10) => {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();
        const userId = useAuthStore.getState().user?.id;

        const response = await fetch(`${API_URL}/api/music/recommend`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ userId, topN }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch recommendations");
        }

        const data = await response.json();
        const recommendations = data.recommendations || data.tracks || (Array.isArray(data) ? data : []);

        return recommendations.map((item) => {
            const thumb = getValidThumbnailUrl(item.thumbNail || item.thumbnail || "") || "";
            return {
                id: item.videoId || item.id,
                videoId: item.videoId || item.id,
                title: item.title || item.name || "Unknown Title",
                name: item.title || item.name || "Unknown Title",
                artist: item.channelTitle || item.artist || "Unknown Artist",
                channelTitle: item.channelTitle || item.artist || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                sourceKeyword: item.sourceKeyword || item.keyword || (Array.isArray(item.genre) ? item.genre[0] : item.genre) || "Daily Mix",
            };
        });
    } catch (err) {
        console.error("Recommendation error:", err);
        return [];
    }
};

/**
 * Extracts music listening keywords via NestJS backend proxy.
 */
export async function fetchKeywordsFromAI(history = []) {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const res = await fetch(`${API_URL}/api/extractKeywords`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ history }),
        });

        if (res.ok) {
            const json = await res.json();
            return json.keywords || [];
        } else {
            console.error("Gemini API response not OK:", res.status);
        }
    } catch (err) {
        console.error("AI keyword fetch failed: ", err);
    }

    return [];
}

/**
 * Fetches server-side explore feed sections from NestJS recommendations module.
 * @returns {Promise<Array>} - An array of explore sections with tracks.
 */
export async function fetchExploreFeed() {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/explore?limit=15`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch explore feed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Map backend schema (id, name, artist, thumbnail) to frontend schema (videoId, title, channelTitle, thumbNail)
        return (data || []).map((section) => ({
            title: section.title,
            tracks: (section.tracks || []).map((t) => {
                const thumb = getValidThumbnailUrl(t.thumbnail || t.thumbNail || "") || "";
                return {
                    id: t.id,
                    videoId: t.id,
                    title: t.name,
                    name: t.name,
                    artist: t.artist,
                    channelTitle: t.artist,
                    thumbnail: thumb,
                    thumbNail: thumb,
                };
            }),
        }));
    } catch (error) {
        console.error("Error fetching explore feed:", error);
        return [];
    }
}

/**
 * Fetches explore categories taxonomy from NestJS recommendations module.
 */
export async function fetchExploreCategories() {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/categories`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch explore categories: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching explore categories:", error);
        return [];
    }
}

/**
 * Generates an initial play queue from NestJS backend (`POST /api/music/generate-queue`).
 * @param {string} currentTrackId - Active YouTube video ID.
 * @param {string} [keyword] - Optional context genre/keyword.
 * @returns {Promise<Array>} Array of normalized queued track objects.
 */
export async function generateQueueFromBackend(currentTrackId, keyword) {
    if (!currentTrackId) return [];
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/generate-queue`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ currentTrackId, keyword }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate queue from backend: ${response.statusText}`);
        }

        const data = await response.json();
        const rawTracks = Array.isArray(data) ? data : (data.queue || data.tracks || []);

        return rawTracks.map((t) => {
            const trackId = t.id || t.videoId;
            const thumb = getValidThumbnailUrl(t.thumbnail || t.thumbNail || t.thumbnailUrl || "") || "";
            return {
                id: trackId,
                videoId: trackId,
                title: t.name || t.title || "Unknown Title",
                name: t.name || t.title || "Unknown Title",
                artist: t.artist || t.channelTitle || "Unknown Artist",
                channelTitle: t.artist || t.channelTitle || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                genre: t.genre || [],
            };
        });
    } catch (error) {
        console.error("Error generating queue from backend:", error);
        return [];
    }
}

/**
 * Fetches additional non-duplicate recommended tracks from NestJS backend (`POST /api/music/extend-queue`).
 * @param {Array<string>} existingTrackIds - Array of track IDs currently present in client queue.
 * @param {string} [keyword] - Optional context genre/keyword.
 * @returns {Promise<Array>} Array of new normalized track objects.
 */
export async function extendQueueFromBackend(existingTrackIds, keyword) {
    if (!Array.isArray(existingTrackIds) || existingTrackIds.length === 0) return [];
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/extend-queue`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ existingTrackIds, keyword }),
        });

        if (!response.ok) {
            throw new Error(`Failed to extend queue from backend: ${response.statusText}`);
        }

        const data = await response.json();
        const rawTracks = Array.isArray(data) ? data : (data.tracks || []);

        return rawTracks.map((t) => {
            const trackId = t.id || t.videoId;
            const thumb = getValidThumbnailUrl(t.thumbnail || t.thumbNail || t.thumbnailUrl || "") || "";
            return {
                id: trackId,
                videoId: trackId,
                title: t.name || t.title || "Unknown Title",
                name: t.name || t.title || "Unknown Title",
                artist: t.artist || t.channelTitle || "Unknown Artist",
                channelTitle: t.artist || t.channelTitle || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                genre: t.genre || [],
            };
        });
    } catch (error) {
        console.error("Error extending queue from backend:", error);
        return [];
    }
}


