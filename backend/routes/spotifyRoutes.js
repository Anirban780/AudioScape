const express = require("express")
const { searchTrack, getTrackDetails } = require("../services/spotifyService")

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

module.exports= router;