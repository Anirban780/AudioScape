import useAuthStore from "../store/useAuthStore";
import useDataRefreshStore from "../store/useDataRefreshStore";
import { getValidThumbnailUrl } from "./youtubeUtils";

const LOCAL_API_URL = "http://localhost:5000";
const PROD_API_URL = import.meta.env.VITE_PROD_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;

// In-memory memoization cache for resolved backend URL to prevent repetitive /healthcheck pings
let cachedBackendURL = null;

/**
 * Dynamically determines whether to use the local or production backend.
 * Memoizes result in memory so subsequent calls across components execute with 0ms latency.
 */
export async function getBackendURL() {
    if (cachedBackendURL) {
        return cachedBackendURL;
    }

    // If running in browser on a deployed domain (Vercel, etc.), use the configured production backend directly
    const isLocalhost = typeof window !== "undefined" && 
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (!isLocalhost && PROD_API_URL) {
        cachedBackendURL = PROD_API_URL;
        return cachedBackendURL;
    }

    try {
        const response = await fetch(`${LOCAL_API_URL}/healthcheck`, { method: "GET" });
        if (response.ok) {
            cachedBackendURL = LOCAL_API_URL;
            return cachedBackendURL;
        }
    } catch {
        // Local backend not running
    }
    cachedBackendURL = PROD_API_URL || LOCAL_API_URL;
    return cachedBackendURL;
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
 * Saves a song listen event to NestJS backend database with full playback attribution context.
 *
 * @param {string} videoId - The YouTube ID of the song/video.
 * @param {string} source - Playback attribution source ('SEARCH' | 'EXPLORE' | 'RECOMMENDATION' | 'PLAYLIST' | 'RELATED_QUEUE')
 * @param {object} track - Optional track metadata object for automatic PostgreSQL provisioning
 */
export async function saveSongListen(videoId, source = "SEARCH", track = {}) {
    if (!videoId) return;

    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const payload = {
            videoId,
            source,
        };

        if (track?.title || track?.name) {
            payload.title = track.title || track.name;
        }
        if (track?.artist || track?.channelTitle) {
            payload.artist = track.artist || track.channelTitle;
        }
        if (track?.thumbnail || track?.thumbNail) {
            payload.thumbnailUrl = track.thumbnail || track.thumbNail;
        }

        const response = await fetch(`${API_URL}/api/music/history`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to save song listen: ${response.status} ${response.statusText}`);
        }

        console.log(`Song saved to database successfully (source: ${source})`);
        // Trigger delayed invalidation for playback history subscribers
        useDataRefreshStore.getState().invalidate("history");
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
                playCount: item.playCount || track?.playCount || 0,
                likedAt: item.likedAt || track?.likedAt || null,
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

        // Trigger delayed invalidation for favorites and recommendations subscribers
        useDataRefreshStore.getState().invalidate("favorites");
        useDataRefreshStore.getState().invalidate("recommendations");
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
 * Supports both getRecommendations(topN) and getRecommendations(userId, topN).
 * Updates localStorage SWR cache to enable instantaneous loading on page refresh.
 */
export const getRecommendations = async (arg1 = 10, arg2) => {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();
        const stateUser = useAuthStore.getState().user;

        // Defensive parameter resolution: ensures topN is always a sanitized integer
        let topN = 10;
        let userId = stateUser?.id;

        if (typeof arg1 === "number") {
            topN = arg1;
        } else if (typeof arg2 === "number") {
            topN = arg2;
            if (typeof arg1 === "string" && arg1) userId = arg1;
        } else if (typeof arg1 === "string" && !isNaN(Number(arg1))) {
            topN = Number(arg1);
        }

        const response = await fetch(`${API_URL}/api/music/recommend`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({ userId, topN }),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const recommendations = data.recommendations || data.tracks || (Array.isArray(data) ? data : []);

        const formatted = recommendations.map((item) => {
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

        // Update local SWR cache for instant load on refresh
        if (formatted.length > 0) {
            try {
                localStorage.setItem(
                    "audioscape_cached_recommendations",
                    JSON.stringify({ timestamp: Date.now(), data: formatted })
                );
            } catch {
                // Ignore storage quota errors
            }
        }

        return formatted;
    } catch (err) {
        console.error("Recommendation error:", err);
        return [];
    }
};

/**
 * ============================================================================
 * FETCH PAGINATED RECOMMENDATIONS (fetchPaginatedRecommendations)
 * ============================================================================
 * Calls NestJS backend GET /api/music/recommendations with pagination and shuffle options.
 * Queries 100% indexed local PostgreSQL catalog with zero YouTube API quota consumption.
 * 
 * @param {Object} options
 * @param {number} [options.page=1] - 1-based page number
 * @param {number} [options.limit=20] - Page size
 * @param {boolean} [options.shuffle=false] - When true, applies windowed Fisher-Yates shuffling
 * @returns {Promise<{ data: Array, meta: Object }>}
 */
export const fetchPaginatedRecommendations = async ({ page = 1, limit = 20, shuffle = false } = {}) => {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            shuffle: String(shuffle),
        });

        const response = await fetch(`${API_URL}/api/music/recommendations?${params.toString()}`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch paginated recommendations: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        const rawData = json.recommendations || json.data || (Array.isArray(json) ? json : []);
        const total = typeof json.total === "number" ? json.total : (json.meta?.total ?? rawData.length);
        const limitNum = typeof json.limit === "number" ? json.limit : (json.meta?.limit ?? limit);
        const totalPages = typeof json.totalPages === "number" ? json.totalPages : (json.meta?.totalPages ?? Math.max(1, Math.ceil(total / limitNum)));
        const currentPage = typeof json.page === "number" ? json.page : (json.meta?.page ?? page);

        const meta = {
            total,
            page: currentPage,
            limit: limitNum,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1,
            isShuffled: typeof json.isShuffled === "boolean" ? json.isShuffled : (json.meta?.isShuffled ?? Boolean(shuffle)),
        };

        const formattedData = rawData.map((item) => {
            const thumb = getValidThumbnailUrl(item.thumbNail || item.thumbnail || "") || item.thumbNail || item.thumbnail || "";
            return {
                id: item.videoId || item.id,
                videoId: item.videoId || item.id,
                title: item.title || item.name || "Unknown Title",
                name: item.title || item.name || "Unknown Title",
                artist: item.artist || item.channelTitle || "Unknown Artist",
                channelTitle: item.artist || item.channelTitle || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                sourceKeyword: item.sourceKeyword || item.keyword || (Array.isArray(item.genre) ? item.genre[0] : item.genre) || "Discovery",
            };
        });

        return {
            data: formattedData,
            meta,
        };
    } catch (err) {
        console.error("fetchPaginatedRecommendations error:", err);
        return {
            data: [],
            meta: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
                isShuffled: Boolean(shuffle),
            },
        };
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

        const response = await fetch(`${API_URL}/api/music/explore?limit=20`, {
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
            keyword: section.keyword || section.title,
            category: section.category || section.title,
            tracks: (section.tracks || []).map((t) => {
                const thumb = getValidThumbnailUrl(t.thumbnail || t.thumbNail || "") || "";
                return {
                    id: t.id || t.videoId,
                    videoId: t.id || t.videoId,
                    title: t.name || t.title || "Unknown Track",
                    name: t.name || t.title || "Unknown Track",
                    artist: t.artist || t.channelTitle || "Unknown Artist",
                    channelTitle: t.artist || t.channelTitle || "Unknown Artist",
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
 * Fetches tracks for a specific genre or category directly from PostgreSQL (0-quota rule).
 * Replaces legacy client-side YouTube Data API v3 search calls to eliminate 100 quota units/click.
 *
 * @param {string} keyword - Category query keyword, slug, or label.
 * @param {number} [limit=20] - Number of tracks to retrieve.
 * @returns {Promise<{ title: string, category: string, tracks: Array }>} Category payload with tracks.
 */
export async function fetchCategoryTracks(keyword, limit = 20) {
    if (!keyword || !keyword.trim()) return { title: "", category: "", tracks: [] };

    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(
            `${API_URL}/api/music/explore/category/${encodeURIComponent(keyword.trim())}?limit=${limit}`,
            {
                method: "GET",
                headers: { ...headers },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch category tracks for "${keyword}": ${response.statusText}`);
        }

        const data = await response.json();
        const rawTracks = Array.isArray(data) ? data : data.tracks || [];

        const tracks = rawTracks.map((t) => {
            const thumb = getValidThumbnailUrl(t.thumbnail || t.thumbNail || "") || "";
            return {
                id: t.id || t.videoId,
                videoId: t.id || t.videoId,
                name: t.name || t.title || "Unknown Title",
                title: t.name || t.title || "Unknown Title",
                artist: t.artist || t.channelTitle || "Unknown Artist",
                channelTitle: t.artist || t.channelTitle || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
            };
        });

        return {
            title: data.title || keyword,
            category: data.category || keyword,
            keyword,
            tracks,
        };
    } catch (error) {
        console.error(`Error fetching category tracks for "${keyword}":`, error);
        return {
            title: keyword,
            category: keyword,
            keyword,
            tracks: [],
        };
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


