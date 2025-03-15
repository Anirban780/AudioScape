const axios = require("axios");
const { getSpotifyAccessToken } = require("../config/spotifyAuth");

//search for a track
const searchTrack = async(query) => {
    if(!query)  throw new Error("Query parameter is required");

    const token = await getSpotifyAccessToken();
    const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

    return response.data.tracks.items;
}

//get track details
const getTrackDetails = async(id) => {
    const token = await getAccessToken();
    const response = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return response.data;
}


module.exports = { 
    searchTrack, 
    getTrackDetails, 
}