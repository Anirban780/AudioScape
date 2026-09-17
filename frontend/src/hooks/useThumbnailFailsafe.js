import { useState, useCallback } from "react";
import {
    extractYouTubeId,
    getNextFallbackThumbnailUrl,
} from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * HOOK: THUMBNAIL FAILSAFE & RESOLUTION STEP-DOWN (useThumbnailFailsafe.js)
 * ============================================================================
 * 
 * WHAT THIS HOOK DOES:
 * Provides a robust, unified failsafe mechanism for YouTube thumbnails across
 * all playlist views (cards, hero banners, list rows, and modal dialogues).
 * 
 * CORE FEATURES:
 * 1. Automatic Graceful Step-Down:
 *    maxresdefault.jpg -> sddefault.jpg -> hqdefault.jpg -> mqdefault.jpg -> default.jpg.
 * 2. 120x90 Grey Placeholder Detection:
 *    Detects YouTube CDN's 120x90 dummy image returned on missing high-res tiers
 *    and seamlessly steps down to the next tier on onLoad.
 * 3. Zero Grey Dotted Placeholder Fallback:
 *    When all tiers fail, instead of loading the generic grey placeholder.jpg,
 *    marks the thumbnail key as 'dead'. This enables components to remove the
 *    broken image and cleanly render themed brand gradient icon stubs instead.
 * 4. Image Pre-Sanitization:
 *    filterValidThumbnails automatically discards null, empty, or placeholder.jpg URLs.
 * ============================================================================
 */
export function useThumbnailFailsafe() {
    const [deadImages, setDeadImages] = useState({});

    /**
     * Mark an image key/index as dead.
     */
    const markAsDead = useCallback((key) => {
        if (key === undefined || key === null) return;
        setDeadImages((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    }, []);

    /**
     * Checks if a thumbnail key has failed completely across all resolution tiers.
     */
    const isImageDead = useCallback(
        (key) => Boolean(deadImages[key]),
        [deadImages]
    );

    /**
     * Filters an array of thumbnail URLs, dropping nulls, dead keys, and placeholder images.
     */
    const filterValidThumbnails = useCallback(
        (thumbnails = []) => {
            if (!Array.isArray(thumbnails)) return [];
            return thumbnails.filter((thumb, idx) => {
                if (!thumb || typeof thumb !== "string") return false;
                if (thumb.includes("placeholder")) return false;
                if (deadImages[idx] || deadImages[thumb]) return false;
                return true;
            });
        },
        [deadImages]
    );

    /**
     * Handles image load events to detect YouTube 120x90 pixel placeholders.
     */
    const handleImgLoad = useCallback(
        (e, key, videoId) => {
            if (!e || !e.target) return;
            const img = e.target;

            // If the image loaded is our static placeholder, mark it as dead
            if (img.src.includes("placeholder")) {
                markAsDead(key);
                return;
            }

            // YouTube returns a 120x90 transparent/grey image when maxresdefault is missing
            if (img.naturalWidth === 120 && img.naturalHeight === 90) {
                const current = img.src;
                const id = videoId || extractYouTubeId(current);
                // Step down to next resolution tier without placeholder fallback
                const nextSrc = getNextFallbackThumbnailUrl(current, id, null);

                if (nextSrc && nextSrc !== current) {
                    img.src = nextSrc;
                } else {
                    // All resolution tiers exhausted
                    img.dataset.fallbackDone = "true";
                    markAsDead(key);
                }
            }
        },
        [markAsDead]
    );

    /**
     * Handles HTTP 404 / network errors by stepping down through resolution tiers.
     */
    const handleImgError = useCallback(
        (e, key, videoId) => {
            if (!e || !e.target) return;
            const img = e.target;

            if (img.dataset.fallbackDone || img.src.includes("placeholder")) {
                img.onerror = null;
                markAsDead(key);
                return;
            }

            const current = img.src;
            const id = videoId || extractYouTubeId(current);
            const nextSrc = getNextFallbackThumbnailUrl(current, id, null);

            if (nextSrc && nextSrc !== current) {
                img.src = nextSrc;
            } else {
                img.onerror = null;
                img.dataset.fallbackDone = "true";
                markAsDead(key);
            }
        },
        [markAsDead]
    );

    return {
        deadImages,
        markAsDead,
        isImageDead,
        filterValidThumbnails,
        handleImgLoad,
        handleImgError,
    };
}

export default useThumbnailFailsafe;
