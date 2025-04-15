const { searchTrack, getTrackDetails } = require("../services/youtubeService")
const { saveSongListen, toggleSongLike, saveRelatedTracks } = require("../services/firestoreService")
const { admin } = require('../config/firebase');


const db = admin.firestore();

const searchSongs = async(req, res) => {
    const { query, pageToken } = req.query;
    if (!query) return res.status(400).json({ error: "Query parameter is required" });

    try {
        const data = await searchTrack(query, pageToken);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch search results" });
    }
}

const fetchTrack = async (req, res) => {
    try {
        const { videoId } = req.params;
        const track = await getTrackDetails(videoId);
        
        console.log("Track fetched successfully")
        res.json(track || { error: "Track not found" });
    } catch (error) {
        res.status(500).json({ error: "Error fetching track details" });
    }
};

// Controller to save a song listen
const saveSong = async(req, res) => {
    const { videoId } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if(!videoId) 
        return res.status(400).json({ error: "Video ID is required" });

    if(!token)
        return res.status(401).json({ error: "Authorization token is required" });

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const result = await saveSongListen(videoId, userId);
        if (result) {
            res.status(201).json({ message: "Song listen saved successfully" , data: result });
        }
        else {
            res.status(200).json({ message: 'Duplicate listen detected, skipped' });
        }
     }
     catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const likeSong = async (req, res) => {
    const { videoId } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if(!videoId) 
        return res.status(400).json({ error: "Video ID is required" });

    if(!token)
        return res.status(401).json({ error: "Authorization token is required" });

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const result = await toggleSongLike(videoId, userId);
        if (result) {
            res.status(200).json({ message: "Song liked successfully" });
        }
        else {
            res.status(200).json({ message: 'Song is disliked. Tap again to like it' });
        }
    }
    catch (error) {
        console.error("Error in /like route:", error);
        res.status(500).json({ error: error.message });
    }
    
}


/**
 * @desc Save related tracks to Firestore under relatedTracksCache
 * @route POST /api/music/cache-related
 * @access Public (can make it protected if needed)
 */

const cacheRelatedTracks = async(req, res) => {
    try {
        const {keyword, tracks} = req.body;

        if(!keyword || !tracks || !Array.isArray(tracks)) {
            return res.status(400).json({ success: false, message: 'Keyword and valid tracks array are required'});
        }

        await saveRelatedTracks(keyword, tracks);
        return res.status(200).json({ success: true, message: `Tracks cached for keyword: ${keyword}` });
    }
    catch (error) {
        console.error("Error caching related tracks:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

const shuffleAndPick = (arr, count) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const generateQueue = async (req, res) => {
    const { keyword, uid, currentTrack } = req.body;
  
    if (!keyword || !uid) {
      return res.status(400).json({ message: "Missing keyword or uid" });
    }
  
    try {
      // Fetch related tracks for the keyword
      const keywordDocRef = db.collection("relatedTracksCache").doc(keyword);
      const keywordDoc = await keywordDocRef.get();
  
      const allRelated = keywordDoc.exists ? keywordDoc.data().tracks || [] : [];
  
      // Fetch user's recently played
      const userHistoryRef = db.collection("users").doc(uid).collection("music_history");
      const recentSnap = await userHistoryRef
        .orderBy("lastPlayedAt", "desc")
        .limit(10)
        .get();
  
      const allRecent = [];
      recentSnap.forEach(doc => allRecent.push(doc.data()));
  
      // Shuffle both lists
      const shuffledRelated = shuffleAndPick(allRelated, allRelated.length);
      const shuffledRecent = shuffleAndPick(allRecent, allRecent.length);
  
      // Try to take 5 from each
      let relatedCount = Math.min(5, shuffledRelated.length);
      let recentCount = Math.min(5, shuffledRecent.length);
  
      // Adjust if one side has fewer
      if (relatedCount < 5) {
        const extra = 5 - relatedCount;
        recentCount = Math.min(5 + extra, shuffledRecent.length);
      } else if (recentCount < 5) {
        const extra = 5 - recentCount;
        relatedCount = Math.min(5 + extra, shuffledRelated.length);
      }
  
      const queue = [
        currentTrack,
        ...shuffledRelated.slice(0, relatedCount),
        ...shuffledRecent.slice(0, recentCount),
      ];
  
      return res.status(200).json({ queue });
  
    } catch (err) {
      console.error("Queue generation failed:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };


module.exports = { 
    searchSongs, fetchTrack, saveSong, likeSong, 
    cacheRelatedTracks, generateQueue 
};