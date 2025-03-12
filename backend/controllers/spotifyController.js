const { searchTrack, getTrackDetails, getRecommendedTracks } = require("../utils/spotifyService");

const searchTrackController = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Query parameter is required" });

        const tracks = await searchTrack(query);
        res.json(tracks);
    } catch (error) {
        console.error("Error searching track:", error);
        res.status(500).json({ error: "Failed to search track" });
    }
};

const trackDetailsController = async (req, res) => {
    try {
        const { id } = req.params;
        const trackDetails = await getTrackDetails(id);
        res.json(trackDetails);
    } catch (error) {
        console.error("Error fetching track details:", error);
        res.status(500).json({ error: "Failed to fetch track details" });
    }
};

const recommendedTracksController = async (req, res) => {
    try {
        const { seedTrackId } = req.query;
        if (!seedTrackId) return res.status(400).json({ error: "Seed track ID is required" });

        const recommendedTracks = await getRecommendedTracks(seedTrackId);
        res.json(recommendedTracks);
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        res.status(500).json({ error: "Failed to fetch recommended tracks" });
    }
};

module.exports = { searchTrackController, trackDetailsController, recommendedTracksController };
