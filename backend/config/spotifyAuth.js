require("dotenv").config();
const axios = require("axios")

let accessToken = "";
let tokenExpiresAt = 0;

//function to get or refresh the access token
const getAccessToken = async () => {
    const now = Date.now();
    if (accessToken && now < tokenExpiresAt) {
        return accessToken; // return existing token if still valid
    }

    try {
        const response = await axios.post("https://accounts.spotify.com/api/token",
            new URLSearchParams({ grant_type: "client_credentials" }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                    ).toString("base64")}`
                }
            }
        );

        accessToken = response.data.access_token;
        tokenExpiresAt = now + response.data.expires_in * 1000; //store expiration time
        return accessToken;
    }
    catch(error){
        console.error("Error fetching access token:", error);
        return null;
    }
}

module.exports = {getAccessToken};