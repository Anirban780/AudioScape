//Favorite Tracks: Add & Remove

const { db } = require("../config/firestoreConfig")

/**
 * Add a track to user's favorites in /users/{userId}/favorites/{trackId}
 */
const addFavoriteTrack = async (userId, track) => {
    try {

        const trackRef = db.collection("users")
            .doc(userId)
            .collection("favorites")
            .doc(track.id);

        await trackRef.set({
            trackId: track.id,
            trackName: track.name,
            artist: track.artists.map(artist => artist.name).join(", "),
            albumArt: track.album.images[0]?.url || "",
            favoritedAt: new Date().toLocaleString(),
        });

        console.log(`Track "${track.name}" added to favorites for user ${userId}`);
    }
    catch (error) {
        console.error("Error adding favorite track:", error);
    }
};


/**
 * Remove a track from user's favorites
 */

const removeFavoriteTrack = async (userId, trackId) => {
    try {
        const trackRef = db.collection("users")
            .doc(userId)
            .collection("favorites")
            .doc(trackId);

        await trackRef.delete();
        console.log(`Track "${trackId}" removed from favorites for user ${userId}`);
    }
    catch (error) {
        console.error("Error removing favorite track:", error);
    }
};


/**
 * Get user's favorite tracks
 */

const getFavoriteTracks = async (userId) => {
    try {
        const snapshot = await db.collection("users")
            .doc(userId)
            .collection("favorites")
            .orderBy("favoritedAt", "desc")
            .get();

        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error("Error retrieving favorite tracks:", error);
        return [];
    }
};

module.exports = { getFavoriteTracks, addFavoriteTrack, removeFavoriteTrack };
