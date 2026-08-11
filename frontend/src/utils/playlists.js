import { auth } from "../firebase/firebaseConfig";
import { getBackendURL } from "./api";
import { getValidThumbnailUrl } from "./youtubeUtils";

/**
 * Helper to retrieve Firebase ID Token for NestJS Authorization header.
 */
async function getAuthHeader() {
    if (!auth.currentUser) return {};
    try {
        const token = await auth.currentUser.getIdToken();
        return { Authorization: `Bearer ${token}` };
    } catch (err) {
        console.error("Error getting auth token:", err);
        return {};
    }
}

/**
 * Creates a new user playlist in NestJS backend.
 */
export const createPlaylist = async (userId, name) => {
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
        body: JSON.stringify({ name: trimmedName }),
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

        return playlists.map((pl) => ({
            id: pl.id,
            name: pl.name,
            songs: (pl.tracks || pl.songs || []).map((pt) => {
                const track = pt.track || pt;
                const thumb = getValidThumbnailUrl(track.thumbnailUrl || track.thumbNail || "") || "";
                return {
                    id: track.youtubeVideoId || track.videoId || track.id,
                    videoId: track.youtubeVideoId || track.videoId || track.id,
                    title: track.title || "Unknown Title",
                    name: track.title || "Unknown Title",
                    artist: track.artist || track.channelTitle || "Unknown Artist",
                    thumbnail: thumb,
                    thumbNail: thumb,
                };
            }),
            createdAt: pl.createdAt,
            updatedAt: pl.updatedAt,
        }));
    } catch (error) {
        console.error("Error fetching user playlists:", error);
        return [];
    }
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
        body: JSON.stringify({ videoId }),
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
