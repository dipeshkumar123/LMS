// utils/gamification.js
const User = require('../models/User'); // Needed for badge check
const logger = require('./logger');

const POINTS = {
    LESSON_COMPLETE: 10,
    QUIZ_PASS: 25,       // Score >= 50%
    QUIZ_PERFECT: 50,    // Score = 100%
    ASSIGNMENT_SUBMIT: 30,
    FORUM_POST: 5,       // Points for first post
    COURSE_CERTIFIED: 100
};

// Include full badge definitions here or load from DB/config if they become complex
const BADGES = {
    COURSE_COMPLETE_CS101: { id: 'cert-cs101', name: 'CS101 Graduate', description: 'Completed Introduction to Computer Science', icon: '🎓' },
    FIRST_QUIZ_PASSED: { id: 'quiz-pass-1', name: 'Quiz Master Initiate', description: 'Passed your first quiz!', icon: '✅' },
    FIRST_FORUM_POST: { id: 'forum-post-1', name: 'Community Contributor', description: 'Made your first forum post!', icon: '💬' },
    PERFECT_SCORE: { id: 'quiz-perfect-1', name: 'Flawless Victory', description: 'Achieved a perfect score on a quiz!', icon: '🎯' },
    // Add more badges as needed
};


/**
 * Awards points - Logs only, point update happens where called.
 * NOTE: This is simplified. Point update logic moved directly into controllers
 * using User.findByIdAndUpdate for atomicity (prevents race conditions).
 * This function remains mainly for logging consistency if desired, but isn't strictly needed now.
 */
// function awardPoints(userId, points, reason) {
//     if (!points || points <= 0) return;
//     logger.info(`[Gamification] User ${userId} awarded ${points} points for: ${reason}`);
//     // Point update now happens in controller: await User.findByIdAndUpdate(userId, { $inc: { points: pointsAwarded } });
// }

/**
 * Awards a badge to a user if they don't already have it.
 * Returns true if the badge was newly awarded, false otherwise.
 */
async function awardBadge(userId, badgeKey) {
    const badge = BADGES[badgeKey];
    if (!badge) {
        logger.warn(`[Gamification] Attempted to award non-existent badge key: ${badgeKey}`);
        return false;
    }
    const badgeId = badge.id; // The actual ID stored in the user document

    try {
        // Use findOneAndUpdate with $addToSet to only add if not present
        const result = await User.findOneAndUpdate(
            { _id: userId, badges: { $ne: badgeId } }, // Find user only if they DON'T have the badge
            { $addToSet: { badges: badgeId } }, // Add the badge ID to the array
            { new: false } // Don't return the updated doc, just check if modification happened
            // `result` will be the *original* document if found and updated, or null if not found/already had badge
        );

        if (result) { // If result is not null, it means the user was found WITHOUT the badge and it was added
            logger.info(`[Gamification] User ${userId} newly awarded badge: "${badge.name}" (${badgeId})`);
            return true;
        } else {
             // logger.info(`[Gamification] User ${userId} already had badge: "${badge.name}" (${badgeId}) or user not found.`);
            return false; // Badge already existed or user not found
        }
    } catch (error) {
        logger.error(`[Gamification] Error awarding badge ${badgeId} to user ${userId}:`, error);
        return false;
    }
}

/**
 * Checks certification requirements and grants if met.
 * Also handles awarding certification points/badges.
 * Needs UserProgress, Course, User models accessible.
 */
async function checkAndGrantCertification(userId, courseId) {
     const UserProgress = require('../models/UserProgress'); // Use require inside if needed, or pass models as args
     const Course = require('../models/Course');
     // const User = require('../models/User'); // Already required for awardBadge

     const course = await Course.findById(courseId).select('certificationCriteria title');
     // Find the specific user progress document
     const progress = await UserProgress.findOne({ user: userId, course: courseId });

     const criteria = course?.certificationCriteria;

     if (!progress || !criteria || progress.certified) {
         return progress?.certified || false;
     }

     let meetsCriteria = true;
     const lessonMap = progress.lessonStatusMap;
     const assignmentMap = progress.assignmentSubmittedModules;

     // Check required lessons
     if (criteria.requiredLessons && criteria.requiredLessons.length > 0) {
         for (const lessonId of criteria.requiredLessons) {
              if (!lessonMap.get(lessonId.toString())?.completed) { meetsCriteria = false; break; }
         }
     } if (!meetsCriteria) return false;

     // Check required quizzes
     if (criteria.requiredQuizzes && criteria.requiredQuizzes.size > 0) {
         for (const [lessonIdStr, minPercent] of criteria.requiredQuizzes.entries()) {
             const quizStatus = lessonMap.get(lessonIdStr);
             if (!quizStatus || quizStatus.scorePercent === undefined || quizStatus.scorePercent < minPercent) { // Compare directly with percentage
                 meetsCriteria = false; break;
             }
         }
     } if (!meetsCriteria) return false;

     // Check required assignments
     if (criteria.requiredAssignments && criteria.requiredAssignments.length > 0) {
         for (const moduleId of criteria.requiredAssignments) {
              if (!assignmentMap.get(moduleId.toString())?.submitted) { meetsCriteria = false; break; }
         }
     } if (!meetsCriteria) return false;


     // If all checks passed, update progress and award gamification
     if (meetsCriteria) {
         progress.certified = true;
         progress.certificationDate = new Date();
         await progress.save(); // Save the certification status

         logger.info(`User ${userId} certified for course ${courseId}!`);

         // Award points
         const pointsAwarded = POINTS.COURSE_CERTIFIED;
         await User.findByIdAndUpdate(userId, { $inc: { points: pointsAwarded } });
         logger.info(`[Gamification] User ${userId} awarded ${pointsAwarded} points for certification: ${course.title}`);

         // Award specific badge if configured
         if (courseId.toString() === '6552001aa1d8f7a8a9c8b3b1') { // Hardcoded ObjectId for CS101 from seeder
             await awardBadge(userId, 'COURSE_COMPLETE_CS101');
         }
         return true;
     }

     return false;
}


module.exports = {
    POINTS,
    BADGES,
    // awardPoints, // Point awarding now inline in controllers
    awardBadge,
    checkAndGrantCertification
};