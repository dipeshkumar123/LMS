// routes/modules.js
const express = require('express');

// Import resource routers
const forumRouter = require('./forums'); // Import the forum router

const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
// Import module controller if you add routes like GET /:moduleId, POST /, etc.
// const { getModule, createModule, updateModule, deleteModule } = require('../controllers/moduleController');

// --- Mount other resource routers ---
// Any request going to /api/modules/:moduleId/forum will be handled by forumRouter
router.use('/:moduleId/forum', forumRouter);

// --- Module Specific Routes (Add later if needed) ---
// Example:
// router.route('/')
//     .post(protect, authorize('Instructor', 'Administrator'), createModule); // Requires course context passed in body or param?
// router.route('/:moduleId')
//     .get(protect, getModule)
//     .put(protect, authorize('Instructor', 'Administrator'), updateModule) // Check ownership
//     .delete(protect, authorize('Instructor', 'Administrator'), deleteModule); // Check ownership

module.exports = router;