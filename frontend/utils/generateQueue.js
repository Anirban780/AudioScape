import { db } from "../firebase/firebaseConfig"; // adjust to your path
import { collection, doc, getDoc, getDocs, orderBy, limit, query } from "firebase/firestore";
import { getRecommendations } from "./api"; // your fallback recommender


const shuffleAndPick = (arr, count) => {
    const shuffled = [...arr];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const picked = [];
    const usedArtists = new Set();

    for (const track of shuffled) {
        const artistKey = track.artist?.toLowerCase().trim() || "unknown";
        if (!usedArtists.has(artistKey) || picked.length >= count - 2) {
            picked.push(track);
            usedArtists.add(artistKey);
        }
        if (picked.length === count) break;
    }

    return picked;
};


export const generateQueue = async (keyword, uid, currentTrack) => {
    if (!uid || !currentTrack) return [];

    try {
        let allRelated = [];

        // ✅ Fallback: use getRecommendations if keyword is empty
        if (keyword && keyword.trim() !== "") {
            const keywordDocRef = doc(db, "relatedTracksCache", keyword);
            const keywordDocSnap = await getDoc(keywordDocRef);

            if (keywordDocSnap.exists()) {
                const data = keywordDocSnap.data();
                allRelated = data.tracks || [];
            }
        } else {
            // Fallback to general recommendations
            allRelated = await getRecommendations(15);
        }

        // ✅ Fetch user's recent listening history
        const historyRef = collection(db, "users", uid, "music_history");
        const historyQuery = query(historyRef, orderBy("lastPlayedAt", "desc"), limit(20));
        const recentSnap = await getDocs(historyQuery);

        const allRecent = [];
        const recentTrackIds = new Set();

        recentSnap.forEach(doc => {
            const track = doc.data();
            allRecent.push(track);
            recentTrackIds.add(track.id);
        });

        // Filter related
        const filteredRelated = allRelated.filter(
            track => track.id !== currentTrack.id && !recentTrackIds.has(track.id)
        );

        // Shuffle
        const shuffledRelated = shuffleAndPick(filteredRelated, filteredRelated.length);
        const shuffledRecent = shuffleAndPick(allRecent, allRecent.length);

        // Count allocation
        let relatedCount = Math.min(6, shuffledRelated.length);
        let recentCount = Math.min(4, shuffledRecent.length);

        if (relatedCount < 6) {
            const extra = 6 - relatedCount;
            recentCount = Math.min(4 + extra, shuffledRecent.length);
        } else if (recentCount < 4) {
            const extra = 4 - recentCount;
            relatedCount = Math.min(6 + extra, shuffledRelated.length);
        }

        const usedIds = new Set([currentTrack.id]);
        const finalRelated = [];
        const finalRecent = [];

        for (const track of shuffledRelated) {
            if (!usedIds.has(track.id)) {
                usedIds.add(track.id);
                finalRelated.push(track);
                if (finalRelated.length === relatedCount) break;
            }
        }

        for (const track of shuffledRecent) {
            if (!usedIds.has(track.id)) {
                usedIds.add(track.id);
                finalRecent.push(track);
                if (finalRecent.length === recentCount) break;
            }
        }

        const queue = [currentTrack, ...finalRelated, ...finalRecent];
        return queue;

    } catch (err) {
        console.error("Error generating queue:", err);
        return [currentTrack]; // fallback to just current if error occurs
    }
};
