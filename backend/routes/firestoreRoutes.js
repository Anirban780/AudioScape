const express = require('express');
const { saveSong, likeSong, cacheRelatedTracks, generateQueue } = require('../controllers/trackController');

const router = express.Router();


// POST /api/songs/save - Save a song listen
router.post('/save', saveSong);
router.post('/like', likeSong);
router.post('/cache-related-tracks', cacheRelatedTracks);
router.post('/generate-queue', generateQueue);

module.exports = router;