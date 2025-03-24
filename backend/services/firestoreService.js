const { db, admin } = require("../config/firebase");
const { getTrackDetails } = require('./youtubeService');
const { Timestamp } = require('firebase-admin/firestore');

// Save track when played
const saveSongListen = async (videoId, userId) => {
    if (!userId) {
        console.error("User not logged in");
        return { success: false, error: "User not logged in" };
    }

    const songDetails = await getTrackDetails(videoId);
    if (!songDetails) {
        console.error("Song details not found for videoId:", videoId);
        return { success: false, error: "Song details not found" };
    }

    const userRef = db.collection('users').doc(userId);
    const listensRef = userRef.collection('song_listens');
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000)); // 1-hour limit

    try {
        // Check if the song has already been played within the last hour
        const snapshot = await listensRef
            .where("id", "==", videoId)
            .where("createdAt", ">=", cutoff)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (!snapshot.empty) {
            console.log("Duplicate listen detected. Skipping...");
            return { success: false, message: "Duplicate listen detected" };
        }

        // Save the new listen
        const songData = {
            id: songDetails.videoId,
            name: songDetails.title,
            artist: songDetails.channelTitle,
            duration: songDetails.duration,
            thumbnail: songDetails.thumbNail,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await listensRef.add(songData);
        console.log("Song listen saved successfully:", songDetails.title);
        return { success: true, message: "Song listen saved" };
    } catch (error) {
        console.error("Error saving song listen:", error);
        return { success: false, error: error.message };
    }
};

module.exports = { saveSongListen };
