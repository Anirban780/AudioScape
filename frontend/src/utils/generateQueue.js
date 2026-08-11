import { getRecommendations, fetchLastPlayed } from "./api";

/**
 * Shuffles an array and selects up to `count` items with artist diversity.
 */
const shuffleAndPick = (arr, count) => {
    const shuffled = [...arr];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const picked = [];
    const usedArtists = new Set();

    for (const track of shuffled) {
        const artistKey = (track.artist || track.channelTitle)?.toLowerCase().trim() || "unknown";
        if (!usedArtists.has(artistKey) || picked.length >= count - 2) {
            picked.push(track);
            usedArtists.add(artistKey);
        }
        if (picked.length === count) break;
    }

    return picked;
};

/**
 * Dynamically generates a playback queue composed of AI recommendations
 * and user recent listening history via NestJS backend services.
 */
export const generateQueue = async (keyword, uid, currentTrack) => {
    if (!currentTrack) return [];

    try {
        // Fetch recommendations from NestJS recommendation engine
        const allRelated = await getRecommendations(15);

        // Fetch user's recent listening history from NestJS backend
        const allRecent = uid ? await fetchLastPlayed(uid) : [];
        const recentTrackIds = new Set(allRecent.map((t) => t.id || t.videoId));

        const currentTrackId = currentTrack.id || currentTrack.videoId;

        // Filter related tracks to exclude current track and recent listens
        const filteredRelated = allRelated.filter((track) => {
            const trackId = track.id || track.videoId;
            return trackId !== currentTrackId && !recentTrackIds.has(trackId);
        });

        // Shuffle candidate sets
        const shuffledRelated = shuffleAndPick(filteredRelated, filteredRelated.length);
        const shuffledRecent = shuffleAndPick(allRecent, allRecent.length);

        // Count allocation logic
        let relatedCount = Math.min(6, shuffledRelated.length);
        let recentCount = Math.min(4, shuffledRecent.length);

        if (relatedCount < 6) {
            const extra = 6 - relatedCount;
            recentCount = Math.min(4 + extra, shuffledRecent.length);
        } else if (recentCount < 4) {
            const extra = 4 - recentCount;
            relatedCount = Math.min(6 + extra, shuffledRelated.length);
        }

        const usedIds = new Set([currentTrackId]);
        const finalRelated = [];
        const finalRecent = [];

        for (const track of shuffledRelated) {
            const trackId = track.id || track.videoId;
            if (!usedIds.has(trackId)) {
                usedIds.add(trackId);
                finalRelated.push(track);
                if (finalRelated.length === relatedCount) break;
            }
        }

        for (const track of shuffledRecent) {
            const trackId = track.id || track.videoId;
            if (!usedIds.has(trackId)) {
                usedIds.add(trackId);
                finalRecent.push(track);
                if (finalRecent.length === recentCount) break;
            }
        }

        return [currentTrack, ...finalRelated, ...finalRecent];
    } catch (err) {
        console.error("Error generating queue:", err);
        return [currentTrack]; // Fallback to current track on error
    }
};
