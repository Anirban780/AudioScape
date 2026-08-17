import placeholder from "@/assets/placeholder.jpg";

/**
 * ============================================================================
 * UTILITY: YOUTUBE THUMBNAIL DOMAIN SANITIZER & FALLBACK HANDLER
 * ============================================================================
 * 
 * TODO: TEMPORARY BYPASS FOR ENDPOINT WEB FILTERING
 * Bitdefender and certain security software block requests to 'i.ytimg.com'.
 * This utility dynamically rewrites YouTube thumbnail URLs to an alternative
 * unblocked domain ('img.youtube.com') during data fetching or UI rendering.
 * 
 * Centralized Thumbnail Fallback:
 * Manages HTTP errors and YouTube's 120x90 gray broken image response in ONE place.
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
 * Helper to check if a string is a valid 11-character YouTube Video ID.
 */
export function isValidYouTubeId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{11}$/.test(id.trim());
}

/**
 * Converts any standard YouTube thumbnail URL (mqdefault, hqdefault, default)
 * into its highest available HD resolution tier (hqdefault).
 * 
 * @param {string} url - Original thumbnail URL
 * @param {string} videoId - YouTube Video ID fallback
 * @returns {string|null} High-res YouTube thumbnail URL with sanitized domain, or null
 */
export function getHighResThumbnailUrl(url, videoId) {
  let target = url;
  if (!target && videoId && isValidYouTubeId(videoId)) {
    target = `https://${TARGET_YOUTUBE_THUMBNAIL_DOMAIN}/vi/${videoId}/hqdefault.jpg`;
  } else if (typeof target === "string" && (target.includes("ytimg.com") || target.includes("youtube.com"))) {
    target = target
      .replace("/default.jpg", "/hqdefault.jpg")
      .replace("/mqdefault.jpg", "/hqdefault.jpg")
      .replace("/maxresdefault.jpg", "/hqdefault.jpg")
      .replace("/sddefault.jpg", "/hqdefault.jpg");
  } else if (!target) {
    return null;
  }
  return getValidThumbnailUrl(target);
}

/**
 * Ordered YouTube CDN thumbnail resolution tiers for graceful error degradation.
 */
const RESOLUTION_TIERS = [
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
 * @param {string} placeholderAsset - Fallback placeholder image asset
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

  if (currentTierIndex !== -1 && currentTierIndex < RESOLUTION_TIERS.length - 1 && isValidYouTubeId(videoId)) {
    const nextTier = RESOLUTION_TIERS[currentTierIndex + 1];
    return `https://${domain}/vi/${videoId}/${nextTier}`;
  }

  return placeholderAsset;
}

/**
 * Decodes standard HTML entities in song titles (e.g., &quot; -> ", &#39; -> ', &amp; -> &).
 *
 * @param {string} text - Raw text string with potential HTML entities
 * @returns {string} Decoded clean text string
 */
export function decodeHtmlEntities(text) {
  if (!text || typeof text !== "string") return text || "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Centralized onLoad handler to detect YouTube's 120x90 gray broken image artifact.
 * When detected, automatically replaces src with local placeholder.jpg.
 *
 * @param {Event} e - Image load event
 */
export function handleThumbnailLoad(e) {
  if (!e || !e.target) return;
  if (e.target.naturalWidth === 120 && e.target.naturalHeight === 90 && !e.target.src.includes("placeholder")) {
    e.target.onerror = null;
    e.target.src = placeholder;
  }
}

/**
 * Centralized onError handler for YouTube thumbnail degradation & fallback.
 * Step-downs: hqdefault -> mqdefault -> default -> placeholder.jpg
 *
 * @param {Event} e - Image error event
 * @param {string} videoId - Optional YouTube Video ID
 */
export function handleThumbnailError(e, videoId) {
  if (!e || !e.target) return;
  const current = e.target.src;
  if (current.includes("placeholder") || e.target.dataset.fallbackDone) {
    e.target.onerror = null;
    return;
  }
  const nextSrc = getNextFallbackThumbnailUrl(current, videoId, placeholder);
  if (!nextSrc || nextSrc === current || nextSrc === placeholder) {
    e.target.onerror = null;
    e.target.dataset.fallbackDone = "true";
    e.target.src = placeholder;
  } else {
    e.target.src = nextSrc;
  }
}



