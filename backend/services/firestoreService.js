const { db, admin } = require("../config/firebase");
const { getTrackDetails } = require('./youtubeService');
const { Timestamp } = require('firebase-admin/firestore');

//save track when played
const saveSongListen = async(videoId, userId) => {
    if(!userId) throw new Error("User not logged in");

    //check if song was recently listend to
    if (await hasRecentListen(videoId, userId)){
        console.log("Duplicate listen detected. Skipping...");
        return;
    }
    
    const songDetails = await getTrackDetails(videoId);
    if(!songDetails) throw new Error("Song details not found");

    const songData = {
        id : songDetails.videoId,
        name: songDetails.title,
        artist: songDetails.channelTitle,
        duration: songDetails.duration,
        thumbnail: songDetails.thumbNail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    try {
        const docRef = await db.collection('users')
            .doc(userId)
            .collection('song_listens')
            .add(songData);

        console.log("Song listen saved successfully", songDetails.name);
        return { listenId: docRef.id, ...songData };
    }
    catch (error) {
        console.error("Error saving song listen", error);
    }
}


// check for recent duplicate listens
const hasRecentListen = async(videoId, userId, timeWindowHours = 1) => {
    if(!userId) return false;

    const cutoff = Timestamp.fromDate(new Date(Date.now() - timeWindowHours * 60 * 60 * 1000));
    
    try {
        const snapshot = await db
          .collection('users')
          .doc(userId)
          .collection('song_listens')
          .where('id', '==', videoId)
          .where('createdAt', '>=', cutoff)
          .limit(1)
          .get();
          
        return !snapshot.empty;

      } catch (error) {
        console.error("Error checking recent listens:", error);
        return false;
      }
}

module.exports = { saveSongListen, hasRecentListen };