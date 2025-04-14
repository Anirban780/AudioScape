import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const LOCAL_API_URL = "http://localhost:5000";
const PROD_API_URL = import.meta.env.VITE_PROD_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;

/**
 * Dynamically determines whether to use the local or production backend.
 */
export async function getBackendURL() {
    try {
        const response = await fetch(`${LOCAL_API_URL}/healthcheck`, { method: "GET" });
        if (response.ok) {
            console.log("Using Local Backend");
            return LOCAL_API_URL;
        }
    } catch (error) {
        console.log("Local backend not found, using Vercel Backend");
    }
    return PROD_API_URL;
}

/**
 * Saves a song listen event to Firestore through the backend.
 * @param {string} videoId - The ID of the song/video.
 */
export async function saveSongListen(videoId) {
    if (!auth.currentUser) {
        console.error("Error: User not logged in");
        return;
    }

    try {
        const token = await auth.currentUser.getIdToken();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to save song listen: ${response.status} ${response.statusText}`);
        }

        console.log("Song saved to database successfully");
    } catch (error) {
        console.error("Error saving song/track:", error);
    }
}

/**
 * Fetches the last played songs from Firestore for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - An array of the last played songs.
 */
export async function fetchLastPlayed(userId) {
    if (!userId) {
        console.warn("⚠️ User ID is missing");
        return [];
    }

    const userRef = collection(db, "users", userId, "music_history");

    const lastPlayedQuery = query(
        userRef,
        orderBy("lastPlayedAt", "desc"),
        limit(50)
    );

    try {
        const snapshot = await getDocs(lastPlayedQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching last played songs:", error);
        return [];
    }
}


export async function saveLikeSong(videoId) {
    if (!auth.currentUser) {
        console.error("⚠️ Error: User not logged in");
        return;
    }

    try {
        const token = await auth.currentUser.getIdToken();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/like`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to like song: ${response.status} ${response.statusText}`);
        }

        console.log("Song liked/disliked successfully");
    }
    catch (error) {
        console.error("Error liking/disliking song:", error);``
    }
}


/**
 * Cache related tracks to Firestore under `relatedTracksCache`
 * 
 * @param {string} keyword - Search keyword used to fetch related tracks
 * @param {Array} tracks - Raw YouTube API response items (array of tracks)
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */

export const cacheRelatedTracks = async(keyword, tracks) => {
    if (!auth.currentUser) {
        console.error("⚠️ Error: User not logged in");
        return;
    }
    
    try {
        const token = await auth.currentUser.getIdToken();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/cache-related-tracks`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ keyword, tracks })
            }
        );

        const data = await response.json();

        if(!response.ok) {
            throw new Error(data.error || 'Failed to cache related tracks');
        }
        
        console.log(`Songs with ${keyword} cached successfully`);
        return { success: true, message: data.message };
    }
    catch (error) {
        console.error('Error caching related tracks:', error);
        return { success: false, error: error.message };
      }
};


export const generateQueue = async(keyword, uid) => {
    if (!auth.currentUser) {
        console.error("⚠️ Error: User not logged in");
        return;
    }
    
    try {
        const token = await auth.currentUser.getIdToken();
        const API_URL = await getBackendURL();

        const response = await fetch(`${API_URL}/api/music/generate-queue`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ keyword, uid }),
            }
        );

        if(!response.ok) {
            throw new Error("Failed to generate queue");
        }

        const data = await response.json();
        console.log(data.queue);
        return data.queue;
    }
    catch (err) {
        console.error("Queue generation error:", err);
        return [];
    }
};
