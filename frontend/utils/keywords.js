import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const FALLBACK_KEYWORDS = [
  "pop", "chill", "hip hop", "indie", "romantic",
  "electronic", "classical", "party", "lofi", "rock"
];

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY_RECORDS = 100;
const DESIRED_KEYWORDS = 10;

export async function getExploreKeywords(
  userId,
  {
    cacheKey = `explore_keywords_${userId}`,
    fallbackList = FALLBACK_KEYWORDS,
    cacheExpiry = CACHE_EXPIRY_MS,
  } = {}
) {
  if (!userId) return fallbackList;

  // 1. Check cache
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, keywords } = JSON.parse(raw);
      if (Date.now() - ts < cacheExpiry) return keywords;
    }
  } catch {}

  // 2. Fetch user music history
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

  // 3. Extract and categorize keywords
  const freqMap = {};
  for (const item of history) {
    const candidates = [
      ...(Array.isArray(item.genre) ? item.genre : [item.genre]).filter(Boolean),
      ...(item.keywords || []),
      ...(item.tags || [])
    ];

    for (const word of candidates) {
      const kw = String(word).toLowerCase().trim();
      if (kw) freqMap[kw] = (freqMap[kw] || 0) + 1;
    }
  }

  const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([kw]) => kw);         // most frequent
  const tail = sorted.slice(5).map(([kw]) => kw);           // rest

  const mixed = shuffleArray([...top, ...shuffleArray(tail)]).slice(0, DESIRED_KEYWORDS);

  const deduped = [...new Set(mixed)];

  const final =
    deduped.length >= DESIRED_KEYWORDS
      ? deduped.slice(0, DESIRED_KEYWORDS)
      : [...deduped, ...shuffleArray(fallbackList)].slice(0, DESIRED_KEYWORDS);

  // 4. Cache and return
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), keywords: final }));
  } catch {}

  return final;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
