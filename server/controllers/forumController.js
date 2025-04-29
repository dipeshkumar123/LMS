// controllers/forumController.js
const ForumPost = require('../models/ForumPost');
const Module = require('../models/Module');
const User = require('../models/User'); // For points/badges
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { POINTS, BADGES, awardPoints, awardBadge } = require('../utils/gamification');


// @desc    Get all forum posts for a specific module
// @route   GET /api/modules/:moduleId/forum
// @access  Private
exports.getForumPosts = asyncHandler(async (req, res, next) => {
    const moduleId = req.params.moduleId;

    // Optional: Check if module exists? Might not be needed if just fetching posts.
    // const moduleExists = await Module.findById(moduleId).select('_id');
    // if (!moduleExists) return next(new ErrorResponse(`Module not found: ${moduleId}`, 404));

    const posts = await ForumPost.find({ module: moduleId })
                                 .sort({ createdAt: -1 }) // Get newest first
                                 .populate('user', 'name'); // Populate user's name (might already have userName denormalized)

    res.status(200).json({
        success: true,
        count: posts.length,
        data: posts
    });
});


// @desc    Create a new forum post for a module
// @route   POST /api/modules/:moduleId/forum
// @access  Private (All logged-in users)
exports.createForumPost = asyncHandler(async (req, res, next) => {
    const moduleId = req.params.moduleId;
    const userId = req.session.user.id;
    const userName = req.session.user.name; // Get name from session
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return next(new ErrorResponse('Post text cannot be empty.', 400));
    }

    // 1. Find the module to get course context
    const module = await Module.findById(moduleId).select('course title');
    if (!module) {
        return next(new ErrorResponse(`Module not found with id ${moduleId}`, 404));
    }
    const courseId = module.course;

    // 2. Create the post
    const post = await ForumPost.create({
        user: userId,
        userName: userName, // Denormalized name
        course: courseId,
        module: moduleId,
        text: text.trim()
    });

    // 3. Award Gamification (First post check)
    // Count user's *previous* posts to see if this is the first one
    const previousPostCount = await ForumPost.countDocuments({ user: userId, _id: { $ne: post._id } }); // Count posts NOT including the one just created
    if (previousPostCount === 0) {
        const pointsAwarded = POINTS.FORUM_POST;
        await User.findByIdAndUpdate(userId, { $inc: { points: pointsAwarded } });
        logger.info(`[Gamification] User ${userId} awarded ${pointsAwarded} points for first forum post`);
        await awardBadge(userId, 'FIRST_FORUM_POST'); // awardBadge handles checking if already owned
    } else {
         // Optional: Award minor points for subsequent posts?
         // await User.findByIdAndUpdate(userId, { $inc: { points: 1 } });
    }

    // 4. Log MCP Event
     logger.mcp(userId, courseId.toString(), 'forum_post', {
         moduleId: moduleId.toString(),
         postId: post._id.toString(),
         postLength: post.text.length
     });

    // 5. Send Response (return the created post)
    // Populate user name just in case session name wasn't up-to-date (though unlikely here)
    const populatedPost = await post.populate('user', 'name');

    res.status(201).json({
        success: true,
        data: populatedPost
    });
});