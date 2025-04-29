// server.js - Refactored for Modularity & DB Connection

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Store sessions in MongoDB
const connectDB = require('./config/db'); // DB connection function
const { ErrorResponse } = require('./utils/errorResponse'); // Custom error class
const logger = require('./utils/logger'); // Simple logger (we'll create this)

// Load env vars
dotenv.config(); // Loads variables from .env file

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/auth');
// Import other route files as we create them
const courseRoutes = require('./routes/courses');
const lessonActionRoutes = require('./routes/lessonActions'); // Import lesson action routes
const assignmentRoutes = require('./routes/assignments'); // Import assignment routes
const lessonRoutes = require('./routes/lessons'); // Import lesson routes
const moduleRoutes = require('./routes/modules'); // Import module routes
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const gamificationRoutes = require('./routes/gamification');

const app = express();

// Body parser middleware
app.use(express.json()); // Replace bodyParser.json()
app.use(express.urlencoded({ extended: true })); // Replace bodyParser.urlencoded()

// Session middleware configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    store: MongoStore.create({ // Store session in MongoDB
        mongoUrl: process.env.MONGO_URI,
        // mongoOptions: { useUnifiedTopology: true }, // Optional: driver options
        collectionName: 'sessions' // Optional: Name of the sessions collection
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        httpOnly: true, // Prevent client-side JS access
        maxAge: 1000 * 60 * 60 * 24, // Session duration: 1 day (example)
        sameSite: 'lax'
    }
});
app.use(sessionMiddleware);

// --- Request Logging Middleware (Optional but useful) ---
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} [IP: ${req.ip}]`);
    next();
});

// Mount routers
app.use('/api', authRoutes); // Mount auth routes under /api
// Mount other routers as created
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonActionRoutes); // Mount lesson action routes directly
app.use('/api/assignments', assignmentRoutes); // Mount assignment routes directly
app.use('/api/lessons', lessonRoutes); // Mount lesson routes directly
app.use('/api/modules', moduleRoutes); // Mount module routes directly
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gamification', gamificationRoutes);


// Serve static assets (Frontend) - Place after API routes usually
app.use(express.static(path.join(__dirname, '..', 'public')));

// Handle SPA routing or direct file access (if not an API call)
// This should come after API routes and static files
app.get('*', (req, res, next) => {
     // Ignore API routes or specific file types if needed
    if (req.originalUrl.startsWith('/api')) {
       return next(); // Skip if it's an API call already handled (or 404'd)
    }
    // Otherwise, serve the main index.html for client-side routing
     // Adjust path if your index.html is elsewhere
     res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
});


// --- Custom Global Error Handler Middleware ---
// IMPORTANT: Must be defined LAST, after all other middleware and routes
app.use((err, req, res, next) => {
    let error = { ...err }; // Create a copy to avoid modifying original error
    error.message = err.message; // Copy message

    // Log the original error for debugging on the server
    logger.error(`Error: ${err.message}`, { stack: err.stack, name: err.name, code: err.code, status: err.statusCode, url: req.originalUrl });

    // --- Handle Specific Mongoose Errors ---
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new ErrorResponse(message, 404);
    }
    // Mongoose duplicate key (code 11000)
    if (err.code === 11000) {
         // Extract field name from error message if possible
         const field = Object.keys(err.keyValue)[0];
         const message = `Duplicate field value entered for '${field}'. Please use another value.`;
        error = new ErrorResponse(message, 400);
    }
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        // Combine multiple validation error messages
        const messages = Object.values(err.errors).map(val => val.message);
        const message = `Invalid input data: ${messages.join('. ')}`;
        error = new ErrorResponse(message, 400);
    }

    // --- Send JSON Error Response ---
    res.status(error.statusCode || 500).json({
        success: false,
        // Provide a generic message for 500 errors in production
        error: (process.env.NODE_ENV === 'production' && (!error.statusCode || error.statusCode === 500))
            ? 'Server Error'
            : error.message || 'Server Error'
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
const server = app.listen(
    PORT,
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection: ${err.message || err}`);
    // Close server & exit process (optional, but recommended for unhandled rejections)
    // server.close(() => process.exit(1));
});

// Handle SIGTERM for graceful shutdown (e.g., in Docker)
process.on('SIGTERM', () => {
     logger.info('SIGTERM signal received: closing HTTP server');
     server.close(() => {
       logger.info('HTTP server closed');
       // Close DB connection if needed here before exiting
       mongoose.connection.close(false, () => {
            logger.info('MongoDb connection closed.');
            process.exit(0);
       });
     });
});