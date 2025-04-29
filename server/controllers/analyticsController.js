// controllers/analyticsController.js
const UserProgress = require('../models/UserProgress');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');


// @desc    Get progress overview for the logged-in user for a specific course
// @route   GET /api/analytics/user/course/:courseId
// @access  Private (Learner)
exports.getUserCourseAnalytics = asyncHandler(async (req, res, next) => {
    const userId = req.session.user.id;
    const { courseId } = req.params;

    const course = await Course.findById(courseId).select('title modules certificationCriteria'); // Get needed course info
    if (!course) return next(new ErrorResponse(`Course not found: ${courseId}`, 404));

    // Fetch user's global info (points/badges)
    const user = await User.findById(userId).select('points badges');
    // Fetch course progress
    const progress = await UserProgress.findOne({ user: userId, course: courseId });

    // Calculate total lessons for percentage (could be pre-calculated on Course model)
    let totalLessons = 0;
    if (course.modules && course.modules.length > 0) {
         const lessonCounts = await Promise.all(course.modules.map(modId => Lesson.countDocuments({ module: modId })));
         totalLessons = lessonCounts.reduce((sum, count) => sum + count, 0);
    }

    // Prepare response structure
    const analyticsData = {
        courseId: courseId.toString(),
        courseTitle: course.title,
        completionRate: 0,
        lessonsCompleted: 0,
        totalLessons: totalLessons,
        quizScores: {},
        certified: progress?.certified || false,
        hasCertificationCriteria: !!course.certificationCriteria,
        points: user?.points || 0,
        // Populate badge objects - requires fetching badge definitions or storing them here
        // Simplified: just send badge IDs for now, frontend can use /gamification/badges
        badges: user?.badges || [],
    };

    if (progress && progress.lessonStatusMap) {
        const completedLessons = Array.from(progress.lessonStatusMap.values()).filter(s => s.completed).length;
        analyticsData.lessonsCompleted = completedLessons;
        analyticsData.completionRate = totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(1) : 0;

        // Extract quiz scores (requires lesson lookup or denormalized title)
        const quizScores = {};
        for (const [lessonIdStr, status] of progress.lessonStatusMap.entries()) {
             if (status.score !== undefined) { // Assumes score only exists for quizzes
                 // Fetch lesson title - Inefficient! Denormalize or fetch all lessons beforehand.
                 // const lesson = await Lesson.findById(lessonIdStr).select('title');
                 quizScores[lessonIdStr] = {
                     // title: lesson?.title || 'Quiz', // Needs efficient lookup
                     score: status.score,
                     total: status.total,
                     scorePercent: status.scorePercent
                 };
             }
        }
         analyticsData.quizScores = quizScores;
    }

    res.status(200).json({ success: true, data: analyticsData });
});


// --- Placeholder for Instructor/Admin Analytics ---

// @desc    Get aggregated overview analytics for a specific course
// @route   GET /api/analytics/course/:courseId/overview
// @access  Private (Instructor, Administrator)
exports.getCourseOverviewAnalytics = asyncHandler(async (req, res, next) => {
    // TODO: Implement aggregation pipeline in MongoDB to calculate:
    // - Total enrolled (requires enrollment tracking)
    // - Total completed/certified
    // - Average completion rate
    // - Average score across quizzes in the course
    logger.warn(`Endpoint /api/analytics/course/:courseId/overview not fully implemented.`);
    res.status(501).json({ success: false, message: 'Course overview analytics not implemented.' });
});

// @desc    Get detailed progress for a specific user in a specific course
// @route   GET /api/analytics/user/:userId/course/:courseId
// @access  Private (Instructor, Administrator)
exports.getUserCourseDetailAnalytics = asyncHandler(async (req, res, next) => {
    // TODO: Fetch UserProgress for the given userId/courseId.
    // Populate lesson titles, user name etc.
    // Format data similar to the getUserCourseAnalytics but potentially with more detail.
     logger.warn(`Endpoint /api/analytics/user/:userId/course/:courseId not fully implemented.`);
    res.status(501).json({ success: false, message: 'Detailed user course analytics not implemented.' });
});