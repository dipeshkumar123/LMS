// controllers/gamificationController.js
const User = require('../models/User'); // Need User model for leaderboard
const asyncHandler = require('../middleware/asyncHandler');
const { BADGES } = require('../utils/gamificationHelpers'); // Import badge definitions

// @desc    Get global leaderboard (Top N users by points)
// @route   GET /api/gamification/leaderboard
// @access  Private (Any logged-in user)
exports.getLeaderboard = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit, 10) || 20; // Get limit from query or default to 20

    const leaderboard = await User.find({ points: { $gt: 0 } }) // Find users with points > 0
                                  .sort({ points: -1 }) // Sort descending by points
                                  .limit(limit) // Limit results
                                  .select('name username points'); // Select relevant fields

    res.status(200).json({
        success: true,
        count: leaderboard.length,
        data: leaderboard
    });
});

// @desc    Get definitions of all available badges
// @route   GET /api/gamification/badges
// @access  Private (Any logged-in user)
exports.getBadgeDefinitions = asyncHandler(async (req, res, next) => {
    // Return the BADGES constant (or fetch from DB if badges were a separate collection)
    res.status(200).json({
        success: true,
        data: Object.values(BADGES) // Return array of badge objects
    });
});