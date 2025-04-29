// utils/gamificationHelpers.js
const User = require('../models/User'); // Need User model to update points/badges
const logger = require('./logger');

// Define Points and Badges constants here or import from a config file
const POINTS = {
    LESSON_COMPLETE: 10,
    QUIZ_ATTEMPT: 5, // Base points for trying
    QUIZ_PASS: 20, // Additional points for passing (>= 50%)
    QUIZ_PERFECT: 25, // Additional points for 100%
    ASSIGNMENT_SUBMIT: 30, // Points for first submission
    FORUM_POST: 5, // Points for first post
    COURSE_CERTIFIED: 100
};

const BADGES = {
    // Badge definitions (id, name, description, icon)
    COURSE_COMPLETE_CS101: { id: 'cert-cs101', name: 'CS101 Graduate', description: 'Completed Introduction to Computer Science', icon: '🎓' },
    FIRST_QUIZ_PASSED: { id: 'quiz-pass-1', name: 'Quiz Master Initiate', description: 'Passed your first quiz!', icon: '✅' },
    FIRST_FORUM_POST: { id: 'forum-post-1', name: 'Community Contributor', description: 'Made your first forum post!', icon: '💬' },
    PERFECT_SCORE: { id: 'quiz-perfect-1', name: 'Flawless Victory', description: 'Achieved a perfect score on a quiz!', icon: '🎯' },
};


/**
 * Awards points to a user.
 * @param {string} userId - The ObjectId of the user.
 * @param {string} pointKey - The key from the POINTS object (e.g., 'LESSON_COMPLETE').
 * @param {string} reason - A description for logging.
 * @param {object} context - Optional context (e.g., { scorePercent: 75 }) for conditional points.
 */
const awardPoints = async (userId, pointKey, reason, context = {}) => {
    let pointsToAward = POINTS[pointKey] || 0;

    // Conditional points based on context (e.g., for quizzes)
     if (pointKey === 'QUIZ_ATTEMPT' && context.scorePercent !== undefined) {
         pointsToAward = POINTS.QUIZ_ATTEMPT; // Base points for attempting
         if(context.scorePercent >= 50) {
              pointsToAward += POINTS.QUIZ_PASS;
         }
         // Note: QUIZ_PERFECT is handled separately below or could be added here too.
     }
     // Add other conditions if needed


    if (pointsToAward <= 0) return; // No points to award

    try {
        // Atomically update points using $inc
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { points: pointsToAward } },
            { new: true } // Return the updated document if needed elsewhere
        );

        if (updatedUser) {
            logger.info(`[Gamification] User ${userId} awarded ${pointsToAward} points for: ${reason}. New total: ${updatedUser.points}`);
        } else {
             logger.warn(`[Gamification] Could not find user ${userId} to award points.`);
        }
    } catch (error) {
        logger.error(`[Gamification] Error awarding points to user ${userId}:`, error);
    }
};

/**
 * Awards a badge to a user if they don't already have it.
 * @param {string} userId - The ObjectId of the user.
 * @param {string} badgeKey - The key from the BADGES object (e.g., 'FIRST_QUIZ_PASSED').
 */
const awardBadge = async (userId, badgeKey) => {
    const badge = BADGES[badgeKey];
    if (!badge) {
        logger.warn(`[Gamification] Attempted to award non-existent badge key: ${badgeKey}`);
        return;
    }

    try {
        // Add badge ID to user's badges array only if it doesn't already exist ($addToSet)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { badges: badge.id } }, // $addToSet prevents duplicates
            { new: true }
        );

        // Check if the badge was actually added (length increased or check if badge.id is now present)
        // $addToSet doesn't explicitly tell you if it added, so check the result
        if (updatedUser && updatedUser.badges.includes(badge.id)) {
             // Check if it was *just* added (more complex, might need pre-check)
             // For simplicity, we log every time the update succeeds and the badge is present.
            logger.info(`[Gamification] User ${userId} awarded or already has badge: "${badge.name}" (${badge.id})`);
            // Could query before update to log only on first award:
            // const userBefore = await User.findById(userId).select('badges');
            // if (!userBefore.badges.includes(badge.id)) { /* log first time award */ }
        } else if (!updatedUser) {
            logger.warn(`[Gamification] Could not find user ${userId} to award badge ${badge.id}.`);
        }
    } catch (error) {
         logger.error(`[Gamification] Error awarding badge ${badge.id} to user ${userId}:`, error);
    }
};


/**
 * Checks certification criteria and grants status/points/badge.
 * (This function could live here or in a course specific helper)
 * Assumes Course, UserProgress models are available or passed in.
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<boolean>} - True if certified, false otherwise.
 */
const checkAndGrantCertification = async (userId, courseId) => {
    // Need to import Course model here or pass criteria in
    const Course = require('../models/Course'); // Relative path might differ if utils is moved
     const UserProgress = require('../models/UserProgress');

    const course = await Course.findById(courseId).select('certificationCriteria title');
    const progress = await UserProgress.findOne({ user: userId, course: courseId });
    const criteria = course?.certificationCriteria;

    if (!progress || !criteria || progress.certified) {
        return progress?.certified || false;
    }

    let meetsCriteria = true;

    // 1. Check Lessons
    if (criteria.requiredLessons && criteria.requiredLessons.length > 0) {
        for (const lessonId of criteria.requiredLessons) {
            if (!progress.lessonStatusMap.get(lessonId.toString())?.completed) {
                meetsCriteria = false; break;
            }
        }
    }
    if (!meetsCriteria) return false;

    // 2. Check Quizzes
    if (criteria.requiredQuizzes && criteria.requiredQuizzes.size > 0) {
        for (const [lessonIdStr, minPercent] of criteria.requiredQuizzes.entries()) {
            const quizStatus = progress.lessonStatusMap.get(lessonIdStr);
            // Use scorePercent which is already calculated and stored
            if (!quizStatus || quizStatus.scorePercent === undefined || quizStatus.scorePercent < minPercent) {
                 meetsCriteria = false; break;
            }
        }
    }
    if (!meetsCriteria) return false;

    // 3. Check Assignments
    if (criteria.requiredAssignments && criteria.requiredAssignments.length > 0) {
        for (const moduleId of criteria.requiredAssignments) {
            if (!progress.assignmentSubmittedModules.get(moduleId.toString())?.submitted) {
                meetsCriteria = false; break;
            }
        }
    }
    if (!meetsCriteria) return false;

    // All criteria met
    if (meetsCriteria) {
        progress.certified = true;
        progress.certificationDate = new Date();
        await progress.save();
        logger.info(`User ${userId} HAS BEEN CERTIFIED for course ${courseId}!`);

        // Award gamification points/badges
        await awardPoints(userId, 'COURSE_CERTIFIED', `Certification for ${course.title}`);
        if (courseId.toString() === '6552001aa1d8f7a8a9c8b3b1') { // Check against the known ObjectID string for CS101
            await awardBadge(userId, 'COURSE_COMPLETE_CS101');
        }
        return true;
    }

    return false;
};


module.exports = {
    awardPoints,
    awardBadge,
    checkAndGrantCertification,
    POINTS, // Export constants if needed elsewhere
    BADGES
};