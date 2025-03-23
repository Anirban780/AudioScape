const { searchTrack, getTrackDetails } = require("../services/youtubeService")
const { saveSongListen } = require("../services/firestoreService")
const { admin } = require('../config/firebase')

const searchSongs = async(req, res) => {
    const { query, pageToken } = req.query;
    if (!query) return res.status(400).json({ error: "Query parameter is required" });

    try {
        const data = await searchTrack(query, pageToken);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch search results" });
    }
}

const fetchTrack = async (req, res) => {
    try {
        const { videoId } = req.params;
        const track = await getTrackDetails(videoId);
        
        console.log("Track fetched successfully")
        res.json(track || { error: "Track not found" });
    } catch (error) {
        res.status(500).json({ error: "Error fetching track details" });
    }
};

// Controller to save a song listen
const saveSong = async(req, res) => {
    const { videoId } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if(!videoId) 
        return res.status(400).json({ error: "Video ID is required" });

    if(!token)
        return res.status(401).json({ error: "Authorization token is required" });

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const result = await saveSongListen(videoId, userId);
        if (result) {
            res.status(201).json({ message: "Song listen saved successfully" , data: result });
        }
        else {
            res.status(200).json({ message: 'Duplicate listen detected, skipped' });
        }
     }
     catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { searchSongs, fetchTrack, saveSong }