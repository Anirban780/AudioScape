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

/**
 * Safely checks if a URL belongs to a target domain or its subdomains.
 */
export function isMatchingDomain(urlStr, targetDomain) {
  if (!urlStr || typeof urlStr !== "string" || !targetDomain) return false;
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
export function isYouTubeDomain(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "ytimg.com" ||
      host.endsWith(".ytimg.com") ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".youtu.be")
    );
  } catch {
    return false;
  }
}

export function getValidThumbnailUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") {
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
    // If not a parseable URL, return untouched
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
  } else if (typeof target === "string" && isYouTubeDomain(target)) {
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

  const domain = isMatchingDomain(currentSrc, TARGET_YOUTUBE_THUMBNAIL_DOMAIN)
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

const HTML_ENTITY_MAP = {
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&#x27;": "'",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&#x2F;": "/",
  "&#47;": "/",
};

const HTML_ENTITY_REGEX = /&(?:quot|#39|apos|#x27|amp|lt|gt|#x2F|#47);/g;

export function decodeHtmlEntities(text) {
  if (!text || typeof text !== "string") return text || "";
  return text.replace(HTML_ENTITY_REGEX, (match) => HTML_ENTITY_MAP[match] || match);
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
