// server/repositories/courseRepository.js
const { getDB } = require('../db/mongoConnection');

const COURSE_COLLECTION = 'courses';
const MODULE_COLLECTION = 'modules';
const LESSON_COLLECTION = 'lessons';

const findAllCourses = async () => {
    const db = getDB();
    return db.collection(COURSE_COLLECTION).find({}).toArray();
};

// Finds a single course by its string ID (_id)
const findCourseById = async (courseId) => {
    const db = getDB();
    return db.collection(COURSE_COLLECTION).findOne({ _id: courseId });
};

// Finds modules belonging to a specific course
const findModulesByCourseId = async (courseId) => {
    const db = getDB();
    return db.collection(MODULE_COLLECTION).find({ courseId: courseId }).toArray();
};

// Finds lessons belonging to specific module IDs
const findLessonsByModuleIds = async (moduleIds) => {
    if (!moduleIds || moduleIds.length === 0) {
        return [];
    }
    const db = getDB();
    return db.collection(LESSON_COLLECTION).find({ moduleId: { $in: moduleIds } }).toArray();
};

// Find a single lesson by its ID
const findLessonById = async (lessonId) => {
     const db = getDB();
     return db.collection(LESSON_COLLECTION).findOne({ _id: lessonId });
};

 // Find a single module by its ID
 const findModuleById = async (moduleId) => {
     const db = getDB();
     return db.collection(MODULE_COLLECTION).findOne({ _id: moduleId });
 };

// Functions to create/update courses/modules/lessons would go here if needed

module.exports = {
    findAllCourses,
    findCourseById,
    findModulesByCourseId,
    findLessonsByModuleIds,
    findLessonById,
    findModuleById,
};