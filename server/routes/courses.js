// routes/courses.js
const express = require('express');
const {
    getCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
} = require('../controllers/courseController');

// Include other resource routers if nesting (e.g., modules within courses)
// const moduleRouter = require('./modules');

const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');

// --- Nested Routes ---
// Re-route into other resource routers if needed
// Example: router.use('/:courseId/modules', moduleRouter);

// --- Main Course Routes ---
router.route('/')
    .get(protect, getCourses) // All logged-in users can get course list
    .post(protect, authorize('Administrator', 'Instructor'), createCourse); // Only Admins/Instructors can create

router.route('/:courseId')
    .get(protect, getCourse) // All logged-in users can get details of a specific course
    .put(protect, authorize('Administrator', 'Instructor'), updateCourse) // Need ownership check in controller
    .delete(protect, authorize('Administrator', 'Instructor'), deleteCourse); // Need ownership check in controller

module.exports = router;