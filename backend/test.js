/*const { saveSongListen } = require("./services/firestoreService");
 // r1awikvhx3A  SZWU0VQ8rZs ZPTn5jXfLPw
const test = async () => {
    const videoId = "ZPTn5jXfLPw"; // Replace with an actual video ID
    const userId = "IaCW2sstJAV0R3x6Xdzyb1xycif2";   // Replace with an actual user ID

    try {
        await saveSongListen(videoId, userId);
        console.log("Test completed successfully.");
    } catch (error) {
        console.error("Test failed:", error);
    }
};

test();
*/

const fetch = require('node-fetch'); // If using Node v18+, you can omit this and use global fetch
const fs = require('fs');

const API_URL = "http://localhost:5000/api/music/generate-queue"; // your backend URL

const tokenPath = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg1NzA4MWNhOWNiYjM3YzIzNDk4ZGQzOTQzYmYzNzFhMDU4ODNkMjgiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiMjJVQ1MwMTkgQW5pcmJhbiBTYXJrYXIiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2RwMmFhMDNpb1RmQmdjQ1h0aW4zMDNuRVBqVWZlWExQUnRYekx0bGRSdmU5NEQzMVE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYXVkaW9zY2FwZS00OTU2NSIsImF1ZCI6ImF1ZGlvc2NhcGUtNDk1NjUiLCJhdXRoX3RpbWUiOjE3NDM5NTEzNjMsInVzZXJfaWQiOiJJYUNXMnNzdEpBVjBSM3g2WGR6eWIxeHljaWYyIiwic3ViIjoiSWFDVzJzc3RKQVYwUjN4NlhkenliMXh5Y2lmMiIsImlhdCI6MTc0NDY2MDQzNSwiZXhwIjoxNzQ0NjY0MDM1LCJlbWFpbCI6ImFtYWxhbmlyN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwMjI4MDA2MTc0MjQ4OTA5Nzg0NyJdLCJlbWFpbCI6WyJhbWFsYW5pcjdAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.NCQMPAdMHeorUKx7zAB_yWjgGCJxkNpmfCAuD2Na82BmRS-XjVwiIWtsYjY_uPQuo7yIvhxr6AXtaITmNmCnLBlXb8tKc9yd78sgHQ73CrlOI6261SZszo2C1jaGngKh0HzEUsAKq_ovpzsjOOQldSvySclOVLC937V_uotoTsMV9D5831JO8d9KjCPz7wApdk4kWyZ4xF50X9yzx3x7oGLNR7avMtfYZz5QWiGYU9MxBJiYzi-1VvmoBA85JbCR-_x6bTzDUZihWU5dfUHK0eZkSWIwKqwdgLZjcZjA9k749CUq_xugyBSjffzd81KjUbBBBnhUAdgug1FfxpXSKA"
// Dummy test data
const testData = {
  keyword: "lofi music",  // You can replace this with any test keyword
  uid: "IaCW2sstJAV0R3x6Xdzyb1xycif2"
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
  const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg1NzA4MWNhOWNiYjM3YzIzNDk4ZGQzOTQzYmYzNzFhMDU4ODNkMjgiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiMjJVQ1MwMTkgQW5pcmJhbiBTYXJrYXIiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2RwMmFhMDNpb1RmQmdjQ1h0aW4zMDNuRVBqVWZlWExQUnRYekx0bGRSdmU5NEQzMVE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYXVkaW9zY2FwZS00OTU2NSIsImF1ZCI6ImF1ZGlvc2NhcGUtNDk1NjUiLCJhdXRoX3RpbWUiOjE3NDM5NTEzNjMsInVzZXJfaWQiOiJJYUNXMnNzdEpBVjBSM3g2WGR6eWIxeHljaWYyIiwic3ViIjoiSWFDVzJzc3RKQVYwUjN4NlhkenliMXh5Y2lmMiIsImlhdCI6MTc0NDY2MDQzNSwiZXhwIjoxNzQ0NjY0MDM1LCJlbWFpbCI6ImFtYWxhbmlyN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwMjI4MDA2MTc0MjQ4OTA5Nzg0NyJdLCJlbWFpbCI6WyJhbWFsYW5pcjdAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.NCQMPAdMHeorUKx7zAB_yWjgGCJxkNpmfCAuD2Na82BmRS-XjVwiIWtsYjY_uPQuo7yIvhxr6AXtaITmNmCnLBlXb8tKc9yd78sgHQ73CrlOI6261SZszo2C1jaGngKh0HzEUsAKq_ovpzsjOOQldSvySclOVLC937V_uotoTsMV9D5831JO8d9KjCPz7wApdk4kWyZ4xF50X9yzx3x7oGLNR7avMtfYZz5QWiGYU9MxBJiYzi-1VvmoBA85JbCR-_x6bTzDUZihWU5dfUHK0eZkSWIwKqwdgLZjcZjA9k749CUq_xugyBSjffzd81KjUbBBBnhUAdgug1FfxpXSKA"
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

