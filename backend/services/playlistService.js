//Playlists: Add & Retrieve

const { db } = require("../config/firestoreConfig")

/**
 * Create a new playlist for a user in /users/{userId}/playlists/{playlistId}
 */

const createPlaylist = async (userId, playlistId, playlistName) => {
    try {
        const playlistRef = db.collection("users")
            .doc(userId)
            .collection("playlists")
            .doc(playlistId);

        await playlistRef.set({
            playlistId,
            playlistName,
            createdAt: new Date().toLocaleString(),
        });

        console.log(`Playlist "${playlistName}" created for user ${userId}`);
    }
    catch (error) {
        console.error("Error creating playlist:", error);
    }
};


/**
 * Add a track to a user's playlist in /users/{userId}/playlists/{playlistId}/tracks/{trackId}
 */

const addTrackToPlaylist = async (userId, playlistId, track) => {
    try {
        const playlistTrackRef = db.collection("users")
            .doc(userId)
            .collection("playlists")
            .doc(playlistId)
            .collection("tracks")
            .doc(track.id);

        await playlistTrackRef.set({
            trackId: track.id,
            trackName: track.name,
            artist: track.artists.map(artist => artist.name).join(", "),
            albumArt: track.album.images[0]?.url || "",
            addedAt: new Date().toLocaleString(),
        });

        console.log(`Track "${track.name}" added to playlist "${playlistId}" for user ${userId}`);
    }
    catch (error) {
        console.error("Error adding track to playlist:", error);
    }
};


/**
 * Get all tracks from a user's playlist
 */

const getPlaylistTracks = async (userId, playlistId) => {
    try {
        const snapshot = await db.collection("users")
            .doc(userId)
            .collection("playlists")
            .doc(playlistId)
            .collection("tracks")
            .orderBy("addedAt", "desc")
            .get();

        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error("Error retrieving playlist tracks:", error);
        return [];
    }
};


module.exports = { createPlaylist, addTrackToPlaylist, getPlaylistTracks }
