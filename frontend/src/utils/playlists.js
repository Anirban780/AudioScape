import useAuthStore from "../store/useAuthStore";
import { getBackendURL } from "./api";
import { getValidThumbnailUrl, getHighResThumbnailUrl } from "./youtubeUtils";

/**
 * Helper to retrieve Google OAuth ID Token from useAuthStore for NestJS Authorization header.
 */
async function getAuthHeader() {
    const { idToken } = useAuthStore.getState();
    if (!idToken) return {};
    return { Authorization: `Bearer ${idToken}` };
}

/**
 * Creates a new user playlist in NestJS backend with optional description and coverUrl.
 *
 * @param {string} userId - User ID string
 * @param {string} name - Playlist title
 * @param {string} [description] - Optional playlist description
 * @param {string} [coverUrl] - Optional cover image URL
 * @returns {Promise<Object>} Created playlist object
 */
export const createPlaylist = async (userId, name, description = "", coverUrl = "") => {
    const trimmedName = name?.trim();
    if (!trimmedName) throw new Error("Playlist name cannot be empty");

    const headers = await getAuthHeader();
    const API_URL = await getBackendURL();

    const response = await fetch(`${API_URL}/api/playlists`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify({
            name: trimmedName,
            description: description?.trim() || undefined,
            coverUrl: coverUrl || undefined,
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create playlist");
    }

    const data = await response.json();
    return data.playlist || data;
};

/**
 * Fetches all playlists owned by the authenticated user from NestJS backend.
 * Parses up to 4 thumbnail URLs (`previewThumbnails`) to support 2x2 Spotify-style mosaic card rendering.
 *
 * @param {string} userId - User ID string
 * @returns {Promise<Array>} List of formatted user playlists
 */
export const getPlaylists = async (userId) => {
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/playlists`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch playlists: ${response.statusText}`);
        }

        const data = await response.json();
        const playlists = data.playlists || (Array.isArray(data) ? data : []);

        return playlists.map((pl) => {
            const rawThumbs = pl.previewThumbnails || (pl.previewThumbnail ? [pl.previewThumbnail] : []);
            const validThumbs = rawThumbs
                .map((t) => getHighResThumbnailUrl(t) || getValidThumbnailUrl(t))
                .filter(Boolean);

            const songs = (pl.tracks || pl.songs || []).map((pt) => {
                const track = pt.track || pt;
                const videoId = track.youtubeVideoId || track.videoId || track.id;
                const rawThumb = track.thumbnailUrl || track.thumbNail || "";
                const thumb = getHighResThumbnailUrl(rawThumb, videoId) || getValidThumbnailUrl(rawThumb) || "";
                return {
                    id: videoId,
                    videoId: videoId,
                    title: track.title || "Unknown Title",
                    name: track.title || "Unknown Title",
                    artist: track.artist || track.channelTitle || "Unknown Artist",
                    thumbnail: thumb,
                    thumbNail: thumb,
                    durationSeconds: track.durationSeconds || 0,
                };
            });

            return {
                id: pl.id,
                name: pl.name,
                description: pl.description || "",
                coverUrl: pl.coverUrl || "",
                trackCount: pl.trackCount !== undefined ? pl.trackCount : songs.length,
                previewThumbnail: validThumbs[0] || (songs[0]?.thumbnail) || null,
                previewThumbnails: validThumbs.length > 0 ? validThumbs : songs.slice(0, 4).map((s) => s.thumbnail).filter(Boolean),
                songs,
                createdAt: pl.createdAt,
                updatedAt: pl.updatedAt,
            };
        });
    } catch (error) {
        console.error("Error fetching user playlists:", error);
        return [];
    }
};

/**
 * Fetches a single playlist by ID along with its full list of ordered tracks & duration aggregates.
 *
 * @param {string} userId - User ID string
 * @param {string} playlistId - Target Playlist UUID
 * @returns {Promise<Object|null>} Playlist detail object or null
 */
export const getPlaylistById = async (userId, playlistId) => {
    if (!playlistId) return null;

    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/playlists/${playlistId}`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch playlist ${playlistId}: ${response.statusText}`);
        }

        const data = await response.json();
        const rawTracks = data.tracks || [];

        const formattedSongs = rawTracks.map((pt) => {
            const track = pt.track || pt;
            const videoId = track.youtubeVideoId || track.videoId || track.id;
            const rawThumb = track.thumbnailUrl || track.thumbNail || "";
            const thumb = getHighResThumbnailUrl(rawThumb, videoId) || getValidThumbnailUrl(rawThumb) || "";
            return {
                id: videoId,
                videoId: videoId,
                title: track.title || "Unknown Title",
                name: track.title || "Unknown Title",
                artist: track.artist || track.channelTitle || "Unknown Artist",
                thumbnail: thumb,
                thumbNail: thumb,
                durationSeconds: track.durationSeconds || 0,
                addedAt: pt.addedAt || data.createdAt,
                position: pt.position || 0,
            };
        });

        const validThumbs = formattedSongs.slice(0, 4).map((s) => s.thumbnail).filter(Boolean);

        return {
            id: data.id,
            name: data.name,
            description: data.description || "",
            coverUrl: data.coverUrl || "",
            trackCount: data.trackCount !== undefined ? data.trackCount : formattedSongs.length,
            totalDurationSeconds: data.totalDurationSeconds || formattedSongs.reduce((acc, s) => acc + (s.durationSeconds || 0), 0),
            previewThumbnail: validThumbs[0] || null,
            previewThumbnails: validThumbs,
            songs: formattedSongs,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    } catch (error) {
        console.error(`Error fetching playlist ${playlistId}:`, error);
        return null;
    }
};

/**
 * Updates an existing playlist's name, description, and/or coverUrl.
 *
 * @param {string} userId - User ID string
 * @param {string} playlistId - Playlist UUID
 * @param {Object} updateData - { name?, description?, coverUrl? }
 * @returns {Promise<Object>} Updated playlist response
 */
export const updatePlaylist = async (userId, playlistId, updateData) => {
    if (!playlistId) throw new Error("Playlist ID is required");

    const headers = await getAuthHeader();
    const API_URL = await getBackendURL();

    const response = await fetch(`${API_URL}/api/playlists/${playlistId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify(updateData),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update playlist");
    }

    const data = await response.json();
    return data.playlist || data;
};

/**
 * Persists updated track positions for drag-and-drop reordering.
 * Automatically computes 1-indexed position positions (`1..N`).
 *
 * @param {string} userId - User ID string
 * @param {string} playlistId - Playlist UUID
 * @param {Array} tracks - Array of track objects in their new ordered sequence
 * @returns {Promise<Object>} API response
 */
export const reorderPlaylistTracks = async (userId, playlistId, tracks) => {
    if (!playlistId || !Array.isArray(tracks)) return;

    const formattedPayload = {
        tracks: tracks.map((t, index) => ({
            trackId: t.id || t.videoId,
            position: index + 1, // 1-based indexing required by backend validator
        })),
    };

    const headers = await getAuthHeader();
    const API_URL = await getBackendURL();

    const response = await fetch(`${API_URL}/api/playlists/${playlistId}/tracks/reorder`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify(formattedPayload),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to reorder playlist tracks");
    }

    return response.json();
};

/**
 * No-op helper preserved for backwards compatibility.
 * Database foreign keys in PostgreSQL perform automatic cascade cleanups.
 */
export const cleanupPlaylistFromSongs = async (userId, playlistId) => {
    return Promise.resolve();
};

/**
 * Deletes a playlist from NestJS backend by playlist ID.
 */
export const deletePlaylist = async (userId, playlistId) => {
    if (!playlistId) return;

    const headers = await getAuthHeader();
    const API_URL = await getBackendURL();

    const response = await fetch(`${API_URL}/api/playlists/${playlistId}`, {
        method: "DELETE",
        headers: { ...headers },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete playlist");
    }
};

/**
 * Adds a song to a user's playlist in NestJS backend.
 */
export const addSongToPlaylist = async (userId, playlistId, song) => {
    const videoId = song?.id || song?.videoId;
    if (!playlistId || !videoId) {
        throw new Error("Playlist ID and Track Video ID are required");
    }

    const headers = await getAuthHeader();
    const API_URL = await getBackendURL();

    const response = await fetch(`${API_URL}/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify({
            videoId,
            title: song.name || song.title || "Unknown Title",
            artist: song.artist || song.channelTitle || "Unknown Artist",
            thumbnailUrl: song.thumbnail || song.thumbNail || song.thumbnailUrl || "",
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to add song to playlist");
    }
};

/**
 * Removes a song from a user's playlist in NestJS backend.
 */
export const removeSongFromPlaylist = async (userId, playlistId, songId) => {
    if (!playlistId || !songId) return;

    const headers = await getAuthHeader();
    const API_URL = await getBackendURL();

    const response = await fetch(`${API_URL}/api/playlists/${playlistId}/tracks/${songId}`, {
        method: "DELETE",
        headers: { ...headers },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to remove song from playlist");
    }
};

/**
 * Fetches array of playlist IDs containing a given track for the user.
 *
 * @param {string} userId - User ID string
 * @param {string} videoId - YouTube Video ID of target track
 * @returns {Promise<Array<string>>} Array of playlist UUID strings
 */
export const getTrackMembership = async (userId, videoId) => {
    if (!videoId) return [];
    try {
        const headers = await getAuthHeader();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/playlists/membership/${videoId}`, {
            method: "GET",
            headers: { ...headers },
        });

        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.playlistIds || []);
    } catch (error) {
        console.error("Error fetching track membership:", error);
        return [];
    }
};

