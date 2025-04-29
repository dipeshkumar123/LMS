// controllers/aiController.js
// Updated to use aiService for real AI calls (Practice/Activity)
// Enhanced Simulation for Risk/Adaptive

const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const UserProgress = require('../models/UserProgress');
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const { callOpenAI, parseJsonFromText } = require('../services/aiService'); // Import AI service

// --- Personalized Practice Generation (Using Real AI) ---

// @desc    Generate personalized practice exercises using AI
// @route   GET /api/ai/practice/:lessonId
// @access  Private (Learner)
exports.generatePractice = asyncHandler(async (req, res, next) => {
    const { lessonId } = req.params;
    const userId = req.session.user.id;

    const lesson = await Lesson.findById(lessonId).select('title type module course content questions'); // Include content/questions for context
    if (!lesson) return next(new ErrorResponse(`Lesson not found: ${lessonId}`, 404));

    logger.info(`AI Request: Generating practice for user ${userId} on lesson ${lessonId} (${lesson.title})`);

    // --- Prepare Prompt for AI ---
    let promptContext = `Lesson Title: ${lesson.title}\nLesson Type: ${lesson.type}\n`;
    if (lesson.type === 'text' && lesson.content) {
        // Use only a portion of long content to avoid exceeding token limits
        promptContext += `Lesson Content Snippet:\n${lesson.content.substring(0, 1000)}${lesson.content.length > 1000 ? '...' : ''}\n`;
    } else if (lesson.type === 'quiz' && lesson.questions && lesson.questions.length > 0) {
         // Provide existing quiz questions as context for variation
         promptContext += `Existing Quiz Questions (for reference/variation):\n`;
         lesson.questions.forEach((q, i) => promptContext += `${i+1}. ${q.q}\n`);
    }

    // TODO: Add user-specific context (e.g., recent errors on this topic - requires more detailed progress tracking)
    // const userRecentErrors = await getUserErrors(userId, lesson.topic); // Hypothetical function
    // if(userRecentErrors) promptContext += `\nUser recently struggled with: ${userRecentErrors}\n`;

    // Define desired output format (JSON)
    const jsonFormatInstruction = `
Respond ONLY with a valid JSON object containing:
1.  "type": "quiz"
2.  "title": A short title like "Practice for: [Original Lesson Title]"
3.  "feedback": A brief introductory feedback message for the user (1 sentence).
4.  "questions": An array of 3-4 multiple-choice practice questions. Each question object should have:
    - "q": The question text (string).
    - "options": An array of 3-4 answer option strings.
    - "correct": The 0-based index of the correct answer in the options array (number).

Ensure the questions are different from the reference questions (if provided) but cover the same topic based on the context.
Ensure the entire response is ONLY the JSON object, with no other text before or after it.
`;

    const messages = [
        { role: 'system', content: `You are an expert instructional designer creating practice quizzes for an LMS based on provided lesson context. ${jsonFormatInstruction}` },
        { role: 'user', content: `Generate a practice quiz based on the following lesson context:\n\n${promptContext}` }
    ];

    try {
        // Call the AI Service
        const aiResponseText = await callOpenAI(messages, 300, 0.5); // Adjust tokens/temp as needed

        // Parse the JSON response
        const practiceData = parseJsonFromText(aiResponseText);

        if (!practiceData || !Array.isArray(practiceData.questions)) {
             logger.error('AI practice generation response was not valid JSON or missing questions:', aiResponseText);
             // Fallback to simpler simulation if parsing fails
             // return res.status(200).json(generateSimulatedPractice(lesson)); // Or send error
              return next(new ErrorResponse("AI failed to generate valid practice questions. Please try again later.", 500));
        }

        // Validate structure minimally
        if (typeof practiceData.title !== 'string' || typeof practiceData.feedback !== 'string' || !Array.isArray(practiceData.questions)) {
             return next(new ErrorResponse("AI response format was invalid.", 500));
        }
        // Could add deeper validation of question objects here

        logger.mcp(userId, lesson.course?.toString(), 'ai_practice_request_success', { lessonId: lessonId.toString() });
        res.status(200).json({ success: true, data: practiceData }); // Send the parsed JSON data

    } catch (error) {
        logger.error(`AI Practice generation failed for lesson ${lessonId}:`, error);
        logger.mcp(userId, lesson.course?.toString(), 'ai_practice_request_failed', { lessonId: lessonId.toString(), error: error.message });
        // Forward error with appropriate status code from callOpenAI if available
        next(new ErrorResponse(`AI Service Error: ${error.message}`, error.status || 503)); // 503 Service Unavailable
    }
});


// --- AI Activity Suggestion (Using Real AI) ---

// @desc    Suggest an activity based on course context using AI
// @route   GET /api/ai/suggest-activity/:courseId
// @access  Private (Learner)
exports.suggestActivity = asyncHandler(async (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.session.user.id;

    const course = await Course.findById(courseId).select('title description'); // Get context
    if (!course) return next(new ErrorResponse(`Course not found: ${courseId}`, 404));

    logger.info(`AI Request: Suggesting activity for user ${userId} in course ${courseId} (${course.title})`);

    // --- Prepare Prompt ---
    // TODO: Add user progress context (e.g., completion %, topics completed)
    // const progress = await UserProgress.findOne({ user: userId, course: courseId });
    // const completion = calculateCompletion(progress); // Need completion calculation helper

    const promptContext = `
Course Title: ${course.title}
Course Description: ${course.description}
`;
    // if (progress) promptContext += `User Progress: ${completion}% complete.\n`;

    const jsonFormatInstruction = `
Respond ONLY with a valid JSON object containing:
1.  "title": A concise, engaging title for the suggested activity (string).
2.  "description": A clear description of the activity (string, 2-4 sentences).
3.  "type": A category for the activity (string, e.g., "project", "case-study", "research", "discussion", "challenge", "external-resource").

Base the suggestion on the course context provided. Suggest a practical, creative, or thought-provoking activity relevant to the course topic.
Ensure the entire response is ONLY the JSON object, with no other text before or after it.
`;

    const messages = [
        { role: 'system', content: `You are a helpful AI assistant suggesting relevant learning activities for students in an LMS. ${jsonFormatInstruction}` },
        { role: 'user', content: `Suggest a single learning activity based on this course context:\n\n${promptContext}` }
    ];

    try {
        const aiResponseText = await callOpenAI(messages, 150, 0.7); // Shorter response needed
        const activityData = parseJsonFromText(aiResponseText);

        if (!activityData || !activityData.title || !activityData.description || !activityData.type) {
            logger.error('AI activity suggestion response was not valid JSON or missing fields:', aiResponseText);
            // Fallback to simulation if needed
            // return res.status(200).json(generateSimulatedActivity(course));
             return next(new ErrorResponse("AI failed to generate a valid activity suggestion.", 500));
        }

        logger.mcp(userId, courseId.toString(), 'ai_activity_suggestion_success', { courseId: courseId.toString() });
        res.status(200).json({ success: true, data: activityData });

    } catch (error) {
        logger.error(`AI Activity suggestion failed for course ${courseId}:`, error);
        logger.mcp(userId, courseId.toString(), 'ai_activity_suggestion_failed', { courseId: courseId.toString(), error: error.message });
        next(new ErrorResponse(`AI Service Error: ${error.message}`, error.status || 503));
    }
});


// --- Predictive Risk (Enhanced Simulation - Not Real AI) ---

// @desc    MOCK AI: Predict learner risk (enhanced simulation)
// @route   GET /api/ai/predictive/risk
// @access  Private (Learner - getting own risk; or Instructor/Admin getting specific user)
exports.predictRisk = asyncHandler(async (req, res, next) => {
    const userId = req.session.user.id; // Simulating for logged-in user

    const allProgress = await UserProgress.find({ user: userId })
        .populate({ path: 'course', select: 'title modules' }) // Populate course and its module IDs
        .lean(); // Use lean for faster, plain JS objects

    let riskScore = 0; let factors = []; let totalQuizzesTaken = 0; let quizzesBelowThreshold = 0;
    let totalLessonsAvailable = 0; let lessonsCompleted = 0; let hasRecentActivity = false;
    const now = Date.now(); const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let totalPoints = 0; let totalBadges = 0;

    // Fetch user's global points/badges directly
    const user = await User.findById(userId).select('points badges');
    totalPoints = user?.points || 0;
    totalBadges = user?.badges?.length || 0;


    if (!allProgress || allProgress.length === 0) {
        riskScore = 0; factors.push("No courses started."); // Low risk if nothing started
    } else {
         // Aggregate data efficiently (avoiding N+1 lesson lookups if possible)
         // Pre-fetch all relevant lesson counts for the user's courses
         const courseIds = allProgress.map(p => p.course._id);
         const lessonCounts = await Lesson.aggregate([
             { $match: { course: { $in: courseIds } } },
             { $group: { _id: '$course', count: { $sum: 1 } } }
         ]);
         const lessonCountMap = new Map(lessonCounts.map(item => [item._id.toString(), item.count]));


        for (const progress of allProgress) {
             if (progress.lastAccessed && new Date(progress.lastAccessed).getTime() > oneWeekAgo) hasRecentActivity = true;

            const courseLessonCount = lessonCountMap.get(progress.course._id.toString()) || 0;
            totalLessonsAvailable += courseLessonCount;

            if (progress.lessonStatusMap) {
                 const statuses = Array.from(progress.lessonStatusMap.values());
                 lessonsCompleted += statuses.filter(s => s.completed).length;

                 statuses.forEach(status => {
                     if (status.scorePercent !== undefined) { // Check if it's a quiz attempt
                         totalQuizzesTaken++;
                         if (status.scorePercent < 60) quizzesBelowThreshold++;
                     }
                 });
            }
        }

        // --- Refined Risk Rules ---
        if (!hasRecentActivity && allProgress.length > 0) { riskScore += 3; factors.push("Low recent activity (>1 week)."); }
        if (totalQuizzesTaken > 2 && (quizzesBelowThreshold / totalQuizzesTaken) >= 0.5) { riskScore += 5; factors.push("High percentage (>50%) of quizzes scored below 60%."); }
        else if (quizzesBelowThreshold > 0) { riskScore += 2; factors.push("One or more quizzes scored below 60%."); }
        const overallCompletion = totalLessonsAvailable > 0 ? (lessonsCompleted / totalLessonsAvailable) * 100 : 0;
        if (totalLessonsAvailable > 3 && overallCompletion < 20 && hasRecentActivity) { riskScore += 2; factors.push("Low overall completion (<20%) despite activity."); }
        if (totalPoints < 10 && lessonsCompleted > 2) { riskScore += 1; factors.push("Low points earned relative to activity."); } // Example using gamification data
    }

    let riskLevel = "Low"; if (riskScore >= 6) riskLevel = "High"; else if (riskScore >= 3) riskLevel = "Medium";

    logger.info(`Predictive Risk calculated for user ${userId}: Level=${riskLevel}, Score=${riskScore}`);
    logger.mcp(userId, null, 'predictive_risk_calculated', { riskLevel, riskScore, factors });

    res.status(200).json({ success: true, data: { riskLevel, riskScore, factors } });
});


// --- Adaptive Pathway (Enhanced Simulation - Not Real AI) ---

// @desc    Suggest next step based on progress (enhanced simulation)
// @route   GET /api/ai/adaptive/next-step/:courseId/:currentLessonId
// @access  Private (Learner)
exports.suggestNextStep = asyncHandler(async (req, res, next) => {
    const { courseId, currentLessonId } = req.params;
    const userId = req.session.user.id;

    // Fetch necessary data in parallel
    const [course, progress, currentLesson] = await Promise.all([
        Course.findById(courseId).populate({ path: 'modules', options: { sort: { order: 1 } }, populate: { path: 'lessons', select: 'title type order', options: { sort: { order: 1 } } } }),
        UserProgress.findOne({ user: userId, course: courseId }),
        Lesson.findById(currentLessonId).select('moduleId type')
    ]);

    if (!course || !currentLesson) return next(new ErrorResponse('Course or Lesson not found.', 404));

    // --- More Nuanced Suggestion Logic ---
    let suggestion = { type: 'message', message: 'Keep up the great work!' };

    // 1. Check recent quiz performance (if current lesson IS a quiz or just AFTER one)
    let lastQuizStatus = null;
    const lessonIdStr = currentLessonId.toString();
    if (currentLesson.type === 'quiz') {
         lastQuizStatus = progress?.lessonStatusMap?.get(lessonIdStr);
    } else {
         // Find the *immediately* preceding lesson in the structure
         const allLessonsFlat = course.modules.flatMap(m => m.lessons || []);
         const currentIndex = allLessonsFlat.findIndex(l => l._id.toString() === lessonIdStr);
         if(currentIndex > 0) {
              const prevLesson = allLessonsFlat[currentIndex - 1];
              if(prevLesson.type === 'quiz') {
                   lastQuizStatus = progress?.lessonStatusMap?.get(prevLesson._id.toString());
              }
         }
    }

    if (lastQuizStatus && lastQuizStatus.scorePercent !== undefined && lastQuizStatus.scorePercent < 60) {
        // Suggest reviewing the specific quiz lesson or the one before it
         const reviewLessonId = lastQuizStatus.lesson; // ID is stored in status object
         const lessonBeforeQuizId = findPreviousLessonInCourse(course, reviewLessonId.toString());
         const targetReviewId = lessonBeforeQuizId || reviewLessonId; // Prefer lesson before quiz
         const targetLesson = await Lesson.findById(targetReviewId).select('title'); // Get title

         if(targetLesson) {
              suggestion = { type: 'review', lessonId: targetReviewId, message: `Based on recent quiz results, reviewing "${targetLesson.title}" might be helpful.` };
              return res.status(200).json({ success: true, data: suggestion });
         }
    }

    // 2. Find the absolute next uncompleted lesson in sequence
    const nextUncompletedLesson = findNextUncompletedLesson(course, progress);
    if (nextUncompletedLesson) {
         suggestion = { type: 'next', lessonId: nextUncompletedLesson._id, message: `Ready for the next step? Try "${nextUncompletedLesson.title}".` };
    } else {
        // All lessons completed, check certification
        const isCertified = await checkAndGrantCertification(userId, courseId); // Re-check/grant here
        if (isCertified) {
            suggestion = { type: 'certificate', message: `Congratulations! You've completed the course requirements and earned your certificate!` };
        } else if (course.certificationCriteria) {
            suggestion = { type: 'complete_remaining', message: 'You have finished all lessons! Check if you missed any required assignments or quizzes for certification.' };
        } else {
            suggestion = { type: 'course_end', message: 'You have completed all available lessons in this course!' };
        }
    }

    res.status(200).json({ success: true, data: suggestion });
});


// --- Helper Functions for Adaptation Simulation ---

function findPreviousLessonInCourse(course, lessonId) {
     const allLessonsFlat = course.modules.flatMap(m => m.lessons || []);
     const currentIndex = allLessonsFlat.findIndex(l => l._id.toString() === lessonId);
     return currentIndex > 0 ? allLessonsFlat[currentIndex - 1]._id : null;
}

function findNextUncompletedLesson(course, progress) {
     const completedMap = progress?.lessonStatusMap || new Map();
     for (const module of course.modules) {
         for (const lesson of module.lessons) {
             const lessonIdStr = lesson._id.toString();
             if (!completedMap.get(lessonIdStr)?.completed) {
                 return lesson; // Return the full lesson object (contains _id, title)
             }
         }
     }
     return null; // All lessons completed
}