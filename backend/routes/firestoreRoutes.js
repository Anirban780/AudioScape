const express = require('express');
const rateLimit = require('express-rate-limit');
const { saveSong, cacheRelatedTracks } = require('../controllers/trackController');
const { recommendSongs } = require('../controllers/recommendationController');

const router = express.Router();

// Define a rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// POST /api/songs/save - Save a song listen
router.post('/save', limiter, saveSong);
router.post('/cache-related-tracks', limiter, cacheRelatedTracks);

// POST /api/songs/recommend - Get song recommendations
router.post('/recommend', limiter, recommendSongs);

module.exports = router;