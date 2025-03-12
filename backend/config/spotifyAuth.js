const axios = require("axios");
require("dotenv").config();
let spotifyAccessToken = null;
let tokenExpirationTime = 0;

const getSpotifyAccessToken = async () => {
  const currentTime = Date.now();

  if (spotifyAccessToken && currentTime < tokenExpirationTime) {
    return spotifyAccessToken; // Return cached token if still valid
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    spotifyAccessToken = response.data.access_token;
    tokenExpirationTime = currentTime + 3600* 1000; // expire in 1 hr

    console.log("Token generated successfully")
    return spotifyAccessToken;
  } catch (error) {
    console.error("Error fetching Spotify token:", error.message);
    throw new Error("Failed to get Spotify access token.");
  }
};

module.exports = { getSpotifyAccessToken };
