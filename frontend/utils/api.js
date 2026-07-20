import { collection, query, orderBy, limit, getDocs, setDoc, where } from "firebase/firestore";
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

/**
 * Fetches only liked songs directly via Firestore query filtering.
 */
export async function fetchUserLikedSongs(userId) {
    if (!userId) {
        console.warn("⚠️ User ID is missing");
        return [];
    }

    const userRef = collection(db, "users", userId, "music_history");
    const likedSongsQuery = query(
        userRef,
        where("liked", "==", true)
    );

    try {
        const snapshot = await getDocs(likedSongsQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching liked songs:", error);
        return [];
    }
}

/**
 * Saves/updates like status for a track using targeted Firestore query.
 */
export async function saveLikeSong(userId, track, liked) {
    if (!userId || !track?.id) {
        console.warn("⚠️ User ID or Video ID is missing");
        return;
    }

    try {
        const musicHistoryRef = collection(db, "users", userId, "music_history");
        const trackQuery = query(musicHistoryRef, where("id", "==", track.id), limit(1));
        const querySnapshot = await getDocs(trackQuery);

        if (querySnapshot.empty) {
            console.warn("⚠️ Track not found in music history.");
            return;
        }

        const trackDocRef = querySnapshot.docs[0].ref;
        await setDoc(trackDocRef, {
            ...track, 
            liked: liked,
        }, { merge: true });

    } catch (error) {
        console.error("Error saving like status:", error);
    }
}

/**
 * Fetches liked status for a track using targeted Firestore query.
 */
export async function fetchLikedStatus(userId, videoId) {
    if (!userId || !videoId) {
        console.warn("⚠️ User ID or track ID is missing");
        return false;
    }

    try {
        const musicHistoryRef = collection(db, "users", userId, "music_history");
        const trackQuery = query(musicHistoryRef, where("id", "==", videoId), limit(1));
        const querySnapshot = await getDocs(trackQuery);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data().liked || false;
        }
        return false;
    } catch (error) {
        console.error("Error fetching liked status:", error);
        return false;
    }
}

/**
 * Cache related tracks to Firestore under `relatedTracksCache`
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

        if (!response.ok) {
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

export const getRecommendations = async(topN) => {
    if (!auth.currentUser) {
        console.error("⚠️ Error: User not logged in");
        return;
    }
    
    try {
        const token = await auth.currentUser.getIdToken();
        const API_URL = await getBackendURL();
        const userId = auth.currentUser.uid;

        const response = await fetch(`${API_URL}/api/music/recommend`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ userId, topN }),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to fetch recommendations");
        }

        const data = await response.json();

        if (data.success) {
            console.log('Recommended Songs:', data.recommendations);
        } else {
            console.error('Error:', data.error || 'Something went wrong');
        }

        return data.recommendations;
    }
    catch (err) {
        console.error("Recommendation error:", err);
        return [];
    }
};

export async function fetchKeywordsFromAI(history = []) {
    try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
        const API_URL = await getBackendURL();
        const res = await fetch(`${API_URL}/api/extractKeywords`, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ history }),
        });

        if (res.ok) {
            const json = await res.json();
            return json.keywords || [];
        }
        else {
            console.error("Gemini API response not OK:", res.status);
        }
    }
    catch (err) {
        console.error("AI keyword fetch failed: ", err);
    }

    return [];
}
