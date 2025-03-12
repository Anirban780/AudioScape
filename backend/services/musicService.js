//Music History: Save & Retrieve Played Songs

const { db } = require("../config/firestoreConfig")

/**
 * Save played track to Firestore in /users/{userId}/musicHistory/{trackId}
 * @param {string} userId - User's ID
 * @param {Object} track - Track details
 */


const saveListenedTrack = async (userId, track) => {
    try {
        const trackRef = db.collection("users")
            .doc(userId)
            .collection("musicHistory")
            .doc(track.id);

        await trackRef.set({
            trackId: track.id,
            trackName: track.name,
            artist: track.artists.map(artist => artist.name).join(", "),
            albumArt: track.album.images[0]?.url || "",
            playedAt: new Date().toLocaleString(),
        });

        console.log(`Track "${track.name}" saved for user ${userId}`);
    } catch (error) {
        console.error("Error saving track:", error);
    }
};


/**
 * Get user's listening history from Firestore
 * @param {string} userId - User's ID
 * @returns {Array} - List of listened tracks
 */


const getUserHistory = async (userId) => {
    try {
        const snapshot = await db.collection("users")
            .doc(userId)
            .collection("musicHistory")
            .orderBy("playedAt", "desc")
            .get();

        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Error retrieving user history:", error);
        return [];
    }
};

module.exports = { saveListenedTrack, getUserHistory }
