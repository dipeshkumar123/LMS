// routes/lessonActions.js
const express = require('express');
const { markLessonComplete, submitQuiz } = require('../controllers/progressController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);
// Apply authorize middleware specific to Learner role for these actions
router.use(authorize('Learner'));

// Route for marking non-quiz lessons complete
router.post('/:lessonId/complete', markLessonComplete);

// Route for submitting quiz answers
router.post('/:lessonId/quiz', submitQuiz);

module.exports = router;