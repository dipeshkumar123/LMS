// routes/ai.js
const express = require('express');
const { generatePractice, suggestActivity, predictRisk } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All AI routes require login
router.use(protect);

// Learner accessible routes
router.get('/practice/:lessonId', authorize('Learner'), generatePractice);
router.get('/suggest-activity/:courseId', authorize('Learner'), suggestActivity);

// Potentially Instructor/Admin accessible route
// Use '/predictive/risk/:userId' if admin requests for specific user
router.get('/predictive/risk', authorize('Learner'), predictRisk); // Currently gets risk for logged-in user

module.exports = router;