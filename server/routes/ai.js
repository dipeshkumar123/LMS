// routes/ai.js - Updated
const express = require('express');
const {
    generatePractice,
    suggestActivity,
    predictRisk,
    suggestNextStep // Import new controller function
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect); // Protect all AI routes

// Learner accessible routes
router.get('/practice/:lessonId', authorize('Learner'), generatePractice);
router.get('/suggest-activity/:courseId', authorize('Learner'), suggestActivity);
router.get('/adaptive/next-step/:courseId/:currentLessonId', authorize('Learner'), suggestNextStep); // New route for adaptive path

// Risk prediction (currently for self, could be admin/instructor later)
router.get('/predictive/risk', authorize('Learner'), predictRisk);

module.exports = router;