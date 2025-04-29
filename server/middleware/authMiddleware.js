// middleware/authMiddleware.js
const asyncHandler = require('./asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse'); // Will create this utility next

// Protect routes - check if user is logged in via session
exports.protect = asyncHandler(async (req, res, next) => {
    if (req.session && req.session.user && req.session.user.id) {
        // Session exists and has user info, proceed
        // Optional: Could verify user still exists in DB here, but might add overhead.
        // req.user = await User.findById(req.session.user.id); // Example if fetching full user needed
        // if (!req.user) return next(new ErrorResponse('User not found, session invalid', 401));
        next();
    } else {
        // No session or user data in session
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// Grant access to specific roles
// Usage: router.get('/someAdminRoute', protect, authorize('Administrator'), someController);
// Usage: router.post('/instructorAction', protect, authorize('Instructor', 'Administrator'), someController);
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Assumes protect middleware has already run and req.session.user exists
        if (!req.session.user || !req.session.user.role) {
             // Should not happen if protect is used first, but safeguard
             return next(new ErrorResponse('User role not found in session', 500));
        }

        if (!roles.includes(req.session.user.role)) {
            return next(
                new ErrorResponse(
                    `User role '${req.session.user.role}' is not authorized to access this route`,
                    403 // Forbidden
                )
            );
        }
        next(); // Role is authorized
    };
};