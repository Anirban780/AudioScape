import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Define constants for cache management
const CACHE_KEY = "personalized_explore_keywords";
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

// Define generic tags to be filtered out
const GENERIC_TAGS = new Set([
  "official", "music", "video", "audio", "hd", "4k", "mv", "lyrics", "lyric", "song",
  "track", "version", "live", "remix", "ft", "feat", "featuring", "prod", "producer",
  "dj", "band", "group", "album", "ep", "single", "cover", "visualizer", "exclusive",
  "new", "latest", "original", "throwback", "classic", "old", "today", "now", "top",
  "us", "uk", "india", "global", "worldwide", "vevo", "records", "label", "official site",
  "youtube", "youtube music", "subscribe", "like", "share", "comment", "download",
  "stream", "link", "bio", "full", "out now", "presave", "premiere", "remastered"
]);

// Predefined list of music genres
const PREDEFINED_GENRES = [
  "pop", "rock", "jazz", "hip hop", "classical", "blues", "reggae", "electronic",
  "country", "indie", "r&b", "metal", "punk", "folk", "funk", "soul", "ambient", "disco", "trap",
  "dancehall", "house", "techno", "drum and bass", "synthwave", "lo-fi", "chill", "dance", "anime"
  // Add more genres as necessary
];

// Helper function to clean tags
const cleanTags = (tags) => {
  const cleanedTags = [];

  tags.forEach((tag) => {
    const cleanedTag = tag.toLowerCase().trim();

    // Skip if the tag is too short or is a generic tag
    if (cleanedTag.length < 3 || GENERIC_TAGS.has(cleanedTag)) {
      return;
    }

    // If it's a genre or meaningful tag, keep it
    if (PREDEFINED_GENRES.includes(cleanedTag)) {
      cleanedTags.push(cleanedTag);
    }
  });

  // Return only unique cleaned tags
  return Array.from(new Set(cleanedTags));
};

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

      // Clean and count genres from the track data
      track.genre?.forEach((g) => {
        const key = g.toLowerCase();
        if (key.length >= 3 && !GENERIC_TAGS.has(key)) {
          keywordMap[key] = (keywordMap[key] || 0) + (track.playCount || 1);
        }
      });

      // Clean and count artist (if applicable)
      if (track.artist) {
        const artistKey = track.artist.toLowerCase().split(" - ")[0];
        if (artistKey.length >= 3 && !GENERIC_TAGS.has(artistKey)) {
          keywordMap[artistKey] = (keywordMap[artistKey] || 0) + (track.playCount || 1);
        }
      }
    });

    // Sort keywords based on play count
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

    // Clean the final list of keywords (remove non-meaningful ones)
    const cleanedKeywords = cleanTags(keywords);

    // Cache the data with a timestamp
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: now,
        keywords: cleanedKeywords,
      })
    );

    return cleanedKeywords;
  } catch (error) {
    console.error("Error fetching personalized keywords: ", error);
    return [];
  }
};
