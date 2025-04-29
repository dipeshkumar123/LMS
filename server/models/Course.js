// models/Course.js
const mongoose = require('mongoose');

const CertificationCriteriaSchema = new mongoose.Schema({
    requiredLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    // Store quizzes as { lessonId: minScorePercent }
    requiredQuizzes: {
        type: Map,
        of: Number, // key is Lesson ObjectId (as string), value is min percentage (e.g., 50 for 50%)
    },
    // Store assignments by Module ObjectId
    requiredAssignments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
}, { _id: false }); // Subdocument doesn't need its own ID

const CourseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a course title'],
        trim: true,
        maxlength: [150, 'Title cannot be more than 150 characters'],
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    // Reference to the User who is the instructor
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Array of Module ObjectIds associated with this course
    modules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
    }],
    // Embedded certification criteria
    certificationCriteria: CertificationCriteriaSchema, // Optional
    // Unique identifier (e.g., 'cs101') - optional if using _id primarily
    courseCode: {
         type: String,
         unique: true,
         sparse: true, // Allow null values if not provided, but enforce uniqueness if present
         trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Add fields like category, tags, enrollment list (ref Users), etc. later
});

// TODO: Add middleware if needed (e.g., to remove associated modules/lessons on course deletion - handle with care!)

module.exports = mongoose.model('Course', CourseSchema);