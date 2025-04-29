// routes/forums.js
const express = require('express');
const { getForumPosts, createForumPost } = require('../controllers/forumController');
const { protect } = require('../middleware/authMiddleware');

// Create a router with mergeParams: true
// This allows accessing parameters defined in parent routers (like :moduleId from the module router)
const router = express.Router({ mergeParams: true });

// Apply protect middleware to all forum routes
router.use(protect);

// Define routes relative to the parent module route
router.route('/')
    .get(getForumPosts)     // GET /api/modules/:moduleId/forum
    .post(createForumPost);  // POST /api/modules/:moduleId/forum

// TODO: Add routes for specific posts if needed later (e.g., PUT/DELETE /:postId)

module.exports = router;