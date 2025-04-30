// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [ // Basic email format validation
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false, // Do not return password by default on queries
    },
    role: {
        type: String,
        enum: ['Learner', 'Instructor', 'Administrator'],
        required: [true, 'Please provide a user role'],
        default: 'Learner',
    },
    // Phase 4: Gamification data (can be embedded or referenced)
    // Embedding simple stats here for easier retrieval with user object
    points: {
        type: Number,
        default: 0,
    },
    badges: [{ // Array of badge IDs (strings)
        type: String, // We'll store the badge ID (e.g., 'cert-cs101')
        // Could also be: type: mongoose.Schema.Types.ObjectId, ref: 'Badge' if badges were a separate collection
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Add any other fields like email, profile picture URL, etc. later
    completedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
    certifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
});

// --- Password Hashing Middleware ---
// Hash password BEFORE saving a new user or modifying the password
UserSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate salt & hash password
        const salt = await bcrypt.genSalt(10); // 10 rounds is generally recommended
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error); // Pass error to the next middleware/handler
    }
});

// --- Instance Method for Password Comparison ---
// Compare entered password with the hashed password in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    // 'this.password' refers to the hashed password for the specific user document
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- Populate Initial Users (Optional - for testing) ---
// We can create a separate script to seed the database,
// or add logic here that runs only once (less ideal for models).
// Seeding script is generally preferred.

module.exports = mongoose.model('User', UserSchema);