const { db, admin } = require("../config/firebase");
const { getTrackDetails } = require('./youtubeService');
const { Timestamp } = require('firebase-admin/firestore');

//save track when played
const saveSongListen = async (videoId, userId) => {
    if (!userId) throw new Error("User not logged in");

    const songDetails = await getTrackDetails(videoId);
    if (!songDetails) throw new Error("Song details not found");

    const userRef = db.collection('users').doc(userId);
    const listensRef = userRef.collection('song_listens');

    const songData = {
        id: songDetails.videoId,
        name: songDetails.title,
        artist: songDetails.channelTitle,
        duration: songDetails.duration,
        thumbnail: songDetails.thumbNail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await db.runTransaction(async (transaction) => {
            const cutoff = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
            const snapshot = await transaction.get(
                listensRef
                    .where("id", "==", videoId)
                    .where("createdAt", ">=", cutoff)
                    .orderBy("createdAt", "desc")
                    .limit(1)
            );
    
            if (!snapshot.empty) {
                console.log("Duplicate listen detected. Skipping...");
                return;
            }
    
            const docRef = listensRef.doc();
            transaction.set(docRef, songData);
            console.log("Song listen saved successfully", songDetails.name);
        });
        console.log("Transaction completed successfully"); // Confirm transaction completion
    } catch (error) {
        console.error("Transaction failed:", error); // Log full error details
        throw error; // Re-throw to handle upstream if needed
    }
};


module.exports = { saveSongListen };