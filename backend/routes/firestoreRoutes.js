const express = require('express');
const { saveSong } = require('../controllers/trackController');

const router = express.Router();


// POST /api/songs/save - Save a song listen
router.post('/save', saveSong);

module.exports = router;