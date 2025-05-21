import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Cache config
const CACHE_KEY = "personalized_explore_keywords";
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

// Fallback genres (in case user has no history)
const FALLBACK_GENRES = [
  "pop", "rock", "hip hop", "jazz", "electronic",
  "classical", "lo-fi", "indie", "trap", "dance", "anime music"
];

// Fisher-Yates shuffle
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const getPersonalizedExploreKeywords = async (userId) => {
  if (!userId) return [];

  // Check cache
  const cachedData = localStorage.getItem(CACHE_KEY);
  const now = Date.now();

  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    if (now - parsed.timestamp < CACHE_EXPIRY_MS) {
      console.log("✅ Using cached personalized keywords");
      return parsed.keywords;
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
      const count = track.playCount || 1;

      // Handle genre (string or array)
      const genres = Array.isArray(track.genre)
        ? track.genre
        : (track.genre?.split(",") || []);
      genres.forEach((g) => {
        const key = g.trim().toLowerCase();
        if (key.length >= 3) {
          keywordMap[key] = (keywordMap[key] || 0) + count;
        }
      });

      // Handle artist
      if (track.artist) {
        const artist = track.artist.toLowerCase().split(/[-|,]/)[0].trim();
        if (artist.length >= 3) {
          keywordMap[artist] = (keywordMap[artist] || 0) + count;
        }
      }
    });

    const sorted = Object.entries(keywordMap)
      .sort((a, b) => b[1] - a[1])
      .map(([keyword]) => keyword);

    const top3 = sorted.slice(0, 3);
    const random7 = shuffleArray(sorted.slice(3)).slice(0, 7);

    const keywords = [...top3, ...random7];

    // Fallback if no keywords
    const finalKeywords = keywords.length ? keywords : shuffleArray(FALLBACK_GENRES).slice(0, 10);

    // Cache the result
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: now,
        keywords: finalKeywords,
      })
    );

    return finalKeywords;
  } catch (error) {
    console.error("Error fetching personalized keywords:", error);
    return shuffleArray(FALLBACK_GENRES).slice(0, 10);
  }
};
