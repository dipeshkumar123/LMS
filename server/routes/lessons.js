// routes/lessons.js
const express = require('express');
const { markLessonComplete, submitQuiz } = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true }); // Allow params from parent routers if nested

// Routes specific to lesson interactions
router.post('/:lessonId/complete', protect, authorize('Learner'), markLessonComplete);
router.post('/:lessonId/quiz', protect, authorize('Learner'), submitQuiz);

// GET /api/lessons/:lessonId - Could add a route to get single lesson details if needed
// router.get('/:lessonId', protect, getLesson); // Controller needed

module.exports = router;