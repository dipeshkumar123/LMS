// server/repositories/progressRepository.js
const { getDB } = require('../db/mongoConnection');

const PROGRESS_COLLECTION = 'userProgress';

// Gets the entire progress document for a user (_id is the userId)
const findUserProgress = async (userId) => {
    const db = getDB();
    return db.collection(PROGRESS_COLLECTION).findOne({ _id: userId });
};

// Initializes or updates a user's progress document
const upsertUserProgress = async (userId, updateData) => {
    const db = getDB();
    // Use $set to update specific fields, $inc for points, $addToSet for badges
    await db.collection(PROGRESS_COLLECTION).updateOne(
        { _id: userId },
        updateData, // e.g., { $inc: { points: 10 }, $set: { [`courses.${courseId}.lastAccessed`]: new Date() } }
        { upsert: true } // Create document if it doesn't exist
    );
};

// Specifically update lesson status within a course
const updateLessonStatus = async (userId, courseId, lessonId, statusData) => {
    const db = getDB();
    const fieldPath = `courses.${courseId}.lessonStatus.${lessonId}`;
    await db.collection(PROGRESS_COLLECTION).updateOne(
        { _id: userId },
        { $set: { [fieldPath]: statusData } },
        { upsert: true } // Ensure user/course structure exists
    );
};

// Specifically update assignment status within a course
const updateAssignmentStatus = async (userId, courseId, moduleId, statusData) => {
    const db = getDB();
    const fieldPath = `courses.${courseId}.assignmentStatus.${moduleId}`;
     await db.collection(PROGRESS_COLLECTION).updateOne(
         { _id: userId },
         { $set: { [fieldPath]: statusData } },
         { upsert: true }
     );
};

 // Add points to a user
 const addPoints = async (userId, points) => {
     if (points <= 0) return;
     const db = getDB();
     await db.collection(PROGRESS_COLLECTION).updateOne(
         { _id: userId },
         { $inc: { points: points } },
         { upsert: true }
     );
 };

 // Add a badge if it doesn't exist
 const addBadge = async (userId, badgeId) => {
     const db = getDB();
     await db.collection(PROGRESS_COLLECTION).updateOne(
         { _id: userId },
         // $addToSet ensures uniqueness in the array
         { $addToSet: { badges: badgeId } },
         { upsert: true }
     );
 };

  // Update certification status for a course
 const updateCertification = async (userId, courseId, certified, certificationDate) => {
     const db = getDB();
     const updateDoc = {
         [`courses.${courseId}.certified`]: certified,
         [`courses.${courseId}.certificationDate`]: certificationDate
     };
     await db.collection(PROGRESS_COLLECTION).updateOne(
         { _id: userId },
         { $set: updateDoc },
         { upsert: true } // Create if user/course doesn't exist
     );
 };

  // Get all progress data for leaderboard (consider performance for large user bases)
 const getLeaderboardData = async (limit = 20) => {
     const db = getDB();
     return db.collection(PROGRESS_COLLECTION)
         .find({ points: { $gt: 0 } }) // Only users with points
         .project({ _id: 1, points: 1 }) // Project only needed fields
         .sort({ points: -1 }) // Sort by points descending
         .limit(limit)
         .toArray();
 };

 // Delete all progress for a user
 const deleteProgress = async (userId) => {
      const db = getDB();
      const result = await db.collection(PROGRESS_COLLECTION).deleteOne({ _id: userId });
      return result.deletedCount > 0;
 };

module.exports = {
    findUserProgress,
    upsertUserProgress,
    updateLessonStatus,
    updateAssignmentStatus,
    addPoints,
    addBadge,
    updateCertification,
    getLeaderboardData,
    deleteProgress,
};