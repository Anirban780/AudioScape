/**
 * ============================================================================
 * UTILITY: YOUTUBE THUMBNAIL DOMAIN SANITIZER
 * ============================================================================
 * 
 * TODO: TEMPORARY BYPASS FOR ENDPOINT WEB FILTERING
 * Bitdefender and certain security software block requests to 'i.ytimg.com'.
 * This utility dynamically rewrites YouTube thumbnail URLs to an alternative
 * unblocked domain ('img.youtube.com') during data fetching or UI rendering.
 * 
 * Clean Architecture Notice:
 * Database records and stored entities retain their original raw URLs untouched.
 * Do NOT use this utility to overwrite persistent database records.
 * ============================================================================
 */

/**
 * Configurable target domain for rewriting YouTube thumbnail URLs.
 * Modify or update this constant if alternative CDN domains are required.
 */
export const TARGET_YOUTUBE_THUMBNAIL_DOMAIN = "img.youtube.com";

/**
 * Known blocked YouTube thumbnail domain.
 */
export const BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN = "i.ytimg.com";

/**
 * Dynamically rewrites YouTube thumbnail URLs from blocked domains (e.g., 'i.ytimg.com')
 * to configured alternative domains (e.g., 'img.youtube.com').
 *
 * @param {string|null|undefined} originalUrl - The original YouTube thumbnail URL
 * @returns {string|null|undefined} Sanitized thumbnail URL with updated domain, or original if inapplicable
 */
export function getValidThumbnailUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") {
    return originalUrl;
  }

  if (originalUrl.includes(BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN)) {
    return originalUrl.replace(BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN, TARGET_YOUTUBE_THUMBNAIL_DOMAIN);
  }

  return originalUrl;
}

/**
 * Converts any standard YouTube thumbnail URL (mqdefault, hqdefault, default)
 * into its highest available HD resolution tier (maxresdefault or sddefault).
 * 
 * @param {string} url - Original thumbnail URL
 * @param {string} videoId - YouTube Video ID fallback
 * @returns {string} High-res YouTube thumbnail URL with sanitized domain
 */
export function getHighResThumbnailUrl(url, videoId) {
  let target = url;
  if (!target && videoId) {
    target = `https://${TARGET_YOUTUBE_THUMBNAIL_DOMAIN}/vi/${videoId}/maxresdefault.jpg`;
  } else if (typeof target === "string" && (target.includes("ytimg.com") || target.includes("youtube.com"))) {
    target = target
      .replace("/default.jpg", "/maxresdefault.jpg")
      .replace("/mqdefault.jpg", "/maxresdefault.jpg")
      .replace("/hqdefault.jpg", "/maxresdefault.jpg")
      .replace("/sddefault.jpg", "/maxresdefault.jpg");
  }
  return getValidThumbnailUrl(target);
}

/**
 * Ordered YouTube CDN thumbnail resolution tiers for graceful error degradation.
 */
const RESOLUTION_TIERS = [
  "maxresdefault.jpg",
  "sddefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
  "default.jpg",
];

/**
 * Declarative resolution step-down helper for image error handling.
 * Eliminates nested if/else statements in component render methods.
 *
 * @param {string} currentSrc - Current failing image src URL
 * @param {string} videoId - YouTube Video ID fallback
 * @param {string} placeholder - Fallback placeholder image asset
 * @returns {string} Next lower resolution thumbnail URL or placeholder
 */
export function getNextFallbackThumbnailUrl(currentSrc, videoId, placeholderAsset) {
  if (!currentSrc || typeof currentSrc !== "string") {
    return placeholderAsset;
  }

  const domain = currentSrc.includes(TARGET_YOUTUBE_THUMBNAIL_DOMAIN)
    ? TARGET_YOUTUBE_THUMBNAIL_DOMAIN
    : BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN;

  const currentTierIndex = RESOLUTION_TIERS.findIndex((tier) => currentSrc.includes(tier));

  if (currentTierIndex !== -1 && currentTierIndex < RESOLUTION_TIERS.length - 1) {
    const nextTier = RESOLUTION_TIERS[currentTierIndex + 1];
    return `https://${domain}/vi/${videoId}/${nextTier}`;
  }

  return placeholderAsset;
}


