const express = require('express');
const rateLimit = require('express-rate-limit');
const { saveSong, likeSong, cacheRelatedTracks, generateQueue } = require('../controllers/trackController');

const router = express.Router();

// Define a rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// POST /api/songs/save - Save a song listen
router.post('/save', limiter, saveSong);
router.post('/like', limiter, likeSong);
router.post('/cache-related-tracks', limiter, cacheRelatedTracks);
router.post('/generate-queue', limiter, generateQueue);

module.exports = router;