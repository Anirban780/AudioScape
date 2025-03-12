import axios from "axios";

const BASE_URL = "https://api.spotify.com/v1";

/**
 * Fetch recommended tracks based on user's top artists or genres.
 * @param {string} accessToken - Spotify API access token.
 * @returns {Promise<Array>} - List of recommended tracks.
 */

export const fetchRecommendedTracks = async (accessToken) => {
  try {

    const response = await axios.get(`${BASE_URL}/recommendations`, {
      
        headers: { Authorization: `Bearer ${accessToken}` },
     
      params: {
        limit: 10, // Adjust based on UI needs
        seed_genres: "pop,rock,hip-hop", // You can dynamically set this
        seed_artists: "4NHQUGzhtTLFvgF5SZesLK", // Example artist ID
      },
    });

    return response.data.tracks; // Returns an array of recommended tracks
  } 
  catch (error) {
    console.error("Error fetching recommended tracks:", error);
    return [];
  }
};
