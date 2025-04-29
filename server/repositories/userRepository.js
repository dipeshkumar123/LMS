// server/repositories/userRepository.js
const { getDB } = require('../db/mongoConnection');
const { ObjectId } = require('mongodb'); // Use ObjectId if needed for Mongo's default _id

const COLLECTION_NAME = 'users';

const findByUsername = async (username) => {
    const db = getDB();
    return db.collection(COLLECTION_NAME).findOne({ username: username });
};

const findById = async (userId) => {
    const db = getDB();
    // Assuming userId is stored as a string field, not the Mongo _id
    // If using Mongo _id, convert: return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(userId) });
    return db.collection(COLLECTION_NAME).findOne({ userId: userId });
};

 const findAll = async () => {
    const db = getDB();
    // Exclude password field from results
    return db.collection(COLLECTION_NAME).find({}, { projection: { password: 0 } }).toArray();
};

const createUser = async (userData) => {
    const db = getDB();
    // Ensure userData includes hashed password before calling this
    const result = await db.collection(COLLECTION_NAME).insertOne(userData);
    return result.insertedId; // Returns the MongoDB _id
};

const deleteUser = async (userId) => {
    const db = getDB();
    // Assuming deletion by custom userId string field
    const result = await db.collection(COLLECTION_NAME).deleteOne({ userId: userId });
    return result.deletedCount > 0;
};

module.exports = {
    findByUsername,
    findById,
    findAll,
    createUser, // Add if registration is implemented
    deleteUser,
};