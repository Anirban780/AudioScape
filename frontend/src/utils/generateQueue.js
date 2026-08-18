import { generateQueueFromBackend } from "./api";

/**
 * ============================================================================
 * QUEUE GENERATION COMPATIBILITY WRAPPER (generateQueue.js)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Deprecated client-side queue generator wrapper that forwards calls directly to
 * NestJS backend `generateQueueFromBackend(currentTrackId, keyword)`.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Source of Truth: All queue composition logic (TF-IDF vector matching,
 *    recent listen history mixing, deduplication) is now authoritative on the NestJS backend.
 * 2. Backwards Compatibility: Preserves function signature `generateQueue(keyword, uid, currentTrack)`
 *    so existing components continue to work seamlessly.
 */

export const generateQueue = async (keyword, uid, currentTrack) => {
    if (!currentTrack) return [];
    const trackId = currentTrack.id || currentTrack.videoId;
    if (!trackId) return [currentTrack];

    try {
        const queue = await generateQueueFromBackend(trackId, keyword);
        if (Array.isArray(queue) && queue.length > 0) {
            return queue;
        }
        return [currentTrack];
    } catch (err) {
        console.error("Error delegating generateQueue to backend:", err);
        return [currentTrack];
    }
};

export default generateQueue;
