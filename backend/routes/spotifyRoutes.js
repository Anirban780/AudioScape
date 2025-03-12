const express = require("express")
const { searchTrack, getTrackDetails, getTrendingTracks } = require("../services/spotifyService")
const { searchTrackController, trackDetailsController, recommendedTracksController } = require("../controllers/spotifyController")
const router = express.Router();

//route to search for a track
router.get("/search", async(req, res) => {
    try{
        const {query} = req.query;
        const tracks = await  searchTrack(query);
        res.json(tracks);
    }
    catch(error){
        res.status(500).json({ error: error.message });
    }
});

//route to get track details by id
router.get("/track/:id", async(req, res) => {
    try{
        const trackDetails =- await getTrackDetails(req.params.id);
        res.json(trackDetails);
    }
    catch(error){
        res.status(500).json({ error: error.message });
    }
});


router.get("/search", searchTrackController);
router.get("/track/:id", trackDetailsController);
router.get("/recommendations", recommendedTracksController);


router.get("/trending", async(req, res) => {
    try {
        const tracks = await getTrendingTracks()
        res.join(tracks);
    }
    catch(error){
        console.error("Error fetching Spotify trending tracks:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch trending tracks" });
    }
})


module.exports= router;