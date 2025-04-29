// server/services/gamificationService.js
const progressRepo = require('../repositories/progressRepository');
const forumRepo = require('../repositories/forumRepository');
const { logger } = require('../utils/logger');

const POINTS = { /* ... (copy from server.js) ... */
    LESSON_COMPLETE: 10, QUIZ_PASS: 25, QUIZ_PERFECT: 50, ASSIGNMENT_SUBMIT: 30, FORUM_POST: 5, COURSE_CERTIFIED: 100
};
const BADGES = { /* ... (copy from server.js) ... */
    COURSE_COMPLETE_CS101: { id: 'cert-cs101', name: 'CS101 Graduate', icon: '🎓' },
    FIRST_QUIZ_PASSED: { id: 'quiz-pass-1', name: 'Quiz Master Initiate', icon: '✅' },
    FIRST_FORUM_POST: { id: 'forum-post-1', name: 'Community Contributor', icon: '💬' },
    PERFECT_SCORE: { id: 'quiz-perfect-1', name: 'Flawless Victory', icon: '🎯' }
};

const awardPoints = async (userId, points, reason) => {
    await progressRepo.addPoints(userId, points);
    logger.info(`[Gamification] User ${userId} awarded ${points} points for: ${reason}`);
};

const awardBadge = async (userId, badgeKey) => {
    const badge = BADGES[badgeKey];
    if (!badge) { logger.warn(`[Gamification] Invalid badge key: ${badgeKey}`); return; }
    await progressRepo.addBadge(userId, badge.id); // Only adds if not present due to $addToSet
    // Check if it was actually added (optional, requires reading back data)
    logger.info(`[Gamification] Badge awarded (or already present): "${badge.name}" to user ${userId}`);
};

const handleLessonComplete = async (userId, lesson) => {
     await awardPoints(userId, POINTS.LESSON_COMPLETE, `Completed lesson: ${lesson.title}`);
};

const handleQuizSubmit = async (userId, lesson, scorePercent) => {
     let pointsToAward = 0;
     if (scorePercent >= 50) {
         pointsToAward += POINTS.QUIZ_PASS;
         const progress = await progressRepo.findUserProgress(userId);
         if (!progress || !progress.badges.includes(BADGES.FIRST_QUIZ_PASSED.id)) {
             await awardBadge(userId, 'FIRST_QUIZ_PASSED');
         }
     }
     if (scorePercent === 100) {
          pointsToAward += POINTS.QUIZ_PERFECT;
          const progress = await progressRepo.findUserProgress(userId);
          if (!progress || !progress.badges.includes(BADGES.PERFECT_SCORE.id)) {
              await awardBadge(userId, 'PERFECT_SCORE');
          }
     }
     if (pointsToAward > 0) {
         await awardPoints(userId, pointsToAward, `Quiz attempt on: ${lesson.title} (Score: ${scorePercent}%)`);
     }
};

const handleAssignmentSubmit = async (userId, module) => {
     // Check if user submitted this module before (requires progress repo enhancement or assignment repo check)
     // For simplicity, assume first time based on call context for now
     await awardPoints(userId, POINTS.ASSIGNMENT_SUBMIT, `Submitted assignment for module: ${module.title}`);
};

const handleForumPost = async (userId, module) => {
    const postCount = await forumRepo.countUserPosts(userId);
    if (postCount <= 1) { // Check if this is the first post
         await awardPoints(userId, POINTS.FORUM_POST, `First forum post in module: ${module.title}`);
         await awardBadge(userId, 'FIRST_FORUM_POST');
    }
};

const handleCertification = async (userId, course) => {
    await awardPoints(userId, POINTS.COURSE_CERTIFIED, `Certification for ${course.title}`);
    if (course._id === 'cs101') { // Use course ID (which is _id now)
        await awardBadge(userId, 'COURSE_COMPLETE_CS101');
    }
};

module.exports = {
    handleLessonComplete,
    handleQuizSubmit,
    handleAssignmentSubmit,
    handleForumPost,
    handleCertification,
    getAllBadgeDefinitions: () => Object.values(BADGES), // Helper to get badge info
};