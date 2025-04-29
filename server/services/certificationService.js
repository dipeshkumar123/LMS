// server/services/certificationService.js
const progressRepo = require('../repositories/progressRepository');
const courseRepo = require('../repositories/courseRepository');
const gamificationService = require('./gamificationService');
const logger = require('../utils/logger');

const checkAndGrantCertification = async (userId, courseId) => {
    const course = await courseRepo.findCourseById(courseId);
    const progress = await progressRepo.findUserProgress(userId);
    const courseProgress = progress?.courses?.[courseId];
    const criteria = course?.certificationCriteria;

    if (!course || !progress || !courseProgress || !criteria || courseProgress.certified) {
        return courseProgress?.certified || false; // Already certified or cannot check
    }

    let meetsCriteria = true;

    // 1. Check required lessons
    if (criteria.requiredLessons && criteria.requiredLessons.length > 0) {
        for (const lessonId of criteria.requiredLessons) {
            if (!courseProgress.lessonStatus?.[lessonId]?.completed) {
                meetsCriteria = false; break;
            }
        }
    }
    if (!meetsCriteria) return false;

    // 2. Check required quizzes
    if (criteria.requiredQuizzes && Object.keys(criteria.requiredQuizzes).length > 0) {
        for (const [lessonId, minPercent] of Object.entries(criteria.requiredQuizzes)) {
            const quizStatus = courseProgress.lessonStatus?.[lessonId];
            if (!quizStatus || quizStatus.scorePercent === undefined || quizStatus.scorePercent < (minPercent * 100)) {
                meetsCriteria = false; break;
            }
        }
    }
    if (!meetsCriteria) return false;

    // 3. Check required assignments
    if (criteria.requiredAssignments && criteria.requiredAssignments.length > 0) {
        for (const moduleId of criteria.requiredAssignments) {
            // Use assignment repo or progress status
            if (!courseProgress.assignmentStatus?.[moduleId]?.submitted) {
                 meetsCriteria = false; break;
            }
        }
    }
    if (!meetsCriteria) return false;

    // Grant Certification
    if (meetsCriteria) {
        const certificationDate = new Date();
        await progressRepo.updateCertification(userId, courseId, true, certificationDate);
        logger.info(`User ${userId} certified for course ${courseId}!`);
        await gamificationService.handleCertification(userId, course); // Trigger gamification
        return true;
    }

    return false; // Requirements not met
};

module.exports = { checkAndGrantCertification };