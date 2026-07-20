const express = require('express');
const rateLimit = require('express-rate-limit');
const { saveSong, cacheRelatedTracks } = require('../controllers/trackController');
const { recommendSongs } = require('../controllers/recommendationController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Define a rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// POST /api/music/save - Save a song listen
router.post('/save', limiter, verifyToken, saveSong);
router.post('/cache-related-tracks', limiter, verifyToken, cacheRelatedTracks);

// POST /api/music/recommend - Get song recommendations
router.post('/recommend', limiter, verifyToken, recommendSongs);

module.exports = router;