// routes/gamification.js
const express = require('express');
const { getLeaderboard, getBadgeDefinitions } = require('../controllers/gamificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All gamification routes require login
router.use(protect);

router.get('/leaderboard', getLeaderboard);
router.get('/badges', getBadgeDefinitions);

module.exports = router;