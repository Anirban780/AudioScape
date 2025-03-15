const { searchTrack, getTrackDetails } = require("../services/youtubeService")
const { getTrackFromFireStore, saveTrackToFireStore } = require("../services/firestoreService")

const searchSongs = async(req, res) => {
    try {
        const query = req.query.query;
        if(!query)
            return res.status(400).json({ error: "Query is required" });

        const results = await searchTrack(query);
        res.json(results);
    }
    catch(error){
        res.status(500).json({ error: "Error fetching search results" })
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


module.exports = { searchSongs, fetchTrack }