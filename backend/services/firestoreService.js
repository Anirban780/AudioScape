const { db, admin } = require("../config/firebase");
const { getTrackDetails } = require('./youtubeService');

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
    const listensRef = userRef.collection('music_history');
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
        // Check if the song already exists in the user's history
        const existingSongQuery = await listensRef
            .where("id", "==", videoId)
            .limit(1)
            .get()

        if(!existingSongQuery.empty) {
            // Update lastPlayedAt timestamp
            const songDoc = existingSongQuery.docs[0].ref;
            await songDoc.update({ lastPlayedAt: now });
            console.log(`Updated lastPlayedAt for ${songDetails.title}`);
            return { success: true, message: "Song listen updated" };
        }


        //  If song is not in history, add it
        const songData = {
            id: songDetails.videoId,
            name: songDetails.title,
            artist: songDetails.channelTitle,
            duration: songDetails.duration,
            thumbnail: songDetails.thumbNail,
            lastPlayedAt: now,
        };

        await listensRef.add(songData);
        console.log(`Added new song to history: ${songDetails.title}`);
        return { success: true, message: "Song listen saved" };
        
    } catch (error) {
        console.error("Error saving song listen:", error);
        return { success: false, error: error.message };
    }
};



module.exports = { saveSongListen };
