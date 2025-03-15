const express = require("express");
const router = express.Router();
const { getSpotifyAccessToken } = require("../config/spotifyAuth");

router.get("/token", async (req, res) => {
  try {
    const token = await getSpotifyAccessToken(); // Fetch from backend function
    res.json({ accessToken: token });
  } catch (error) {
    console.error("Error fetching Spotify token:", error.message);
    res.status(500).json({ error: "Failed to get token" });
  }
});

module.exports = router;
