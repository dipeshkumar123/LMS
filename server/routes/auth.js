// routes/auth.js
const express = require('express');
const { login, logout, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // We'll create this next

const router = express.Router();

// Public route for login
router.post('/login', login);

// Private routes (require authentication via 'protect' middleware)
router.get('/logout', protect, logout); // Protect logout route
router.get('/current-user', protect, getCurrentUser); // Protect current user route

module.exports = router;