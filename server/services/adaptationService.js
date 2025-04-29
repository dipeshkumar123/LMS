// server/services/adaptationService.js
const progressRepo = require('../repositories/progressRepository');
const courseRepo = require('../repositories/courseRepository');
const certificationService = require('./certificationService'); // Use the service

// Helper to find lesson data (could be moved to utils or course service)
const findLessonByIdLocally = async (lessonId) => {
     // In a real app, fetch lesson details if not already loaded
     // For now, assume courseRepo.findLessonById exists and is fast enough
     return courseRepo.findLessonById(lessonId);
}

const getNextStepSuggestion = async (userId, courseId, currentLessonId) => {
    const course = await courseRepo.findCourseById(courseId);
    const progress = await progressRepo.findUserProgress(userId);
    const courseProgress = progress?.courses?.[courseId];
    const currentLesson = await findLessonByIdLocally(currentLessonId);

    if (!course || !currentLesson) return { type: 'error', message: 'Course or Lesson context not found.' };

    const currentModule = await courseRepo.findModuleById(currentLesson.moduleId);
    if (!currentModule) return { type: 'error', message: 'Module context not found.' };

    // Fetch all lessons for the course's modules to determine sequence
    const allModules = await courseRepo.findModulesByCourseId(courseId);
    const allLessons = await courseRepo.findLessonsByModuleIds(allModules.map(m => m._id)); // Assumes _id is string module ID

    // --- Simple Rule 1: Check last quiz performance in the *current* module ---
    const moduleLessonIds = allModules.find(m => m._id === currentModule._id)?.lessons || [];
    const currentIndexInModule = moduleLessonIds.indexOf(currentLessonId);
    let lastQuizLessonId = null;
    for (let i = currentIndexInModule - 1; i >= 0; i--) {
        const lessonId = moduleLessonIds[i];
        const lesson = allLessons.find(l => l._id === lessonId);
        if (lesson?.type === 'quiz' && courseProgress?.lessonStatus?.[lessonId]?.submittedAt) {
             lastQuizLessonId = lessonId;
             break; // Found the most recent quiz *before* current lesson in this module
        }
    }

    if (lastQuizLessonId && courseProgress?.lessonStatus?.[lastQuizLessonId]) {
        const quizStatus = courseProgress.lessonStatus[lastQuizLessonId];
        if (quizStatus.scorePercent !== undefined && quizStatus.scorePercent < 60) {
            const prevLessonId = (currentIndexInModule > 0) ? moduleLessonIds[currentIndexInModule - 1] : null;
            const reviewLessonId = prevLessonId || currentLessonId; // Fallback to current
             const lastQuizLesson = await findLessonByIdLocally(lastQuizLessonId);
             const reviewLesson = await findLessonByIdLocally(reviewLessonId);
            return {
                type: 'review',
                lessonId: reviewLessonId,
                message: `Based on recent results on "${lastQuizLesson?.title || 'last quiz'}", review "${reviewLesson?.title || 'previous content'}".`
            };
        }
    }

    // --- Simple Rule 2: Find the next logical lesson in the *entire* course sequence ---
     let foundCurrent = false;
     let nextLessonId = null;
     for(const mod of allModules.sort((a, b) => course.modules.indexOf(a._id) - course.modules.indexOf(b._id))) { // Sort modules by order in course.modules
         for(const lessonId of mod.lessons) {
              if (foundCurrent) {
                  nextLessonId = lessonId;
                  break;
              }
              if (lessonId === currentLessonId) {
                  foundCurrent = true;
              }
         }
         if (nextLessonId) break;
     }


    if (nextLessonId) {
         const nextLesson = await findLessonByIdLocally(nextLessonId);
        return {
            type: 'next',
            lessonId: nextLessonId,
            message: `Ready for the next step? Try "${nextLesson?.title || 'next lesson'}".`
        };
    } else {
        // No more lessons, check certification
        const isCertified = await certificationService.checkAndGrantCertification(userId, courseId);
        if (isCertified) {
            return { type: 'certificate', message: `Congratulations! You've completed the course requirements and earned your certificate!` };
        } else if (course.certificationCriteria){
            return { type: 'complete_remaining', message: 'You are near the end! Complete remaining activities for your certificate.' };
        } else {
            return { type: 'course_end', message: 'You have completed all available lessons in this course!' };
        }
    }
};

module.exports = { getNextStepSuggestion };