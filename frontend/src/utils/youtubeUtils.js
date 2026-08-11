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
