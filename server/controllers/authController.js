// controllers/authController.js
const User = require('../models/User'); // Import the User model
const asyncHandler = require('../middleware/asyncHandler'); // We'll create this helper next
const { ErrorResponse } = require('../utils/errorResponse'); // We'll create this helper later

// @desc    Login user
// @route   POST /api/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    console.log('[DEBUG] Login attempt - Request body:', { 
        username: req.body.username,
        hasPassword: !!req.body.password 
    });

    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        console.log('[DEBUG] Login failed - Missing credentials');
        return next(new ErrorResponse('Please provide a username and password', 400));
    }

    // Find user by username, explicitly select the password field which is normally hidden
    const user = await User.findOne({ username }).select('+password');
    console.log('[DEBUG] Database query result:', { 
        userFound: !!user,
        username: username
    });

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401)); // Use generic message for security
    }

    // Check if password matches using the method defined in User model
    const isMatch = await user.matchPassword(password);
    console.log('[DEBUG] Password match result:', { isMatch });

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401)); // Use generic message
    }

    // Password matched, create session
    sendTokenResponse(user, 200, req, res);
});

// @desc    Log user out / clear session
// @route   GET /api/logout
// @access  Private (requires user to be logged in to log out)
exports.logout = asyncHandler(async (req, res, next) => {
    const username = req.session.user?.username; // Get username before destroying session

    req.session.destroy((err) => {
        if (err) {
            console.error("[ERROR] Session destruction error:", err); // Keep console error for server logs
            // Avoid sending detailed error back in this case, just indicate failure
            return next(new ErrorResponse('Could not log out, please try again.', 500));
        }

        res.clearCookie('connect.sid'); // Default session cookie name for express-session
        console.log(`[INFO] Logout successful: ${username || 'User (session missing?)'}`);
        res.status(200).json({ success: true, message: 'Logout successful' });
    });
});

// @desc    Get current logged in user
// @route   GET /api/current-user
// @access  Private
exports.getCurrentUser = asyncHandler(async (req, res, next) => {
    // Session middleware should have populated req.session.user if logged in
    // checkAuth middleware (added to route later) ensures this runs only if authenticated
    if (req.session.user) {
        // Optionally fetch fresh user data from DB if needed (e.g., updated points/badges)
        // const user = await User.findById(req.session.user.id); // Fetch full user doc if needed
        // if (!user) return next(new ErrorResponse('User not found', 404));
        // For now, just return the session data which should be sufficient
        res.status(200).json({ success: true, user: req.session.user });
    } else {
         // This case should technically be caught by auth middleware, but good defense
         return next(new ErrorResponse('Not authorized', 401));
    }
});


// Helper function to create session and send response
const sendTokenResponse = (user, statusCode, req, res) => {
    // Create session data (store only necessary, non-sensitive info)
    req.session.user = {
        id: user._id.toString(), // Convert ObjectId to string
        username: user.username,
        role: user.role,
        name: user.name,
         // Include points/badges count directly for easy header display? Optional.
        // points: user.points,
        // badgesCount: user.badges.length
    };

     // Session is automatically saved by express-session middleware on response end

    console.log(`[INFO] Login successful, session created for: ${user.username} (${user.role})`);

    // Send back user info (excluding password) and success message
    res.status(statusCode).json({
        success: true,
        // Return necessary user details (do not include password hash!)
         user: {
             id: user._id.toString(),
             username: user.username,
             role: user.role,
             name: user.name,
             points: user.points, // Send points/badges needed for initial UI update
             badgesCount: user.badges.length
         },
        message: 'Login successful'
    });
};