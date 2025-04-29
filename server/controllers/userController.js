// controllers/userController.js
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const ForumPost = require('../models/ForumPost');
// TODO: Add other models that might contain user references (e.g., Enrollments)
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Administrator)
exports.getUsers = asyncHandler(async (req, res, next) => {
    // Add pagination later if needed
    const users = await User.find().select('-password'); // Exclude password explicitly
    res.status(200).json({ success: true, count: users.length, data: users });
});


// @desc    Delete own user account and associated data
// @route   DELETE /api/users/me
// @access  Private (Own user)
exports.deleteMyAccount = asyncHandler(async (req, res, next) => {
    const userId = req.session.user.id;
    const username = req.session.user.username;

    logger.warn(`DATA DELETION INITIATED for user ${userId} (${username})`);

    // --- Perform Deletion (Use transactions in a real DB for atomicity) ---
    // 1. Delete User Document
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
         // Should not happen if protect middleware worked, but safety check
         logger.error(`Attempted to delete non-existent user: ${userId}`);
         // Don't tell client user doesn't exist, just that delete failed
         return next(new ErrorResponse('Failed to delete account.', 500));
    }
    logger.info(`Deleted User document for ${userId}`);

    // 2. Delete related data (progress, submissions, posts)
    // These can run in parallel
    const progressDeletion = UserProgress.deleteMany({ user: userId });
    const submissionDeletion = AssignmentSubmission.deleteMany({ user: userId });
    const postDeletion = ForumPost.deleteMany({ user: userId });
    // Add deletion for other related collections here (e.g., Enrollments)

    await Promise.all([progressDeletion, submissionDeletion, postDeletion]);
    logger.info(`Deleted associated progress, submissions, posts for user ${userId}`);

    // 3. Destroy Session (should happen AFTER data deletion attempt)
     req.session.destroy((err) => {
        if (err) {
            logger.error(`Session destruction error after data deletion for ${userId}:`, err);
            // Send success but warn about session issue
             return res.status(200).json({ success: true, message: 'Account data deleted, but logout may have failed. Please clear cookies.' });
        }
        res.clearCookie('connect.sid');
        logger.info(`Logout successful after data deletion for ${username}`);
        res.status(200).json({ success: true, message: `Account and associated data deleted successfully.` });
    });
});

// TODO: Add controllers for Get User by ID, Update User Profile etc.