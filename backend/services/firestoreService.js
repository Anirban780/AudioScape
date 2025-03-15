const db = require("../config/firebase");

const getTrackFromFireStore = async (videoId) => {
    const doc = await db.collection("tracks")
                        .doc(videoId)
                        .get();

    return doc.exists ? doc.data() : null;
}

const saveTrackToFireStore = async(track) => {
    await db.collection("tracks")
            .doc(track.videoId)
            .set(track);
}

module.exports = { getTrackFromFireStore, saveTrackToFireStore }