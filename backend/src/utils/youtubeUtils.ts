/**
 * ============================================================================
 * UTILITY: YOUTUBE THUMBNAIL DOMAIN SANITIZER (BACKEND)
 * ============================================================================
 * 
 * TODO: TEMPORARY BYPASS FOR ENDPOINT WEB FILTERING
 * Bitdefender and specific web security filtering rules block requests to 'i.ytimg.com'.
 * This utility dynamically rewrites YouTube thumbnail URLs to an alternative
 * unblocked domain ('img.youtube.com') when fetching tracks/playlists/history
 * before returning responses to the view/client.
 * 
 * Clean Architecture Notice:
 * Database records in PostgreSQL retain their raw original URLs untouched.
 * Do NOT use this function when persisting records to the database.
 * ============================================================================
 */

/**
 * Configurable replacement domain for YouTube thumbnails.
 * Modify this constant to update the target CDN host if needed.
 */
export const TARGET_YOUTUBE_THUMBNAIL_DOMAIN = 'img.youtube.com';

/**
 * Blocked YouTube thumbnail host domain.
 */
export const BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN = 'i.ytimg.com';

/**
 * Dynamically transforms YouTube thumbnail URLs containing blocked domains (e.g. 'i.ytimg.com')
 * into configurable alternative domains (e.g. 'img.youtube.com').
 *
 * @param originalUrl - Raw YouTube thumbnail URL string or null/undefined
 * @returns Sanitized URL string or original input if inapplicable
 */
export function getValidThumbnailUrl(originalUrl?: string | null): string | null | undefined {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }

  if (originalUrl.includes(BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN)) {
    return originalUrl.replace(BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN, TARGET_YOUTUBE_THUMBNAIL_DOMAIN);
  }

  return originalUrl;
}
