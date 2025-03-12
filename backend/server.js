require("dotenv").config();
const express = require("express");
const cors = require("cors");
const spotifyRoutes = require("./routes/spotifyRoutes.js");
const musicRoutes = require("./routes/musicRoutes.js"); // New Routes for Music, Favorites, and Playlists
const spotifyToken = require("./routes/spotifyAuth.js")
const { db } = require("./config/firestoreConfig.js");



const app = express();
app.use(cors( { origin: "http://localhost:5173" }));
app.use(express.json());


app.use("/spotify", spotifyToken);

// Use Spotify routes
app.use("/spotify", spotifyRoutes);

// Use new routes for music history, favorites, and playlists
app.use("/users", musicRoutes);



// Test Firestore connection
app.get("/test-firestore", async (req, res) => {
  try {
    await db.collection("test").add({ message: "Firestore is connected!" });
    res.send("Firestore setup successful!");
  } catch (error) {
    res.status(500).send("Error connecting to Firestore: " + error.message);
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Audioscape Backend API! 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
