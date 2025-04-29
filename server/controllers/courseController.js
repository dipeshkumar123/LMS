// controllers/courseController.js
const Course = require('../models/Course');
const Module = require('../models/Module'); // Needed for population potentially
const Lesson = require('../models/Lesson'); // Needed for population
const UserProgress = require('../models/UserProgress'); // Needed to check user's progress
const asyncHandler = require('../middleware/asyncHandler');
const { ErrorResponse } = require('../utils/errorResponse');

// @desc    Get all courses (basic details)
// @route   GET /api/courses
// @access  Private (User must be logged in)
exports.getCourses = asyncHandler(async (req, res, next) => {
    // TODO: Implement filtering based on user enrollment/role if needed
    // For now, return all courses with basic details
    const courses = await Course.find().select('title description courseCode instructor certificationCriteria') // Select specific fields
                                  .populate('instructor', 'name'); // Populate instructor name

    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
    });
});

// @desc    Get single course with populated modules and lessons, plus user progress
// @route   GET /api/courses/:courseId
// @access  Private
exports.getCourse = asyncHandler(async (req, res, next) => {
    const courseId = req.params.courseId;
    const userId = req.session.user.id; // Get user ID from session

    // Fetch course and populate modules -> lessons within modules
    // Sort modules and lessons by their 'order' field if available
    const course = await Course.findById(courseId)
        .populate({
            path: 'modules',
            options: { sort: { order: 1 } }, // Sort modules by order
            populate: {
                path: 'lessons',
                model: 'Lesson', // Explicitly state model for nested populate
                 options: { sort: { order: 1 } } // Sort lessons by order
                // Select specific lesson fields if needed: select: 'title type order ...'
            },
        })
        .populate('instructor', 'name'); // Populate instructor name

    if (!course) {
        return next(new ErrorResponse(`Course not found with id of ${courseId}`, 404));
    }

    // Fetch user's progress for this specific course
    const userCourseProgress = await UserProgress.findOne({ user: userId, course: courseId });

    // --- Augment course data with user progress ---
    // Mongoose objects are not directly extensible sometimes, convert to plain JS object
    const courseData = course.toObject();

    // Add completion status to lessons and module assignment status
    if (courseData.modules && courseData.modules.length > 0) {
        courseData.modules = courseData.modules.map(module => {
            if (module.lessons && module.lessons.length > 0) {
                module.lessons = module.lessons.map(lesson => {
                    const lessonIdStr = lesson._id.toString();
                    const lessonProg = userCourseProgress?.lessonStatusMap?.get(lessonIdStr);
                    return {
                        ...lesson, // Spread the original lesson data
                        completed: !!lessonProg?.completed,
                        quizScore: lessonProg?.score,
                        quizTotal: lessonProg?.total,
                        // Add other progress fields if needed
                    };
                });
            }
            // Check module assignment submission status
             if(module.hasAssignment) {
                const moduleIdStr = module._id.toString();
                module.assignmentSubmitted = !!userCourseProgress?.assignmentSubmittedModules?.get(moduleIdStr)?.submitted;
             }
            return module;
        });
    }

     // Add user's overall course certified status
     courseData.userIsCertified = userCourseProgress?.certified || false;
     // Add overall progress stats (points/badges) needed for header - already on user object?
     // If not, fetch user document here or ensure login provides it. For now, assume frontend uses /api/current-user or similar.


    res.status(200).json({
        success: true,
        data: courseData,
    });
});


// --- Placeholder Controllers for Future Functionality (Requires Instructor/Admin Roles) ---

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Admin / Instructor) - Use authorize middleware
exports.createCourse = asyncHandler(async (req, res, next) => {
     // Add validation and role check (e.g., using authorize('Instructor', 'Administrator'))
     // req.body should contain title, description, etc.
     // req.body.instructor = req.session.user.id; // Assign logged-in instructor
     // const course = await Course.create(req.body);
     // res.status(201).json({ success: true, data: course });
     res.status(501).json({ success: false, message: 'Course creation not implemented yet.' });
});

// @desc    Update course
// @route   PUT /api/courses/:courseId
// @access  Private (Admin / Instructor who owns course)
exports.updateCourse = asyncHandler(async (req, res, next) => {
     // Add validation, role check, ownership check
     // let course = await Course.findById(req.params.courseId);
     // if (!course) return next(...);
     // // Check ownership: if (course.instructor.toString() !== req.session.user.id && req.session.user.role !== 'Administrator') return next(...);
     // course = await Course.findByIdAndUpdate(req.params.courseId, req.body, { new: true, runValidators: true });
     // res.status(200).json({ success: true, data: course });
     res.status(501).json({ success: false, message: 'Course update not implemented yet.' });
});

// @desc    Delete course
// @route   DELETE /api/courses/:courseId
// @access  Private (Admin / Instructor who owns course)
exports.deleteCourse = asyncHandler(async (req, res, next) => {
     // Add validation, role check, ownership check
     // const course = await Course.findById(req.params.courseId);
     // if (!course) return next(...);
     // // Check ownership
     // // IMPORTANT: Implement cascading delete carefully (remove modules, lessons, progress, submissions etc.)
     // // This often involves pre-remove middleware in the Mongoose schemas or manual deletion logic here.
     // // await course.remove(); // Triggers 'remove' middleware if defined
     // res.status(200).json({ success: true, data: {} });
     res.status(501).json({ success: false, message: 'Course deletion not implemented yet.' });
});