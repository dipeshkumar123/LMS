// routes/assignments.js
const express = require('express');
const { submitAssignment } = require('../controllers/progressController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect and authorize middleware for Learner role
router.use(protect);
router.use(authorize('Learner'));

// Route for submitting an assignment linked to a module
router.post('/:moduleId/submit', submitAssignment);

// Future: Add routes for instructors/admins to view/grade submissions
// router.get('/:moduleId/submissions', protect, authorize('Instructor', 'Administrator'), viewSubmissions);
// router.put('/submissions/:submissionId/grade', protect, authorize('Instructor', 'Administrator'), gradeSubmission);


module.exports = router;