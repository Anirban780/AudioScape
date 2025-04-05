import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig"

export const getPersonalizedExploreKeywords = async(userId) => {
    if(!userId) return [];

    const historyRef = collection(db, "users", userId, "music_history");

    try {
        const snapshot = await getDocs(historyRef);
        const keywordMap = {};

        snapshot.forEach((doc) => {
            const track = doc.data();

            //count genres
            track.genre?.forEach((g) => {
                const key = g.toLowerCase();
                keywordMap[key] = (keywordMap[key] || 0) + (track.playCount || 1);
            });

            // count artist
            if (track.artist) {
                const artistKey = track.artist.toLowerCase().split(" - ")[0];
                keywordMap[artistKey] = (keywordMap[artistKey] || 0) + (track.playCount || 1);
            }
        });

        const sorted = Object.entries(keywordMap)
            .sort((a,b) => b[1] - a[1])
            .map(([keyword]) => keyword);


        const top3 = sorted.slice(0, 3);
        const remaining = sorted.slice(3);
        
        const shuffled = remaining.sort(() => 0.5 - Math.random());
        const random7 = shuffled.slice(0, 7);
        
        return [...top3, ...random7];
            
    }
    catch(error) {
        console.error("Error fetching personalized keywords: ", error);
        return [];
    }
};