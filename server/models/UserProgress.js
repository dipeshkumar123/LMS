// models/UserProgress.js
const mongoose = require('mongoose');

const LessonStatusSchema = new mongoose.Schema({
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    // Quiz specific fields (only relevant if lesson type is quiz)
    score: { type: Number },
    total: { type: Number },
    scorePercent: { type: Number }, // Denormalized percentage
    submittedAt: { type: Date }, // Last submission time
}, { _id: false }); // Use lesson ObjectId as the key in the Map

const UserProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    // Map where key is Lesson ObjectId (as string), value is LessonStatusSchema object
    lessonStatusMap: {
        type: Map,
        of: LessonStatusSchema,
        default: {},
    },
    // Tracks if assignment for a module was submitted (key: Module ObjectId as string)
    // We store the actual submission in a separate collection
    assignmentSubmittedModules: {
         type: Map,
         of: { submitted: Boolean, submittedAt: Date }, // value indicates submission status/time
         default: {},
    },
    certified: {
        type: Boolean,
        default: false,
    },
    certificationDate: {
        type: Date,
    },
    lastAccessed: {
        type: Date,
        default: Date.now,
    },
    // Optionally add course-specific points if needed,
    // but global points are on the User model for simplicity now.
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Create a compound index for efficient lookup of a user's progress in a specific course
UserProgressSchema.index({ user: 1, course: 1 }, { unique: true });

// Helper method to update or add lesson status
UserProgressSchema.methods.updateLessonStatus = function(lessonId, statusUpdates) {
    const currentStatus = this.lessonStatusMap.get(lessonId.toString()) || { lesson: lessonId };
    const updatedStatus = { ...currentStatus, ...statusUpdates };
    this.lessonStatusMap.set(lessonId.toString(), updatedStatus);
    // Mark the map as modified for Mongoose to save it
    this.markModified('lessonStatusMap');
};

// Helper method to update assignment submission status
UserProgressSchema.methods.markAssignmentSubmitted = function(moduleId, submittedAt) {
     const key = moduleId.toString();
     const currentStatus = this.assignmentSubmittedModules.get(key);
     // Only update if not already marked, or perhaps allow re-submission tracking
     if (!currentStatus || !currentStatus.submitted) {
        this.assignmentSubmittedModules.set(key, { submitted: true, submittedAt: submittedAt || new Date() });
        this.markModified('assignmentSubmittedModules');
        return true; // Indicate that status was changed
     }
     return false; // Status was already submitted
};


module.exports = mongoose.model('UserProgress', UserProgressSchema);