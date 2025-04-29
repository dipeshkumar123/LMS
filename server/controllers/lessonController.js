// controllers/lessonController.js
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User'); // Needed for awarding points/badges
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { POINTS, BADGES, awardPoints, awardBadge, checkAndGrantCertification } = require('../utils/gamification'); // We'll create this utility

// @desc    Mark a lesson as complete (Text/Video etc.)
// @route   POST /api/lessons/:lessonId/complete
// @access  Private (Learner)
exports.markLessonComplete = asyncHandler(async (req, res, next) => {
    const lessonId = req.params.lessonId;
    const userId = req.session.user.id;

    // 1. Find the lesson to get its type and context
    const lesson = await Lesson.findById(lessonId).select('type module course');
    if (!lesson) {
        return next(new ErrorResponse(`Lesson not found with id ${lessonId}`, 404));
    }
    if (lesson.type === 'quiz') {
        return next(new ErrorResponse('Quizzes are completed via submission, not manually.', 400));
    }

    const courseId = lesson.course;
    const moduleId = lesson.module; // Get module context as well

    // 2. Find or create user's progress for the course
    // Using findOneAndUpdate with upsert:true creates if not exists, or updates if exists
    const progress = await UserProgress.findOneAndUpdate(
        { user: userId, course: courseId },
        { $set: { lastAccessed: new Date() }, $setOnInsert: { user: userId, course: courseId } }, // Update lastAccessed, set fields on creation
        { new: true, upsert: true, runValidators: true } // Return updated doc, create if doesn't exist
    );

    // 3. Check if lesson is already complete in the map
    const lessonIdStr = lessonId.toString();
    const currentStatus = progress.lessonStatusMap.get(lessonIdStr);

    if (currentStatus?.completed) {
        logger.info(`User ${userId} re-marked lesson ${lessonId} complete.`);
        return res.status(200).json({ success: true, message: 'Lesson already marked as completed', completed: true });
    }

    // 4. Update the lesson status in the map
    progress.updateLessonStatus(lessonId, {
        completed: true,
        completedAt: new Date()
    });

    // 5. Save progress changes
    await progress.save();

    // 6. Award points (using the User model directly now)
    const pointsAwarded = POINTS.LESSON_COMPLETE;
    await User.findByIdAndUpdate(userId, { $inc: { points: pointsAwarded } });
    logger.info(`[Gamification] User ${userId} awarded ${pointsAwarded} points for completing lesson ${lesson.title || lessonId}`);

    // 7. Check for certification
    checkAndGrantCertification(userId, courseId); // Check after progress save

    // 8. Log MCP Event
    logger.mcp(userId, courseId.toString(), 'lesson_complete', { lessonId: lessonIdStr, lessonType: lesson.type, moduleId: moduleId.toString() });

    res.status(200).json({ success: true, message: 'Lesson marked as completed', completed: true });
});


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

    // 1. Find the lesson, ensure it's a quiz, get questions
    const lesson = await Lesson.findById(lessonId).select('type questions module course title');
    if (!lesson) {
        return next(new ErrorResponse(`Lesson not found with id ${lessonId}`, 404));
    }
    if (lesson.type !== 'quiz') {
        return next(new ErrorResponse('This lesson is not a quiz.', 400));
    }
    if (!lesson.questions || lesson.questions.length === 0) {
         return next(new ErrorResponse('Quiz has no questions configured.', 500)); // Server config issue
    }

    const courseId = lesson.course;
    const moduleId = lesson.module;

    // 2. Calculate score and results
    let score = 0;
    let detailedResults = [];
    const total = lesson.questions.length;

    lesson.questions.forEach((q, index) => {
        const correctOptionIndex = q.correct;
        const userAnswerIndex = parseInt(answers[index], 10); // Ensure number
        const isCorrect = userAnswerIndex === correctOptionIndex;
        if (isCorrect) score++;
        detailedResults.push({
             question: q.q, // Sending question text back might be redundant if FE has it
             yourAnswer: q.options[userAnswerIndex] ?? 'Not Answered',
             correctAnswer: q.options[correctOptionIndex],
             isCorrect: isCorrect
        });
    });
    const scorePercent = total > 0 ? parseFloat(((score / total) * 100).toFixed(1)) : 0;

    // 3. Find or create user's progress for the course
    const progress = await UserProgress.findOneAndUpdate(
        { user: userId, course: courseId },
        { $set: { lastAccessed: new Date() }, $setOnInsert: { user: userId, course: courseId } },
        { new: true, upsert: true, runValidators: true }
    );

    // 4. Update the lesson status for the quiz
    const lessonIdStr = lessonId.toString();
    const submissionTime = new Date();
    progress.updateLessonStatus(lessonIdStr, {
        completed: true, // Mark completed on submission
        completedAt: progress.lessonStatusMap.get(lessonIdStr)?.completedAt || submissionTime, // Keep first completion time
        submittedAt: submissionTime,
        score: score,
        total: total,
        scorePercent: scorePercent
    });

    // 5. Award Points & Badges
    let pointsToAward = 0;
    let awardedBadgeIds = []; // Track badges awarded in this submission

    if (scorePercent >= 50) { // Passed
        pointsToAward += POINTS.QUIZ_PASS;
        if (await awardBadge(userId, 'FIRST_QUIZ_PASSED')) { // awardBadge returns true if awarded
             awardedBadgeIds.push(BADGES.FIRST_QUIZ_PASSED.id);
        }
    }
    if (scorePercent === 100) { // Perfect
         pointsToAward += POINTS.QUIZ_PERFECT;
         if (await awardBadge(userId, 'PERFECT_SCORE')) {
             awardedBadgeIds.push(BADGES.PERFECT_SCORE.id);
         }
    }
    if (pointsToAward > 0) {
         await User.findByIdAndUpdate(userId, { $inc: { points: pointsToAward } });
         logger.info(`[Gamification] User ${userId} awarded ${pointsToAward} points for quiz ${lesson.title || lessonId} (Score: ${scorePercent}%)`);
    }

    // 6. Save progress
    await progress.save();

    // 7. Check certification
    checkAndGrantCertification(userId, courseId);

    // 8. Log MCP event
    logger.mcp(userId, courseId.toString(), 'quiz_attempt', {
        lessonId: lessonIdStr, moduleId: moduleId.toString(), score, total, scorePercent
    });

    // 9. Send response
    res.status(200).json({
        success: true,
        score,
        total,
        scorePercent,
        results: detailedResults, // Send detailed results back
        awardedBadgeIds, // Send IDs of any newly awarded badges
        message: `Quiz submitted. Score: ${score}/${total}.`
    });
});