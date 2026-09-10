/**
 * ============================================================================
 * EXPLORE CURATED CATEGORIES TAXONOMY (curatedCategories.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Provides client-side access to the authoritative 33-category taxonomy shared with
 * the backend recommendations engine (`backend/src/recommendations/curated-genres.ts`).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * Eliminates taxonomy discrepancies between filter query strings (e.g. "study music",
 * "ambient focus") and user-facing section titles ("Study Focus", "Focus & Ambient").
 */

export const CURATED_CATEGORIES = [
  // 1. Mood & Lifestyle Categories
  { slug: 'lofi-chill', keyword: 'lofi music', label: 'Lofi & Chill', cluster: 'chill-lofi' },
  { slug: 'chill-beats', keyword: 'chill beats', label: 'Chill Beats', cluster: 'chill-lofi' },
  { slug: 'study-focus', keyword: 'study music', label: 'Study Focus', cluster: 'chill-lofi' },
  { slug: 'sad-songs', keyword: 'sad songs', label: 'Sad Songs', cluster: 'mood-vibe' },
  { slug: 'feel-good', keyword: 'feel good music', label: 'Feel Good', cluster: 'mood-vibe' },
  { slug: 'sleep-ambient', keyword: 'sleep music', label: 'Sleep Ambient', cluster: 'chill-lofi' },
  { slug: 'workout-energy', keyword: 'workout music', label: 'Workout Energy', cluster: 'mood-vibe' },
  { slug: 'road-trip', keyword: 'road trip music', label: 'Road Trip', cluster: 'mood-vibe' },
  { slug: 'rainy-day', keyword: 'rainy day music', label: 'Rainy Day', cluster: 'chill-lofi' },
  { slug: 'coffee-shop', keyword: 'coffee shop music', label: 'Coffee Shop', cluster: 'chill-lofi' },

  // 2. Mainstream Genres
  { slug: 'pop-hits', keyword: 'pop hits', label: 'Pop Hits', cluster: 'pop' },
  { slug: 'indie-rock', keyword: 'indie rock', label: 'Indie Rock', cluster: 'rock-alt' },
  { slug: 'hip-hop', keyword: 'hip hop', label: 'Hip Hop', cluster: 'hiphop-urban' },
  { slug: 'rnb-soul', keyword: 'r&b music', label: 'R&B & Soul', cluster: 'hiphop-urban' },
  { slug: 'electronic', keyword: 'electronic music', label: 'Electronic', cluster: 'electronic' },
  { slug: 'edm', keyword: 'edm', label: 'EDM Hits', cluster: 'electronic' },
  { slug: 'house', keyword: 'house music', label: 'House Club', cluster: 'electronic' },
  { slug: 'jazz-soul', keyword: 'jazz chill', label: 'Jazz & Soul', cluster: 'jazz-soul' },
  { slug: 'classical', keyword: 'classical music', label: 'Classical', cluster: 'classical-inst' },
  { slug: 'acoustic', keyword: 'acoustic covers', label: 'Acoustic Covers', cluster: 'rock-alt' },

  // 3. Language & Regional Hits
  { slug: 'k-pop', keyword: 'k-pop', label: 'K-Pop', cluster: 'pop' },
  { slug: 'j-pop', keyword: 'j-pop', label: 'J-Pop', cluster: 'pop' },
  { slug: 'anime-ost', keyword: 'anime music', label: 'Anime & OST', cluster: 'gaming-anime' },
  { slug: 'afrobeats', keyword: 'afrobeats', label: 'Afrobeats', cluster: 'hiphop-urban' },
  { slug: 'latin', keyword: 'latin music', label: 'Latin Hits', cluster: 'regional' },
  { slug: 'bollywood', keyword: 'bollywood songs', label: 'Bollywood', cluster: 'regional' },
  { slug: 'reggaeton', keyword: 'reggaeton', label: 'Reggaeton', cluster: 'hiphop-urban' },
  { slug: 'punjabi', keyword: 'punjabi music', label: 'Punjabi Hits', cluster: 'regional' },

  // 4. Trend-Driven Categories
  { slug: 'phonk', keyword: 'phonk music', label: 'Phonk', cluster: 'hiphop-urban' },
  { slug: 'hyperpop', keyword: 'hyperpop', label: 'Hyperpop', cluster: 'pop' },
  { slug: 'bedroom-pop', keyword: 'bedroom pop', label: 'Bedroom Pop', cluster: 'pop' },
  { slug: 'tiktok-viral', keyword: 'tiktok songs 2026', label: 'TikTok Viral', cluster: 'viral-trends' },
  { slug: 'viral-hits', keyword: 'viral songs', label: 'Viral Hits', cluster: 'viral-trends' },
  { slug: 'y2k', keyword: 'y2k playlist', label: 'Y2K Retro', cluster: 'viral-trends' },

  // 5. Functional & Instrumental
  { slug: 'piano-chill', keyword: 'piano music', label: 'Piano Chill', cluster: 'classical-inst' },
  { slug: 'guitar-relax', keyword: 'guitar instrumental', label: 'Guitar Instrumental', cluster: 'classical-inst' },
  { slug: 'ambient-focus', keyword: 'ambient music', label: 'Focus & Ambient', cluster: 'classical-inst' },
  { slug: 'video-game', keyword: 'video game music', label: 'Video Game OST', cluster: 'gaming-anime' },

  // 6. Throwbacks
  { slug: 'throwback-2000s', keyword: '2000s throwback', label: '2000s Throwback', cluster: 'throwback' },
  { slug: 'throwback-90s', keyword: '90s hits', label: '90s Hits', cluster: 'throwback' },
  { slug: 'retro-hits', keyword: 'retro music', label: 'Retro Hits', cluster: 'throwback' },
];

/**
 * Resolves any arbitrary query string, label, or slug into its canonical category taxonomy item.
 *
 * @param {string} str - Query string, label, or slug
 * @returns {Object|null} Matching category item or null
 */
export function resolveCategory(str) {
  if (!str || typeof str !== 'string') return null;
  const lower = str.toLowerCase().trim();

  return (
    CURATED_CATEGORIES.find(
      (c) =>
        c.slug.toLowerCase() === lower ||
        c.keyword.toLowerCase() === lower ||
        c.label.toLowerCase() === lower
    ) || null
  );
}

/**
 * Checks if a section matches the currently active explore category filter.
 * Uses canonical taxonomy resolution to guarantee zero false-positive matches (e.g. Study Focus vs Focus & Ambient).
 *
 * @param {Object} section - Section object with { title, category, keyword }
 * @param {string} filter - Active category filter (e.g. "All", "study music", "Study Focus")
 * @returns {boolean} True if section belongs to this filter
 */
export function matchesCategory(section, filter) {
  if (!section || !filter || filter === 'All') return true;

  const f = filter.toLowerCase().trim();
  const secTitle = (section.title || '').toLowerCase().trim();
  const secCat = (section.category || '').toLowerCase().trim();
  const secKw = (section.keyword || '').toLowerCase().trim();

  // 1. Direct equality match
  if (secTitle === f || secCat === f || secKw === f) return true;

  // 2. Canonical taxonomy resolution
  const resolvedFilter = resolveCategory(filter);
  const resolvedSec =
    resolveCategory(section.title) ||
    resolveCategory(section.keyword) ||
    resolveCategory(section.category);

  if (resolvedFilter && resolvedSec) {
    return resolvedFilter.slug === resolvedSec.slug;
  }

  if (resolvedFilter) {
    return (
      secTitle === resolvedFilter.label.toLowerCase() ||
      secKw === resolvedFilter.keyword.toLowerCase() ||
      secCat === resolvedFilter.slug.toLowerCase()
    );
  }

  if (resolvedSec) {
    return (
      f === resolvedSec.label.toLowerCase() ||
      f === resolvedSec.keyword.toLowerCase() ||
      f === resolvedSec.slug.toLowerCase()
    );
  }

  // 3. Fallback normalized slug comparison
  const slugify = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  if (
    slugify(secTitle) === slugify(f) ||
    slugify(secKw) === slugify(f) ||
    slugify(secCat) === slugify(f)
  ) {
    return true;
  }

  return false;
}
