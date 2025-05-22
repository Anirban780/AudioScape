import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { fetchKeywordsFromAI } from "./api"; // Adjust path as needed

const FALLBACK_KEYWORDS = [
  "pop", "chill", "hip hop", "indie", "romantic",
  "electronic", "classical", "party", "lofi", "rock"
];

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY_RECORDS = 100;

export async function getExploreKeywords(
  userId,
  {
    cacheKey = `explore_keywords_${userId}`,
    fallbackList = FALLBACK_KEYWORDS,
    cacheExpiry = CACHE_EXPIRY_MS,
  } = {}
) {
  if (!userId) return fallbackList;

  // 1. Use cached keywords if available
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, keywords } = JSON.parse(raw);
      if (Date.now() - ts < cacheExpiry) {
        return keywords;
      }
    }
  } catch {}

  // 2. Fetch user history from Firestore
  let history = [];
  try {
    const q = query(
      collection(db, "users", userId, "music_history"),
      orderBy("lastPlayedAt", "desc"),
      limit(MAX_HISTORY_RECORDS)
    );
    const snap = await getDocs(q);
    history = snap.docs.map(doc => doc.data());
  } catch (e) {
    console.error("Firestore error:", e);
  }

  // 3. Call Gemini API via helper function
  const aiKeywords = await fetchKeywordsFromAI(history);

  // 4. Mix with fallback if needed
  const final = aiKeywords.length >= 10
    ? aiKeywords.slice(0, 10)
    : [...aiKeywords, ...shuffleArray(fallbackList).slice(0, 10 - aiKeywords.length)];

  // 5. Cache the result
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), keywords: final }));
  } catch {}

  return final;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length; i > 1; i--) {
    const j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
  return a;
}
