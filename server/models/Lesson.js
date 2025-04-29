// models/Lesson.js
const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema({
    q: { type: String, required: true }, // The question text
    options: [{ type: String, required: true }], // Array of possible answer strings
    correct: { type: Number, required: true }, // Index of the correct option in the array
}, { _id: false });

const LessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a lesson title'],
        trim: true,
        maxlength: [150, 'Lesson title too long'],
    },
    // Reference to the parent Module
    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true,
        index: true, // Index for faster lookups by module
    },
    // Reference to the parent Course (denormalized for easier querying sometimes, optional)
    course: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Course',
         required: true, // Ensure we always know the course context
         index: true,
    },
    // Order of the lesson within the module (optional but useful)
    order: {
        type: Number,
        default: 0,
    },
    // Type of lesson content
    type: {
        type: String,
        enum: ['text', 'video', 'quiz', 'external_resource', 'assignment_link'], // Add other types as needed
        required: true,
    },
    // Content fields - only one should be relevant based on 'type'
    content: { // For 'text' type
        type: String,
    },
    videoUrl: { // For 'video' type (URL to video file/service)
        type: String,
        // Could add validation for URL format
    },
    resourceUrl: { // For 'external_resource' type
        type: String,
    },
    resourceDescription: { // Description for external resource/assignment link
        type: String,
    },
    // Quiz details - only relevant if type is 'quiz'
    questions: [QuizQuestionSchema], // Array of embedded question objects

    // Estimated duration (optional) - e.g., in minutes
    durationMinutes: {
        type: Number,
        min: 0
    },

    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Ensure only relevant content fields are populated based on type (can be enforced in application logic/controllers)

module.exports = mongoose.model('Lesson', LessonSchema);