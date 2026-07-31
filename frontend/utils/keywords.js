import { fetchLastPlayed } from "./api";

const FALLBACK_KEYWORDS = [
  "pop", "chill", "hip hop", "indie", "romantic",
  "electronic", "classical", "party", "lofi", "rock"
];

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const DESIRED_KEYWORDS = 10;

/**
 * Retrieves personalized explore keywords based on user's recent listening history
 * fetched from NestJS backend API, with fallback list and localStorage caching.
 */
export async function getExploreKeywords(
  userId,
  {
    cacheKey = `explore_keywords_${userId}`,
    fallbackList = FALLBACK_KEYWORDS,
    cacheExpiry = CACHE_EXPIRY_MS,
  } = {}
) {
  if (!userId) return fallbackList;

  // 1. Check local storage cache
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, keywords } = JSON.parse(raw);
      if (Date.now() - ts < cacheExpiry) return keywords;
    }
  } catch {}

  // 2. Fetch user music history from NestJS backend
  let history = [];
  try {
    history = await fetchLastPlayed(userId);
  } catch (e) {
    console.error("Error fetching listening history for keywords:", e);
  }

  // 3. Extract and categorize keywords
  const freqMap = {};
  for (const item of history) {
    const candidates = [
      ...(Array.isArray(item.genre) ? item.genre : [item.genre]).filter(Boolean),
      ...(item.keywords || []),
      ...(item.tags || []),
      item.artist,
      item.channelTitle,
    ];

    for (const word of candidates) {
      const kw = String(word || "").toLowerCase().trim();
      if (kw && kw !== "unknown" && kw !== "unknown artist") {
        freqMap[kw] = (freqMap[kw] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([kw]) => kw);
  const tail = sorted.slice(5).map(([kw]) => kw);

  const mixed = shuffleArray([...top, ...shuffleArray(tail)]).slice(0, DESIRED_KEYWORDS);
  const deduped = [...new Set(mixed)];

  const final =
    deduped.length >= DESIRED_KEYWORDS
      ? deduped.slice(0, DESIRED_KEYWORDS)
      : [...deduped, ...shuffleArray(fallbackList)].slice(0, DESIRED_KEYWORDS);

  // 4. Cache in localStorage and return
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
