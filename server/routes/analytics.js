// routes/analytics.js
const express = require('express');
const {
    getUserCourseAnalytics,
    getCourseOverviewAnalytics,
    getUserCourseDetailAnalytics
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All analytics routes require login
router.use(protect);

// Learner specific analytics route
router.get('/user/course/:courseId', authorize('Learner'), getUserCourseAnalytics);

// Instructor/Admin routes
router.get('/course/:courseId/overview', authorize('Instructor', 'Administrator'), getCourseOverviewAnalytics);
router.get('/user/:userId/course/:courseId', authorize('Instructor', 'Administrator'), getUserCourseDetailAnalytics);


module.exports = router;