/*const { saveSongListen } = require("./services/firestoreService");
 // r1awikvhx3A  SZWU0VQ8rZs ZPTn5jXfLPw
const test = async () => {
    const videoId = ""; // Replace with an actual video ID
    const userId = "";   // Replace with an actual user ID

    try {
        await saveSongListen(videoId, userId);
        console.log("Test completed successfully.");
    } catch (error) {
        console.error("Test failed:", error);
    }
};

test();
*/

/*const fetch = require('node-fetch'); // If using Node v18+, you can omit this and use global fetch
const fs = require('fs');

const API_URL = "http://localhost:5000/api/music/generate-queue"; // your backend URL

const tokenPath = ""
// Dummy test data
const testData = {
  keyword: "lofi music",  // You can replace this with any test keyword
  uid: ""
};

async function getToken() {
  // This is just an example. Replace it with your real way of getting a Firebase token
  try {
    return fs.readFileSync(tokenPath, 'utf8').trim();
  } catch (err) {
    console.error("⚠️ Could not read token from file:", err.message);
    return null;
  }
}

async function testGenerateQueue() {
  const token = ""
  if (!token) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });

    if (!res.ok) {
      console.error(`❌ Request failed with status ${res.status}`);
      const errorData = await res.json();
      console.error("Error response:", errorData);
      return;
    }

    const data = await res.json();
    console.log("✅ Queue fetched successfully:");
    console.log(data);
  } catch (err) {
    console.error("❌ Error fetching queue:", err.message);
  }
}

testGenerateQueue();
*/

const { fetchUserMusicHistory, fetchRelatedTracks } = require('./services/firestoreService'); // <- update the correct path
const { db } = require('./config/firebase'); // <- your firebase config
const { recommendSongs } = require('./recommend');

async function testFirestoreFunctions() {
    const testUserId = 'IaCW2sstJAV0R3x6Xdzyb1xycif2'; // <-- replace with a real userId from your Firestore!

    try {
        console.log('Testing fetchUserMusicHistory...');

        const userHistory = await fetchUserMusicHistory(testUserId);
        console.log(`Fetched ${userHistory.length} songs from user's music history.`);
        //console.log(userHistory[0]);

        console.log('--------------------------------------');

        console.log('Testing fetchRelatedTracks...');

        const relatedTracks = await fetchRelatedTracks();
        console.log(`Fetched ${relatedTracks.length} related tracks from cache.`);
        //console.log(relatedTracks[0]);

        const currentTimestamp = Date.now(); // Use current timestamp for testing
        const recommendations = recommendSongs(userHistory, relatedTracks, currentTimestamp, 10);
        console.log('Recommendations:', recommendations);
        console.log('--------------------------------------');

    } catch (error) {
        console.error('Error testing Firestore functions:', error);
    } finally {
        // Optional: Close DB if needed (for Admin SDK)
        if (db && db.terminate) {
            await db.terminate();
        }
    }
}

testFirestoreFunctions();

