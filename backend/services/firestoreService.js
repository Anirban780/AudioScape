const { db, admin } = require("../config/firebase");
const { getTrackDetails } = require("./youtubeService");

const saveSongListen = async (videoId, userId) => {
    if (!userId) {
        console.error("User not logged in");
        return { success: false, error: "User not logged in" };
    }

    const songDetails = await getTrackDetails(videoId);
    console.log("Fetched song details:", songDetails);

    if (!songDetails) {
        console.error("Song details not found for videoId:", videoId);
        return { success: false, error: "Song details not found" };
    }

    const userRef = db.collection("users").doc(userId);
    const listensRef = userRef.collection("music_history");
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
        // Check if the song already exists in the user's history
        const existingSongQuery = await listensRef.where("id", "==", videoId).limit(1).get();

        if (!existingSongQuery.empty) {
            // Update lastPlayedAt and increment playCount for an existing song
            const songDoc = existingSongQuery.docs[0].ref;
            await songDoc.update({
                lastPlayedAt: now,
                playCount: admin.firestore.FieldValue.increment(1),
            });
            console.log(`Updated lastPlayedAt and incremented playCount for ${songDetails.title}`);
            return { success: true, message: "Song listen updated" };
        }

        // If song is not in history, add it with initial playCount and liked flag
        const songData = {
            id: songDetails.videoId,
            name: songDetails.title,
            artist: songDetails.channelTitle,
            duration: songDetails.duration,
            thumbnail: songDetails.thumbNail,
            genre: songDetails.genre, // fetch genre from YouTube API
            lastPlayedAt: now,
            playCount: 1,
            liked: false, // default value; update if user likes the track
        };

        await listensRef.add(songData);
        console.log(`Added new song to history: ${songDetails.title}`);
        return { success: true, message: "Song listen saved" };

    } catch (error) {
        console.error("Error saving song listen:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Toggle the "like" status for a song in the user's history,
 * and update the global like counter for the song.
 * 
 * @param {string} videoId - The YouTube video ID of the song.
 * @param {string} userId - The ID of the current user.
 * @returns {Object} Result object with success flag and liked status.
 */

const toggleSongLike = async (videoId, userId) => {
    if (!userId) {
        console.error("User not logged in");
        return { success: false, error: "User not logged in" };
    }

    // check if the song exists in the user'history
    const userRef = db.collection("users").doc(userId);
    const historyRef = userRef.collection("music_history");

    try {
        const snapshot = await historyRef.where("id", "==", videoId).limit(1).get();

        if (snapshot.empty) {
            console.error("Song not found in user's history. User must listen to the song first for few seconds.");
            return { success: false, error: "Song not found in user's history" };
        }

        // get the document reference and currnet liked status
        const songDoc = snapshot.docs[0].ref;
        const data = snapshot.docs[0].data();
        const currentLiked = data.liked || false;
        const newLiked = !currentLiked;

        // toggle the liked flag in user's history
        await songDoc.update({ liked: newLiked });
        console.log(`${newLiked ? "Liked" : "Unliked"} the song: ${data.name}`);
        return { success: true, liked: newLiked };
    }
    catch (error) {
        console.error("Error toggling song like:", error);
        return { success: false, error: error.message };
    }
}


const saveRelatedTracks = async (keyword, tracks) => {
    const docRef = db.collection("relatedTracksCache")
        .doc(keyword.toLowerCase());

    const data = {
        timestamp: new Date(),
        tracks: tracks.map(track => ({
            id: track.id,
            name: track.name || "Unknown Title",
            artist: track.artist || "Unknown Artist",
            thumbnail: track.thumbnail,
            duration: track.duration || 'PTOS',
            genre: track.genre || [],
            channelId: track.channelId || "Unknown channel ID",
        }))
    };

    await docRef.set(data);
}

module.exports = { saveSongListen, toggleSongLike, saveRelatedTracks };
