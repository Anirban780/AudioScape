/*API Utility (spotifyApi.js)
Handles all Spotify API requests efficiently.
 */

import axios from "axios";

/**
 * Fetch new album releases from Spotify.
 * @param {string} accessToken - Spotify API access token.
 * @returns {Promise<Array>} - List of newly released albums.
 */
export const fetchNewReleases = async (accessToken) => {
  if (!accessToken) {
    console.error("No access token available.");
    return [];
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/browse/new-releases`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 10 }, // Fetch latest 10 albums
    });

    return response.data?.albums?.items || [];
  } catch (error) {
    console.error("Error fetching new releases:", error.response?.data || error.message);
    return [];
  }
};
