import placeholder from "@/assets/placeholder.jpg";

/**
 * ============================================================================
 * UTILITY: YOUTUBE THUMBNAIL DOMAIN SANITIZER & ULTRA HIGH-RES RESOLUTION HANDLER
 * ============================================================================
 * 
 * Centralized High-Res Resolution Tier:
 * 1. maxresdefault.jpg (1920x1080 / 1280x720 Ultra HD)
 * 2. sddefault.jpg     (640x480 Standard Def)
 * 3. hqdefault.jpg     (480x360 High Def)
 * 4. mqdefault.jpg     (320x180 Medium Def)
 * 5. default.jpg       (120x90 Small)
 * ============================================================================
 */

export const TARGET_YOUTUBE_THUMBNAIL_DOMAIN = "img.youtube.com";
export const BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN = "i.ytimg.com";

/**
 * Ordered YouTube CDN thumbnail resolution tiers for graceful error degradation.
 */
export const RESOLUTION_TIERS = [
  "maxresdefault.jpg",
  "sddefault.jpg",
  "hqdefault.jpg",
  "mqdefault.jpg",
  "default.jpg",
];

export function getValidThumbnailUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") {
    return originalUrl;
  }

  if (originalUrl.includes(BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN)) {
    return originalUrl.replace(BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN, TARGET_YOUTUBE_THUMBNAIL_DOMAIN);
  }

  return originalUrl;
}

export function isValidYouTubeId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{11}$/.test(id.trim());
}

/**
 * Extract an 11-character YouTube video ID from a URL or string.
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/(?:vi\/|v=|vi=|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Converts any YouTube thumbnail URL into its highest universally available High Def resolution tier (hqdefault.jpg, 480x360).
 * Unlike maxresdefault.jpg or sddefault.jpg (which frequently 404 for music videos and non-1080p uploads),
 * hqdefault.jpg is guaranteed by YouTube CDN to exist for 100% of processed videos with 0 network 404 errors.
 * 
 * @param {string} url - Original thumbnail URL
 * @param {string} videoId - YouTube Video ID fallback
 * @returns {string|null} High Def YouTube thumbnail URL with sanitized domain, or null
 */
export function getHighResThumbnailUrl(url, videoId) {
  let target = url;
  const id = videoId || extractYouTubeId(url);
  
  if (id && isValidYouTubeId(id)) {
    target = `https://${TARGET_YOUTUBE_THUMBNAIL_DOMAIN}/vi/${id}/hqdefault.jpg`;
  } else if (typeof target === "string" && (target.includes("ytimg.com") || target.includes("youtube.com"))) {
    target = target
      .replace(/\/default\.jpg|\/mqdefault\.jpg|\/sddefault\.jpg/, "/hqdefault.jpg");
  } else if (!target) {
    return null;
  }
  return getValidThumbnailUrl(target);
}

/**
 * Declarative resolution step-down helper for image error handling.
 * Step-downs: maxresdefault -> sddefault -> hqdefault -> mqdefault -> default -> placeholder.jpg
 */
export function getNextFallbackThumbnailUrl(currentSrc, videoId, placeholderAsset) {
  if (!currentSrc || typeof currentSrc !== "string") {
    return placeholderAsset;
  }

  const domain = currentSrc.includes(TARGET_YOUTUBE_THUMBNAIL_DOMAIN)
    ? TARGET_YOUTUBE_THUMBNAIL_DOMAIN
    : BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN;

  const id = videoId || extractYouTubeId(currentSrc);
  const currentTierIndex = RESOLUTION_TIERS.findIndex((tier) => currentSrc.includes(tier));

  if (currentTierIndex !== -1 && currentTierIndex < RESOLUTION_TIERS.length - 1 && isValidYouTubeId(id)) {
    const nextTier = RESOLUTION_TIERS[currentTierIndex + 1];
    return `https://${domain}/vi/${id}/${nextTier}`;
  }

  return placeholderAsset;
}

export function decodeHtmlEntities(text) {
  if (!text || typeof text !== "string") return text || "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/");
}

export function handleThumbnailLoad(e) {
  if (!e || !e.target) return;
  const current = e.target.src || "";
  // YouTube CDN returns a 120x90 grey camera dummy image when maxresdefault / sddefault does not exist.
  // We only step down if the request was for a higher-res tier (maxresdefault, sddefault, hqdefault).
  // A native default.jpg has 120x90 dimensions legitimately, so never treat default.jpg as an error.
  const isHigherTier = current.includes("maxresdefault") || current.includes("sddefault") || current.includes("hqdefault");
  if (e.target.naturalWidth === 120 && e.target.naturalHeight === 90 && !current.includes("placeholder") && isHigherTier) {
    const videoId = extractYouTubeId(current);
    const nextSrc = getNextFallbackThumbnailUrl(current, videoId, placeholder);
    e.target.src = nextSrc;
  }
}

export function handleThumbnailError(e, videoId) {
  if (!e || !e.target) return;
  const current = e.target.src;
  if (current.includes("placeholder") || e.target.dataset.fallbackDone) {
    e.target.onerror = null;
    return;
  }
  const id = videoId || extractYouTubeId(current);
  const nextSrc = getNextFallbackThumbnailUrl(current, id, placeholder);
  if (!nextSrc || nextSrc === current || nextSrc === placeholder) {
    e.target.onerror = null;
    e.target.dataset.fallbackDone = "true";
    e.target.src = placeholder;
  } else {
    e.target.src = nextSrc;
  }
}
