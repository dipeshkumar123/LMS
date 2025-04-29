// controllers/assignmentController.js
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Module = require('../models/Module');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User'); // For points
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { POINTS, awardPoints, checkAndGrantCertification } = require('../utils/gamification');

// @desc    Submit an assignment for a module
// @route   POST /api/modules/:moduleId/assignment
// @access  Private (Learner)
exports.submitAssignment = asyncHandler(async (req, res, next) => {
    const moduleId = req.params.moduleId;
    const userId = req.session.user.id;
    const { submissionText } = req.body; // Expecting text for now

    // 1. Validate Module and Assignment Requirement
    const module = await Module.findById(moduleId).select('course hasAssignment title');
    if (!module) {
        return next(new ErrorResponse(`Module not found with id ${moduleId}`, 404));
    }
    if (!module.hasAssignment) {
         return next(new ErrorResponse(`Module ${moduleId} does not have an assignment.`, 400));
    }

    const courseId = module.course;

    // 2. Create or Update the Submission Record
    // findOneAndUpdate handles both creation and update (if user resubmits)
    const submissionData = {
        user: userId,
        course: courseId,
        module: moduleId,
        submissionText: submissionText, // Sanitize/validate this further in production
        status: 'Submitted', // Reset status on new submission
        submittedAt: new Date(),
        // Reset grade/feedback on resubmission if applicable by design
        // grade: undefined,
        // instructorFeedback: undefined,
        // gradedAt: undefined
    };

    // Use upsert: true to create if not exists, update if it does.
    // `new: true` returns the updated/created document.
    const submission = await AssignmentSubmission.findOneAndUpdate(
        { user: userId, module: moduleId }, // Find existing submission by user/module
        submissionData,
        { new: true, upsert: true, runValidators: true }
    );

    // 3. Update User Progress to mark as submitted
    const progress = await UserProgress.findOneAndUpdate(
        { user: userId, course: courseId },
        { $set: { lastAccessed: new Date() } },
        { new: true, upsert: true } // Ensure progress doc exists
    );

    // markAssignmentSubmitted returns true if status changed from not-submitted to submitted
    const wasFirstSubmission = progress.markAssignmentSubmitted(moduleId, submission.submittedAt);
    await progress.save();

    // 4. Award Points (only on first submission)
    if (wasFirstSubmission) {
         const pointsAwarded = POINTS.ASSIGNMENT_SUBMIT;
         await User.findByIdAndUpdate(userId, { $inc: { points: pointsAwarded } });
         logger.info(`[Gamification] User ${userId} awarded ${pointsAwarded} points for submitting assignment for module ${module.title || moduleId}`);
    }

    // 5. Check Certification
    checkAndGrantCertification(userId, courseId);

    // 6. Log MCP Event
    logger.mcp(userId, courseId.toString(), 'assignment_submit', {
        moduleId: moduleId.toString(),
        submissionId: submission._id.toString(),
        textLength: submissionText?.length || 0
    });

    // 7. Send Response
    res.status(201).json({ // 201 if created, 200 if updated - might simplify to 200
        success: true,
        message: 'Assignment submitted successfully.',
        data: { submissionId: submission._id } // Return minimal data, maybe submission status
    });
});


// TODO: Add controllers for Instructor actions (view submissions, grade assignment)