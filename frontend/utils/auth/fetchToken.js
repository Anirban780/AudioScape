/*Token Management Hook (fetchToken.js)
Handles fetching and refreshing Spotify API tokens.*/

import { useEffect, useState } from "react";
import axios from "axios";

const useSpotifyToken = () => {
  const [token, setToken] = useState(() => localStorage.getItem("spotify_token") || "");

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/spotify/token`);
        const newToken = response.data.accessToken;
        
        setToken(newToken);
        localStorage.setItem("spotify_token", newToken);
        console.log("Token fetched successfully");
      } catch (error) {
        console.error("Error fetching Spotify token:", error);
      }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 3500 * 1000);
    return () => clearInterval(interval);
  }, []);

  return token;
};

export default useSpotifyToken;
