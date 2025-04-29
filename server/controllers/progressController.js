// controllers/progressController.js
const UserProgress = require('../models/UserProgress');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const User = require('../models/User'); // Needed for gamification helpers
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const { awardPoints, awardBadge, checkAndGrantCertification } = require('../utils/gamificationHelpers'); // We'll create this util
const logger = require('../utils/logger'); // Assuming logger util exists

// --- Lesson Completion ---

// @desc    Mark a lesson as complete (non-quiz)
// @route   POST /api/lessons/:lessonId/complete
// @access  Private (Learner)
exports.markLessonComplete = asyncHandler(async (req, res, next) => {
    const lessonId = req.params.lessonId;
    const userId = req.session.user.id;

    const lesson = await Lesson.findById(lessonId).select('type module course title'); // Get needed fields
    if (!lesson) {
        return next(new ErrorResponse(`Lesson not found with id ${lessonId}`, 404));
    }
    if (lesson.type === 'quiz') {
        return next(new ErrorResponse('Quizzes are completed via submission, not manually.', 400));
    }

    const courseId = lesson.course;
    if (!courseId) {
        logger.error(`Lesson ${lessonId} missing course reference.`);
        return next(new ErrorResponse('Internal server error: Lesson context missing.', 500));
    }

    // Find or create user's progress document for this course
    let progress = await UserProgress.findOne({ user: userId, course: courseId });
    if (!progress) {
        progress = await UserProgress.create({ user: userId, course: courseId });
    }

    const lessonIdStr = lessonId.toString();
    const currentStatus = progress.lessonStatusMap.get(lessonIdStr);

    // Only update if not already completed
    if (!currentStatus || !currentStatus.completed) {
        const newStatus = {
            lesson: lessonId,
            completed: true,
            completedAt: new Date()
        };
        progress.lessonStatusMap.set(lessonIdStr, newStatus);
        progress.markModified('lessonStatusMap'); // Required for Map updates

        // Update lastAccessed
        progress.lastAccessed = new Date();

        await progress.save();

        logger.info(`User ${userId} marked lesson ${lessonId} complete.`);
        // Award points
        await awardPoints(userId, 'LESSON_COMPLETE', `Completed lesson: ${lesson.title}`);
        // Check certification
        await checkAndGrantCertification(userId, courseId);
        // Log MCP event
        logger.mcp(userId, courseId.toString(), 'lesson_complete', { lessonId: lessonIdStr, lessonType: lesson.type });

        res.status(200).json({ success: true, message: 'Lesson marked as completed', completed: true });
    } else {
        logger.info(`User ${userId} re-marked lesson ${lessonId} complete.`);
        // Already complete, send success but indicate no change occurred if needed
        res.status(200).json({ success: true, message: 'Lesson already marked as completed', completed: true });
    }
});


// --- Quiz Submission ---

// @desc    Submit answers for a quiz lesson
// @route   POST /api/lessons/:lessonId/quiz
// @access  Private (Learner)
exports.submitQuiz = asyncHandler(async (req, res, next) => {
    const lessonId = req.params.lessonId;
    const userId = req.session.user.id;
    const answers = req.body.answers; // Expects { "0": 1, "1": 0 } format

    if (!answers || typeof answers !== 'object') {
        return next(new ErrorResponse('Invalid answers format submitted.', 400));
    }

    const lesson = await Lesson.findById(lessonId).select('type module course title questions');
    if (!lesson) {
        return next(new ErrorResponse(`Lesson not found with id ${lessonId}`, 404));
    }
    if (lesson.type !== 'quiz') {
        return next(new ErrorResponse('This lesson is not a quiz.', 400));
    }
    if (!lesson.questions || lesson.questions.length === 0) {
         logger.warn(`Quiz lesson ${lessonId} has no questions defined.`);
         return next(new ErrorResponse('Quiz has no questions.', 400));
    }

    const courseId = lesson.course;
     if (!courseId) {
         logger.error(`Quiz lesson ${lessonId} missing course reference.`);
         return next(new ErrorResponse('Internal server error: Lesson context missing.', 500));
     }

    // --- Score Calculation ---
    let score = 0;
    let results = [];
    const total = lesson.questions.length;
    lesson.questions.forEach((q, index) => {
        const correctOptionIndex = q.correct;
        const userAnswerIndex = parseInt(answers[index], 10); // Ensure number
        const isCorrect = userAnswerIndex === correctOptionIndex;
        if (isCorrect) {
            score++;
        }
        results.push({
            question: q.q,
            yourAnswer: q.options[userAnswerIndex] ?? 'Not Answered',
            correctAnswer: q.options[correctOptionIndex],
            isCorrect: isCorrect
        });
    });
    const scorePercent = total > 0 ? parseFloat(((score / total) * 100).toFixed(1)) : 0;

    // --- Update Progress ---
    let progress = await UserProgress.findOne({ user: userId, course: courseId });
    if (!progress) {
        progress = await UserProgress.create({ user: userId, course: courseId });
    }

    const lessonIdStr = lessonId.toString();
    const previousStatus = progress.lessonStatusMap.get(lessonIdStr);
    const newStatus = {
        lesson: lessonId,
        completed: true, // Mark completed on submission
        completedAt: previousStatus?.completedAt || new Date(), // Keep original completion if retake
        score: score,
        total: total,
        scorePercent: scorePercent,
        submittedAt: new Date() // Track last submission time
    };
    progress.lessonStatusMap.set(lessonIdStr, newStatus);
    progress.markModified('lessonStatusMap');
    progress.lastAccessed = new Date();
    await progress.save();

    logger.info(`User ${userId} scored ${score}/${total} (${scorePercent}%) on quiz ${lessonId}`);

    // --- Award Gamification ---
    await awardPoints(userId, 'QUIZ_ATTEMPT', `Quiz attempt on: ${lesson.title} (Score: ${scorePercent}%)`, { scorePercent }); // Pass scorePercent to helper
    if (scorePercent === 100) {
        await awardBadge(userId, 'PERFECT_SCORE');
    }
    if (scorePercent >= 50) { // Threshold for 'pass'
        await awardBadge(userId, 'FIRST_QUIZ_PASSED');
    }

    // --- Check Certification ---
    await checkAndGrantCertification(userId, courseId);

    // --- Log MCP ---
    logger.mcp(userId, courseId.toString(), 'quiz_attempt', { lessonId: lessonIdStr, score, total, scorePercent });

    // --- Send Response ---
    res.status(200).json({
        success: true,
        score,
        total,
        scorePercent,
        results, // Send detailed results back
        message: `Quiz submitted. Score: ${score}/${total}.`
    });
});


// --- Assignment Submission ---

// @desc    Submit text for an assignment associated with a module
// @route   POST /api/assignments/:moduleId/submit
// @access  Private (Learner)
exports.submitAssignment = asyncHandler(async (req, res, next) => {
    const moduleId = req.params.moduleId;
    const userId = req.session.user.id;
    const { submissionText } = req.body;

    if (!submissionText || typeof submissionText !== 'string' || submissionText.trim().length === 0) {
        return next(new ErrorResponse('Submission text is required.', 400));
    }

    const module = await Module.findById(moduleId).select('course title hasAssignment');
    if (!module) {
        return next(new ErrorResponse(`Module not found with id ${moduleId}`, 404));
    }
    if (!module.hasAssignment) {
        return next(new ErrorResponse(`Module ${module.title} does not have an assignment.`, 400));
    }

    const courseId = module.course;
     if (!courseId) {
         logger.error(`Module ${moduleId} missing course reference.`);
         return next(new ErrorResponse('Internal server error: Module context missing.', 500));
     }

    // --- Create/Update Submission Record ---
    // Use findOneAndUpdate with upsert:true to handle first submission or resubmission
    const submissionData = {
        user: userId,
        course: courseId,
        module: moduleId,
        submissionText: submissionText.trim(),
        status: 'Submitted', // Reset status on new submission
        submittedAt: new Date(),
        // Reset grade/feedback on resubmission? Policy decision.
        // grade: null,
        // instructorFeedback: null,
        // gradedAt: null
    };
    const submission = await AssignmentSubmission.findOneAndUpdate(
        { user: userId, module: moduleId }, // Find criteria
        submissionData, // Data to insert/update
        { new: true, upsert: true, runValidators: true } // Options: return updated, create if not found, run schema validation
    );

    // --- Update User Progress ---
    let progress = await UserProgress.findOne({ user: userId, course: courseId });
     if (!progress) {
         progress = await UserProgress.create({ user: userId, course: courseId });
     }

    const moduleIdStr = moduleId.toString();
    const hadSubmittedBefore = !!progress.assignmentSubmittedModules?.get(moduleIdStr)?.submitted;
    progress.assignmentSubmittedModules.set(moduleIdStr, { submitted: true, submittedAt: submission.submittedAt });
    progress.markModified('assignmentSubmittedModules');
    progress.lastAccessed = new Date();
    await progress.save();

    logger.info(`User ${userId} submitted assignment for module ${moduleId}. First submission: ${!hadSubmittedBefore}`);

    // --- Award Gamification (only on first submission) ---
    if (!hadSubmittedBefore) {
         await awardPoints(userId, 'ASSIGNMENT_SUBMIT', `Submitted assignment for: ${module.title}`);
    }

    // --- Check Certification ---
    await checkAndGrantCertification(userId, courseId);

    // --- Log MCP ---
    logger.mcp(userId, courseId.toString(), 'assignment_submit', { moduleId: moduleIdStr, textLength: submission.submissionText.length });

    res.status(200).json({
        success: true,
        message: 'Assignment submitted successfully.',
        // Return submission ID or limited data if needed by frontend
        submissionId: submission._id
    });
});