// server/repositories/assignmentRepository.js
const { getDB } = require('../db/mongoConnection');

const COLLECTION_NAME = 'assignments';

const findSubmission = async (userId, moduleId) => {
    const db = getDB();
    return db.collection(COLLECTION_NAME).findOne({ userId: userId, moduleId: moduleId });
};

const createOrUpdateSubmission = async (submissionData) => {
    const db = getDB();
    // Use upsert to either insert or replace based on userId and moduleId
    const result = await db.collection(COLLECTION_NAME).updateOne(
        { userId: submissionData.userId, moduleId: submissionData.moduleId },
        { $set: submissionData }, // Set ensures all fields are updated/added
        { upsert: true }
    );
    return result.upsertedId || result.modifiedCount > 0 || result.matchedCount > 0;
};

// Delete all submissions by a user
 const deleteSubmissionsByUser = async (userId) => {
     const db = getDB();
     const result = await db.collection(COLLECTION_NAME).deleteMany({ userId: userId });
     return result.deletedCount;
 };


module.exports = {
    findSubmission,
    createOrUpdateSubmission,
    deleteSubmissionsByUser,
};