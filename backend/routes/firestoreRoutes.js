const express = require('express');
const { saveSong, likeSong } = require('../controllers/trackController');

const router = express.Router();


// POST /api/songs/save - Save a song listen
router.post('/save', saveSong);
router.post('/like', likeSong);

module.exports = router;