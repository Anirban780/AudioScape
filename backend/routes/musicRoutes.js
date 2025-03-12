const express = require("express");
const { saveListenedTrack, getUserHistory } = require("../services/musicService.js");
const { addFavoriteTrack, removeFavoriteTrack, getFavoriteTracks } = require("../services/favoritesService.js");
const { createPlaylist, addTrackToPlaylist, getPlaylistTracks } = require("../services/playlistService.js");

const router = express.Router();


// Music History Routes
router.post("/:userId/musicHistory", async (req, res) => {
  const { userId } = req.params;
  const { track } = req.body;
  await saveListenedTrack(userId, track);
  res.status(200).json({ message: "Track logged successfully" });
});

router.get("/:userId/musicHistory", async (req, res) => {
  const history = await getUserHistory(req.params.userId);
  res.status(200).json(history);
});



// Favorites Routes
router.post("/:userId/favorites", async (req, res) => {
  await addFavoriteTrack(req.params.userId, req.body.track);
  res.status(200).json({ message: "Track added to favorites" });
});

router.delete("/:userId/favorites/:trackId", async (req, res) => {
  await removeFavoriteTrack(req.params.userId, req.params.trackId);
  res.status(200).json({ message: "Track removed from favorites" });
});

router.get("/:userId/favorites", async (req, res) => {
  const favorites = await getFavoriteTracks(req.params.userId);
  res.status(200).json(favorites);
});



// Playlist Routes
router.post("/:userId/playlists", async (req, res) => {
  const { playlistId, playlistName } = req.body;
  await createPlaylist(req.params.userId, playlistId, playlistName);
  res.status(200).json({ message: "Playlist created" });
});

router.post("/:userId/playlists/:playlistId/tracks", async (req, res) => {
  await addTrackToPlaylist(req.params.userId, req.params.playlistId, req.body.track);
  res.status(200).json({ message: "Track added to playlist" });
});

router.get("/:userId/playlists/:playlistId/tracks", async (req, res) => {
  const tracks = await getPlaylistTracks(req.params.userId, req.params.playlistId);
  res.status(200).json(tracks);
});



module.exports = router;