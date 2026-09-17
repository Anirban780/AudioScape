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
 * Safely checks if a URL belongs to a target domain or its subdomains.
 */
export function isMatchingDomain(urlStr?: string | null, targetDomain?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string' || !targetDomain) return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const domain = targetDomain.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

/**
 * Checks if a URL points to a recognized YouTube or ytimg domain.
 */
export function isYouTubeDomain(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'ytimg.com' ||
      host.endsWith('.ytimg.com') ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtu.be' ||
      host.endsWith('.youtu.be')
    );
  } catch {
    return false;
  }
}

/**
 * Checks if a URL points to Unsplash.
 */
export function isUnsplashUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return host === 'unsplash.com' || host.endsWith('.unsplash.com');
  } catch {
    return false;
  }
}

/**
 * Dynamically transforms YouTube thumbnail URLs containing blocked domains (e.g. 'i.ytimg.com')
 * into configurable alternative domains (e.g. 'img.youtube.com') using URL host parsing.
 *
 * @param originalUrl - Raw YouTube thumbnail URL string or null/undefined
 * @returns Sanitized URL string or original input if inapplicable
 */
export function getValidThumbnailUrl(originalUrl?: string | null): string | null | undefined {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }

  try {
    const parsed = new URL(originalUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN || host.endsWith(`.${BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN}`)) {
      parsed.hostname = TARGET_YOUTUBE_THUMBNAIL_DOMAIN;
      return parsed.toString();
    }
  } catch {
    // If not a valid URL (e.g. relative path), return untouched
  }

  return originalUrl;
}

export function isValidYouTubeId(id?: string | null): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id.trim());
}

/**
 * Extract an 11-character YouTube video ID from a URL or string.
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:vi\/|v=|vi=|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Transforms any YouTube thumbnail URL into its HIGHEST available Ultra HD resolution tier (maxresdefault.jpg).
 * Uses extracted 11-character videoId or replaces standard resolution suffixes.
 *
 * @param originalUrl - Raw YouTube thumbnail URL string or null/undefined
 * @param videoId - Optional YouTube Video ID fallback
 * @returns Ultra HD sanitized thumbnail URL string or original input if inapplicable
 */
export function getHighResThumbnailUrl(originalUrl?: string | null, videoId?: string | null): string | null | undefined {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }

  const id = videoId || extractYouTubeId(originalUrl);
  if (id && isValidYouTubeId(id)) {
    return `https://${TARGET_YOUTUBE_THUMBNAIL_DOMAIN}/vi/${id}/maxresdefault.jpg`;
  }

  let target = originalUrl;
  if (isYouTubeDomain(target)) {
    target = target.replace(/\/default\.jpg|\/mqdefault\.jpg|\/hqdefault\.jpg|\/sddefault\.jpg|\/hq720\.jpg/, '/maxresdefault.jpg');
  }

  return getValidThumbnailUrl(target);
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#x27;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#x2F;': '/',
  '&#47;': '/',
};

const HTML_ENTITY_REGEX = /&(?:quot|#39|apos|#x27|amp|lt|gt|#x2F|#47);/g;

/**
 * Decodes common HTML entities returned by the YouTube Data API in a single pass to prevent double-unescaping.
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text || typeof text !== 'string') return text || '';
  return text.replace(HTML_ENTITY_REGEX, (match) => HTML_ENTITY_MAP[match] || match);
}
