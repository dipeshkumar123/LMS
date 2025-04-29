// models/Module.js
const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a module title'],
        trim: true,
        maxlength: [100, 'Module title cannot be more than 100 characters'],
    },
    // Reference to the parent Course
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true, // Index for faster lookups by course
    },
    // Array of Lesson ObjectIds associated with this module
    lessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
    }],
    // Order of the module within the course (optional but useful)
    order: {
        type: Number,
        default: 0,
    },
    // Assignment details (if applicable to the module)
    hasAssignment: {
        type: Boolean,
        default: false,
    },
    assignmentDescription: {
        type: String,
        maxlength: [1000, 'Assignment description too long'],
        // Only required if hasAssignment is true (can be enforced via custom validation or application logic)
        validate: {
             validator: function(v) {
                 // 'this' refers to the document being saved
                 return !this.hasAssignment || (this.hasAssignment && v && v.length > 0);
             },
             message: 'Assignment description is required when "hasAssignment" is true.'
         }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// TODO: Add pre-remove middleware if necessary to handle cleanup of lessons
// ModuleSchema.pre('remove', async function(next) { ... });

module.exports = mongoose.model('Module', ModuleSchema);