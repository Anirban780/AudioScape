
const { db, admin } = require("../config/firebase");
const { getTrackDetails } = require("./youtubeService");

const saveSongListen = async (videoId, userId) => {
    if (!userId) {
        console.error("User not logged in");
        return { success: false, error: "User not logged in" };
    }

    const songDetails = await getTrackDetails(videoId);
    //console.log("Fetched song details:", songDetails);

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

    try {
        await docRef.set(data);
    } catch (error) {
        console.error("Error saving related tracks cache:", error);
        throw error;
    }

}

// Fetch user's music history (latest N songs)
const fetchUserMusicHistory = async (userId, maxSongs = 100) => {
    try {
        const historyRef = db
            .collection('users')
            .doc(userId)
            .collection('music_history')
            .orderBy('lastPlayedAt', 'desc')
            .limit(maxSongs);

        const querySnapshot = await historyRef.get();
        const history = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            history.push({
                id: data.id,
                name: data.name,
                artist: data.artist,
                thumbnail: data.thumbnail,
                duration: data.duration,
                keywords: data.genre || [],
                lastPlayedAt: data.lastPlayedAt ? data.lastPlayedAt.toDate().toISOString() : null,
                playCount: data.playCount || 0,
                liked: data.liked || false,
                
            });
        });

        return history;
    } catch (error) {
        console.error("Error fetching user music history:", error);
        throw error;
    }
};

// Fetch related tracks cache
const fetchRelatedTracks = async () => {
    try {
        const relatedTracksRef = db.collection("relatedTracksCache");
        const querySnapshot = await relatedTracksRef.get();

        const relatedTracks = [];

        querySnapshot.forEach((doc) => {
            const keyword = doc.id;
            const tracks = doc.data().tracks || [];
            relatedTracks.push({ keyword, tracks }); // flatten into a single array
        });

        return relatedTracks;
    } catch (error) {
        console.error("Error fetching related tracks cache:", error);
        throw error;
    }
};


module.exports = { 
    saveSongListen, 
    saveRelatedTracks, 
    fetchUserMusicHistory, 
    fetchRelatedTracks 
};