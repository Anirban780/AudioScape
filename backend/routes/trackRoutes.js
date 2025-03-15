const express = require("express")
const { searchSongs, fetchTrack } = require("../controllers/trackController")

const router = express.Router();

router.get("/search", searchSongs);
router.get("/track/:videoId", fetchTrack);

module.exports = router