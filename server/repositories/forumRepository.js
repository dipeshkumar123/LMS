// server/repositories/forumRepository.js
const { getDB } = require('../db/mongoConnection');

const COLLECTION_NAME = 'forumPosts';

const findPostsByModuleId = async (moduleId) => {
    const db = getDB();
    return db.collection(COLLECTION_NAME)
        .find({ moduleId: moduleId })
        .sort({ timestamp: -1 }) // Sort newest first
        .toArray();
};

const createPost = async (postData) => {
    const db = getDB();
    // Ensure timestamp is ISODate
    postData.timestamp = new Date(postData.timestamp);
    const result = await db.collection(COLLECTION_NAME).insertOne(postData);
    return result.insertedId;
};

const countUserPosts = async (userId) => {
     const db = getDB();
     return db.collection(COLLECTION_NAME).countDocuments({ userId: userId });
}

 // Delete all posts by a user
 const deletePostsByUser = async (userId) => {
     const db = getDB();
     const result = await db.collection(COLLECTION_NAME).deleteMany({ userId: userId });
     return result.deletedCount;
 };

module.exports = {
    findPostsByModuleId,
    createPost,
    countUserPosts,
    deletePostsByUser,
};