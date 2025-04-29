// controllers/aiController.js
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const UserProgress = require('../models/UserProgress');
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    SIMULATED AI: Generate personalized practice
// @route   GET /api/ai/practice/:lessonId
// @access  Private (Learner)
exports.generatePractice = asyncHandler(async (req, res, next) => {
    const { lessonId } = req.params;
    const userId = req.session.user.id;

    const lesson = await Lesson.findById(lessonId).select('title type module course');
    if (!lesson) return next(new ErrorResponse(`Lesson not found: ${lessonId}`, 404));

    logger.info(`AI Simulation: Generating practice for user ${userId} on lesson ${lessonId} (${lesson.title})`);

    // --- Simulation Logic ---
    let practice = { type: 'quiz', title: `Practice for: ${lesson.title}`, questions: [], feedback: `Practice questions for ${lesson.title}.` };

    // Example: More specific practice for the CS101 quiz
    if (lessonId.toString() === "655200cba1d8f7a8a9c8b3d3") { // Use the ObjectId string from seeder
        practice.questions = [
             { q: 'What is a "variable" in programming?', options: ['A constant value', 'A named storage location', 'A type of loop'], correct: 1 },
             { q: 'Which represents text data?', options: ['Boolean', 'String', 'Float'], correct: 1 },
             { q: 'Syntax errors are caught during?', options: ['Runtime', 'Compilation', 'User Testing'], correct: 1 }
        ];
        // Simulate difficulty based on last attempt from DB
        const progress = await UserProgress.findOne({ user: userId, course: lesson.course }).select('lessonStatusMap');
        const lastAttempt = progress?.lessonStatusMap?.get(lessonId.toString());
        if (lastAttempt?.scorePercent !== undefined) {
             practice.feedback += lastAttempt.scorePercent < 50 ? " Focusing on foundations." : " Reinforcing understanding.";
        }
    } else { // Generic practice
         practice.questions = [ { q: `Central concept of "${lesson.title}"?`, options: ['Opt A', 'Opt B', 'Opt C'], correct: 1 } ];
         practice.feedback = `Reviewing key ideas from ${lesson.title}.`;
    }

    logger.mcp(userId, lesson.course?.toString(), 'ai_practice_request', { lessonId: lessonId.toString() });
    res.status(200).json({ success: true, data: practice });
});


// @desc    SIMULATED Agentic AI: Suggest activity based on course context
// @route   GET /api/ai/suggest-activity/:courseId
// @access  Private (Learner)
exports.suggestActivity = asyncHandler(async (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.session.user.id;

    const course = await Course.findById(courseId).select('title courseCode');
    if (!course) return next(new ErrorResponse(`Course not found: ${courseId}`, 404));

    logger.info(`AI Simulation: Suggesting activity for user ${userId} in course ${courseId} (${course.title})`);

    // --- Simulation Logic ---
    let activity = { title: "General Learning Activity", description: "Explain a key concept to a friend!", type: 'reflection' };

     // Example suggestions based on courseCode or title
     if (course.courseCode === 'cs101') {
         activity = { title: "Mini-Project: Simple To-Do List", description: "Create a basic To-Do list app.", type: 'project' };
     } else if (course.courseCode === 'math101') {
          activity = { title: "Real-World Limit Example", description: "Find a real-world scenario where limits apply.", type: 'case-study' };
     }

    logger.mcp(userId, courseId.toString(), 'ai_activity_suggestion_request', { requestedCourseId: courseId.toString() });
    res.status(200).json({ success: true, data: activity });
});


// @desc    MOCK AI: Predict learner risk
// @route   GET /api/ai/predictive/risk/:userId (Admin/Instructor access usually)
// @access  Private (Instructor, Administrator) - Protect with authorize later
// NOTE: For simplicity, kept original route structure, but data source changed.
// NOTE 2: This might be better placed in an analytics or user controller.
exports.predictRisk = asyncHandler(async (req, res, next) => {
    // In a real scenario, this would likely be requested by an Instructor/Admin for a specific user.
    // Let's simulate getting it for the currently logged-in user for now.
    const userId = req.session.user.id; // Or req.params.userId if requested by Admin

    // Fetch all progress for the user
    const allProgress = await UserProgress.find({ user: userId }).populate('course', 'title'); // Populate course title

    // --- Predictive Simulation Logic (Using DB data) ---
    let riskScore = 0; let factors = []; let totalQuizzes = 0; let quizzesBelowThreshold = 0;
    let totalLessonsAvailable = 0; let lessonsCompleted = 0; let recentActivity = false;
    const now = Date.now(); const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    if (!allProgress || allProgress.length === 0) {
        riskScore = 1; factors.push("Not yet started any courses.");
    } else {
        for (const progress of allProgress) {
            if (progress.lastAccessed && new Date(progress.lastAccessed).getTime() > oneWeekAgo) recentActivity = true;

            // Fetch full course details (lessons) - Inefficient! Better to aggregate this data.
            // This highlights why a data warehouse or pre-aggregated stats are useful for analytics.
             const courseDetails = await Course.findById(progress.course._id).populate('modules');
             if(courseDetails && courseDetails.modules) {
                  for(const modRef of courseDetails.modules) {
                        const moduleDetails = await Module.findById(modRef._id).populate('lessons');
                        totalLessonsAvailable += moduleDetails?.lessons?.length || 0;
                  }
             }

             if (progress.lessonStatusMap) {
                 lessonsCompleted += Array.from(progress.lessonStatusMap.values()).filter(s => s.completed).length;
                 for (const [lessonIdStr, status] of progress.lessonStatusMap.entries()) {
                    // Need lesson type - requires another lookup or denormalization!
                    // Simplified check: if scorePercent exists, assume it's a quiz
                    if (status.scorePercent !== undefined) {
                         totalQuizzes++;
                         if (status.scorePercent < 60) quizzesBelowThreshold++;
                    }
                 }
             }
        }
        // Calculate risk factors (same logic as before)
        if (!recentActivity && allProgress.length > 0) { riskScore += 3; factors.push("Low recent activity."); }
        if (totalQuizzes > 0 && (quizzesBelowThreshold / totalQuizzes) > 0.4) { riskScore += 4; factors.push(">40% quizzes below 60%."); }
        else if (quizzesBelowThreshold > 0) { riskScore += 2; factors.push("Some quizzes below 60%."); }
        const overallCompletion = totalLessonsAvailable > 0 ? (lessonsCompleted / totalLessonsAvailable) : 0;
        if (totalLessonsAvailable > 3 && overallCompletion < 0.2 && recentActivity) { riskScore += 2; factors.push("Low completion despite activity."); }
    }
    let riskLevel = "Low"; if (riskScore >= 5) riskLevel = "High"; else if (riskScore >= 2) riskLevel = "Medium";

    logger.info(`Predictive Risk calculated for user ${userId}: Level=${riskLevel}, Score=${riskScore}`);
    logger.mcp(userId, null, 'predictive_risk_calculated', { riskLevel, riskScore, factors });

    res.status(200).json({ success: true, data: { riskLevel, riskScore, factors } });
});