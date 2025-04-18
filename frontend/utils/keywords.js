import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Define constants for cache management
const CACHE_KEY = "personalized_explore_keywords";
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

export const getPersonalizedExploreKeywords = async (userId) => {
  if (!userId) return [];

  // Check if the data is already in cache
  const cachedData = localStorage.getItem(CACHE_KEY);
  const now = Date.now();

  if (cachedData) {
    const parsedCache = JSON.parse(cachedData);

    // If the cache is not expired, return the cached data
    if (now - parsedCache.timestamp < CACHE_EXPIRY_MS) {
      console.log("✅ Using cached personalized keywords");
      return parsedCache.keywords;
    } else {
      console.log("⏰ Cache expired. Fetching new keywords...");
    }
  }

  const historyRef = collection(db, "users", userId, "music_history");

  try {
    const snapshot = await getDocs(historyRef);
    const keywordMap = {};

    snapshot.forEach((doc) => {
      const track = doc.data();

      // Count genres
      track.genre?.forEach((g) => {
        const key = g.toLowerCase();
        keywordMap[key] = (keywordMap[key] || 0) + (track.playCount || 1);
      });

      // Count artist
      if (track.artist) {
        const artistKey = track.artist.toLowerCase().split(" - ")[0];
        keywordMap[artistKey] = (keywordMap[artistKey] || 0) + (track.playCount || 1);
      }
    });

    const sorted = Object.entries(keywordMap)
      .sort((a, b) => b[1] - a[1])
      .map(([keyword]) => keyword);

    const top3 = sorted.slice(0, 3);
    const remaining = sorted.slice(3);

    // Randomly shuffle the remaining keywords
    const shuffled = remaining.sort(() => 0.5 - Math.random());
    const random7 = shuffled.slice(0, 7);

    // Combine top 3 and 7 random keywords
    const keywords = [...top3, ...random7];

    // Cache the data with a timestamp
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: now,
        keywords,
      })
    );

    return keywords;
  } catch (error) {
    console.error("Error fetching personalized keywords: ", error);
    return [];
  }
};
