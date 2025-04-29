// seeder.js
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs'); // Needed to manually hash seed passwords
const connectDB = require('./config/db'); // Import the DB connection function

// Load env vars
dotenv.config(); // Load .env file from root

// Load models
const User = require('./models/User');
const Course = require('./models/Course');
const Module = require('./models/Module');
const Lesson = require('./models/Lesson');
const UserProgress = require('./models/UserProgress');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const ForumPost = require('./models/ForumPost');

// --- Seed Data (Adapted from in-memory stores) ---

const seedUsers = [
    { _id: new mongoose.Types.ObjectId("6551ff89a1d8f7a8a9c8b3a1"), username: 'student1', name: 'Alice Student', password: 'password123', role: 'Learner', points: 15, badges: ['forum-post-1'] }, // Example gamification data
    { _id: new mongoose.Types.ObjectId("6551ff89a1d8f7a8a9c8b3a2"), username: 'instructor1', name: 'Bob Instructor', password: 'password123', role: 'Instructor' },
    { _id: new mongoose.Types.ObjectId("6551ff89a1d8f7a8a9c8b3a3"), username: 'admin1', name: 'Charlie Admin', password: 'password123', role: 'Administrator' }
];

// Define ObjectIds manually so we can link documents
const courseCS101Id = new mongoose.Types.ObjectId("6552001aa1d8f7a8a9c8b3b1");
const courseMath101Id = new mongoose.Types.ObjectId("6552001aa1d8f7a8a9c8b3b2");

const moduleCS101M1Id = new mongoose.Types.ObjectId("6552007ca1d8f7a8a9c8b3c1");
const moduleCS101M2Id = new mongoose.Types.ObjectId("6552007ca1d8f7a8a9c8b3c2");
const moduleMath101M1Id = new mongoose.Types.ObjectId("6552007ca1d8f7a8a9c8b3c3");

const lessonCS101M1L1Id = new mongoose.Types.ObjectId("655200cba1d8f7a8a9c8b3d1");
const lessonCS101M1L2Id = new mongoose.Types.ObjectId("655200cba1d8f7a8a9c8b3d2");
const lessonCS101M1L3Id = new mongoose.Types.ObjectId("655200cba1d8f7a8a9c8b3d3"); // Quiz
const lessonCS101M2L1Id = new mongoose.Types.ObjectId("655200cba1d8f7a8a9c8b3d4");
const lessonMath101M1L1Id = new mongoose.Types.ObjectId("655200cba1d8f7a8a9c8b3d5");

const instructor1Id = seedUsers[1]._id; // Bob Instructor


const seedCourses = [
    {
        _id: courseCS101Id,
        title: 'Introduction to Computer Science',
        description: 'Learn the fundamentals of programming and computer science.',
        instructor: instructor1Id,
        modules: [moduleCS101M1Id, moduleCS101M2Id],
        courseCode: 'cs101',
        certificationCriteria: {
            requiredLessons: [lessonCS101M1L1Id, lessonCS101M1L2Id, lessonCS101M1L3Id, lessonCS101M2L1Id],
            requiredQuizzes: { [lessonCS101M1L3Id.toString()]: 50 }, // Key needs to be string, value is percent
            requiredAssignments: [moduleCS101M2Id]
        }
    },
    {
        _id: courseMath101Id,
        title: 'Calculus I',
        description: 'Differential calculus concepts.',
        instructor: instructor1Id,
        modules: [moduleMath101M1Id],
        courseCode: 'math101',
    }
];

const seedModules = [
    { _id: moduleCS101M1Id, title: 'Module 1: Programming Basics', course: courseCS101Id, lessons: [lessonCS101M1L1Id, lessonCS101M1L2Id, lessonCS101M1L3Id], order: 1 },
    { _id: moduleCS101M2Id, title: 'Module 2: Data Structures', course: courseCS101Id, lessons: [lessonCS101M2L1Id], order: 2, hasAssignment: true, assignmentDescription: 'Implement a simple linked list.' },
    { _id: moduleMath101M1Id, title: 'Module 1: Limits', course: courseMath101Id, lessons: [lessonMath101M1L1Id], order: 1 },
];

const seedLessons = [
    { _id: lessonCS101M1L1Id, title: 'Lesson: What is Code?', module: moduleCS101M1Id, course: courseCS101Id, type: 'text', content: 'Code is a set of instructions...', order: 1 },
    { _id: lessonCS101M1L2Id, title: 'Lesson: Your First Program (Video)', module: moduleCS101M1Id, course: courseCS101Id, type: 'video', videoUrl: '/videos/placeholder.mp4', order: 2 }, // Ensure placeholder video exists
    { _id: lessonCS101M1L3Id, title: 'Quiz: Programming Basics', module: moduleCS101M1Id, course: courseCS101Id, type: 'quiz', order: 3, questions: [
        { q: 'What does "compile" mean?', options: ['Run', 'Translate to machine code', 'Debug'], correct: 1 },
        { q: 'Which is a basic data type?', options: ['Integer', 'Function', 'Loop'], correct: 0 }
    ]},
    { _id: lessonCS101M2L1Id, title: 'Lesson: Introduction to Linked Lists', module: moduleCS101M2Id, course: courseCS101Id, type: 'text', content: 'A linked list is a linear data structure...', order: 1 },
    { _id: lessonMath101M1L1Id, title: 'Lesson: Understanding Limits', module: moduleMath101M1Id, course: courseMath101Id, type: 'text', content: 'The limit of a function...', order: 1 }
];

// Example Progress Data
const seedUserProgress = [
    {
        user: seedUsers[0]._id, // Alice Student
        course: courseCS101Id,
        lessonStatusMap: {
            [lessonCS101M1L1Id.toString()]: { lesson: lessonCS101M1L1Id, completed: true, completedAt: new Date(Date.now() - 86400000) }, // Completed yesterday
            [lessonCS101M1L2Id.toString()]: { lesson: lessonCS101M1L2Id, completed: false }, // Not completed
        },
         assignmentSubmittedModules: {
              // No assignments submitted yet in this example
         },
        certified: false,
        lastAccessed: new Date()
    }
];

// Example Forum Post
const seedForumPosts = [
     {
          user: seedUsers[0]._id, // Alice
          userName: seedUsers[0].name,
          course: courseCS101Id,
          module: moduleCS101M1Id,
          text: "This is the first seeded forum post!",
          createdAt: new Date(Date.now() - 3600000) // Posted an hour ago
     }
];


// --- Seeder Functions ---

// Import data into DB
const importData = async () => {
    try {
        // Clear existing data (optional, but recommended for clean seed)
        await deleteDataSilent(); // Call delete without exiting process

        // Create users using the User model directly to trigger the pre-save middleware
        const userPromises = seedUsers.map(userData => {
            const user = new User(userData);
            return user.save(); // This will trigger the password hashing middleware
        });
        await Promise.all(userPromises);

        // Insert other data
        await Course.create(seedCourses);
        await Module.create(seedModules);
        await Lesson.create(seedLessons);
        await UserProgress.create(seedUserProgress);
        await ForumPost.create(seedForumPosts);
        // Assignment Submissions collection will be empty initially

        console.log('[INFO] Data Imported Successfully!');
        process.exit();
    } catch (err) {
        console.error(`[ERROR] Data Import Failed: ${err}`);
        process.exit(1);
    }
};

// Delete data from DB
const deleteData = async () => {
    try {
        await deleteDataSilent();
        console.log('[INFO] Data Destroyed Successfully!');
        process.exit();
    } catch (err) {
        console.error(`[ERROR] Data Deletion Failed: ${err}`);
        process.exit(1);
    }
};

// Delete data without exiting (for use before import)
const deleteDataSilent = async () => {
     console.log('[INFO] Deleting existing data...');
     await User.deleteMany();
     await Course.deleteMany();
     await Module.deleteMany();
     await Lesson.deleteMany();
     await UserProgress.deleteMany();
     await AssignmentSubmission.deleteMany();
     await ForumPost.deleteMany();
     // Also clear sessions collection if needed (handled separately usually)
     // await mongoose.connection.db.collection('sessions').deleteMany({});
     console.log('[INFO] Existing data deleted.');
}

// Script execution logic
const run = async () => {
    await connectDB(); // Wait for DB connection
    if (process.argv[2] === '-d') {
        await deleteData();
    } else {
        await importData();
    }
};

run();