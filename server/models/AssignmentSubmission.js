// models/AssignmentSubmission.js
const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true,
    },
    module: { // The module the assignment belongs to
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true,
        index: true,
    },
    // Store simple text submission here for now
    submissionText: {
        type: String,
        maxlength: [5000, 'Submission text is too long.'], // Limit length
    },
    // Future: Add fields for file uploads (e.g., fileUrl, mimeType, size)
    // fileUrl: String,

    // Status for grading by instructor
    status: {
        type: String,
        enum: ['Submitted', 'Graded', 'Needs Revision'],
        default: 'Submitted',
    },
    grade: { // Optional grade (e.g., percentage or points)
        type: Number,
    },
    instructorFeedback: { // Optional feedback from instructor
        type: String,
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    gradedAt: {
         type: Date,
    }
}, { timestamps: true }); // Adds createdAt, updatedAt

// Compound index for efficient lookup of a user's submission for a specific module
AssignmentSubmissionSchema.index({ user: 1, module: 1 }, { unique: true }); // Assumes one submission per user/module

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);