// models/ForumPost.js
const mongoose = require('mongoose');

const ForumPostSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // Store user's name denormalized for easier display (avoids extra lookup)
    userName: {
         type: String,
         required: true,
    },
    course: { // Context
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    module: { // Forum associated with a module
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true,
        index: true,
    },
    // OR link to Lesson if forums are per-lesson:
    // lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', index: true },
    // Need validation to ensure either module or lesson is present if using both options.

    text: {
        type: String,
        required: [true, 'Post text cannot be empty.'],
        trim: true,
        maxlength: [2000, 'Post text is too long.'],
    },
    // Add replies later as needed (e.g., array of sub-documents or references)
    // replies: [ReplySchema]

}, { timestamps: true }); // Adds createdAt, updatedAt

// Index for quickly finding posts for a specific module, sorted by creation time
ForumPostSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('ForumPost', ForumPostSchema);