// routes/users.js
const express = require('express');
const { getUsers, deleteMyAccount } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require login
router.use(protect);

// Admin route to get all users
router.get('/', authorize('Administrator'), getUsers);

// Route for user to delete their own account
router.delete('/me', deleteMyAccount); // 'protect' is already applied via router.use()

// TODO: Add routes like GET /:id, PUT /me (update profile), etc.

module.exports = router;