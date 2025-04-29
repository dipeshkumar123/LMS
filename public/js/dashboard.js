// public/js/dashboard.js
// Phase 2 Update: Added analytics loading and display.
// Phase 4 Update: Display points/badges in header and analytics cards.
// Phase 5 Update: Fetch and display predictive risk level.
// Make sure auth.js is loaded first, as we rely on checkLoginStatus and fetchAPI

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard script loaded');

    // --- DOM Elements ---
    const courseListElement = document.getElementById('course-list');
    const analyticsContentElement = document.getElementById('analytics-content');
    const roleSpecificLinksElement = document.getElementById('role-specific-links'); // Updated ID from HTML
    // Phase 4 Gamification Header Elements
    const userPointsElement = document.getElementById('user-points');
    const userBadgesSummaryElement = document.getElementById('user-badges-summary');
    // Phase 5 Element
    const userRiskLevelElement = document.getElementById('user-risk-level');

    // --- Basic Checks ---
    if (!courseListElement || !analyticsContentElement || !userPointsElement || !userBadgesSummaryElement || !userRiskLevelElement) {
        console.error('Dashboard init failed: Required elements not found.');
        return;
    }

    // 1. Check login status and get user info
    const currentUser = await checkLoginStatus(true); // Redirects if not logged in
    if (!currentUser) {
        // // Handle cases where checkLoginStatus might fail without redirecting (e.g., server error)
        // courseListElement.innerHTML = '<p class="error-message">Could not verify user session.</p>';
        // analyticsContentElement.innerHTML = '<p class="error-message">Cannot load analytics without user session.</p>';
        // updateHeaderGamification(null); // Show loading/error state in header
        return;
    }

    // Initialize header display
    updateHeaderGamification(null); // Show loading state
    userRiskLevelElement.style.display = 'none'; // Hide risk initially

    // Show loading states
    analyticsContentElement.innerHTML = '<p>Loading analytics data...</p>';
    courseListElement.innerHTML = '<p>Loading available courses...</p>';

    // --- Phase 5: Fetch Predictive Risk in Parallel ---
    const loadDataPromises = [
        // Fetch Courses
        fetchAPI('/courses') // Endpoint relative to /api
            .then(coursesData => {
                // API might return { success: true, count: N, data: [...] }
                // fetchAPI helper should already extract the 'data' part if present
                const courses = coursesData || []; // Ensure it's an array
                if (courses.length === 0) {
                    courseListElement.innerHTML = '<p>No courses available.</p>';
                    analyticsContentElement.innerHTML = '<p>No course analytics to display.</p>';
                    updateHeaderGamification({ points: 0, badges: [] }); // Default if no courses
                } else {
                    renderCourseCards(courses, courseListElement);
                    // Fetch analytics *after* getting course list
                    loadDashboardAnalytics(courses, analyticsContentElement, currentUser.id);
                }
            })
            .catch(error => {
                console.error('Failed to load courses:', error);
                courseListElement.innerHTML = `<p class="error-message">Error loading courses: ${error.message}.</p>`;
                analyticsContentElement.innerHTML = `<p class="error-message">Cannot load analytics.</p>`;
                updateHeaderGamification(null); // Error state
            }),

        // Fetch Predictive Risk
        fetchAPI('/ai/predictive/risk') // Endpoint relative to /api
            .then(riskData => {
                // Expected: { success: true, data: { riskLevel, factors } }
                // fetchAPI extracts the inner 'data' object
                renderRiskLevel(riskData);
            })
            .catch(error => {
                console.error("Failed to fetch risk level:", error);
                renderRiskLevel({ error: true, message: error.message }); // Pass error to renderer
            })
    ];

    // Wait for all initial data loading to settle
    await Promise.allSettled(loadDataPromises);


    // 3. (Optional) Add role-specific elements (Unchanged logic, updated element ID)
    if (roleSpecificLinksElement) { // Check if element exists
        if (currentUser.role === 'Administrator') {
            roleSpecificLinksElement.innerHTML = `
                <p><strong>Admin Tools:</strong> <a href="#">Manage Users (Not Implemented)</a> | <a href="#">System Settings (Not Implemented)</a></p>
            `;
        } else if (currentUser.role === 'Instructor') {
            roleSpecificLinksElement.innerHTML = `
                <p><strong>Instructor Tools:</strong> <a href="#">View Submissions (Not Implemented)</a> | <a href="#">Create Course (Not Implemented)</a></p>
            `;
        }
    }

}); // End DOMContentLoaded


/**
 * Renders the course cards into the specified container.
 * @param {Array} courses - Array of course objects.
 * @param {HTMLElement} containerElement - The element to append cards to.
 */
function renderCourseCards(courses, containerElement) {
    containerElement.innerHTML = ''; // Clear loading/previous content
    courses.forEach(course => {
        const courseCard = createCourseCardElement(course);
        containerElement.appendChild(courseCard);
    });
}

/** Creates course card element - use course._id */
function createCourseCardElement(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    // Use _id from MongoDB document
    card.innerHTML = `
        <h3>${escapeHTML(course.title || 'Untitled Course')}</h3>
        <p>${escapeHTML(course.description || 'No description.')}</p>
        <a href="/course.html?courseId=${course._id}" class="btn">View Course</a>
    `;
    return card;
}

/**
 * Fetches analytics data for each course and renders it.
 * @param {Array} courses - List of available courses.
 * @param {HTMLElement} containerElement - The element to render analytics into.
 * @param {string} userId - The ID of the current user (though API uses session).
 */
async function loadDashboardAnalytics(courses, containerElement, userId) {
     containerElement.innerHTML = ''; // Clear loading message
     let gamificationHeaderUpdated = false; // Flag to update header only once

    if (!courses || courses.length === 0) {
        containerElement.innerHTML = '<p>No courses to analyze.</p>';
        return;
    }

    // Use Promise.all to fetch analytics for all courses concurrently
    const analyticsPromises = courses.map(course =>
        fetchAPI(`/analytics/user/course/${course._id}`)
            .catch(error => ({ // Handle errors for individual course analytics fetch
                error: true,
                courseId: course._id,
                message: error.message || `Failed to load analytics for ${course.title}`
            }))
    );

    try {
        const analyticsResults = await Promise.allSettled(analyticsPromises);

        if (analyticsResults.length === 0) {
             containerElement.innerHTML = '<p>No analytics data available.</p>';
             updateHeaderGamification({ points: 0, badges: [] }); // Update header if no results
             return;
        }

        // Render a card for each result
        analyticsResults.forEach(result => {
            if (result.status === 'fulfilled') {
                 const analyticsData = result.value; // fetchAPI should have extracted nested data
                 if (!gamificationHeaderUpdated && analyticsData?.points !== undefined) {
                      // Update header from the first valid analytics response
                      updateHeaderGamification({ points: analyticsData.points, badges: analyticsData.badges });
                      gamificationHeaderUpdated = true;
                 }
                 // Render the card
                 const analyticsCard = createAnalyticsCardElement(analyticsData, courses); // Pass courses if needed for title lookup on error
                 containerElement.appendChild(analyticsCard);

            } else { // Promise was rejected
                 const errorInfo = result.reason || {}; // Get the error object
                 const errorCard = document.createElement('div');
                 errorCard.className = 'analytics-card';
                 // Find course title for context
                 const failedCourse = courses.find(c => c._id === errorInfo.courseId);
                 errorCard.innerHTML = `<h4>${escapeHTML(failedCourse?.title || 'Unknown Course')}</h4>
                                         <p class="error-message">Error loading analytics: ${errorInfo.message || 'Failed'}</p>`;
                 containerElement.appendChild(errorCard);
            }
        });

        // If somehow no valid data was received to update header, set defaults
        if (!gamificationHeaderUpdated) {
            updateHeaderGamification({ points: 0, badges: [] });
       }

    } catch (error) {
        // This catch block might be less likely to hit if Promise.all has individual catches,
        // but good for general/unexpected errors during Promise.all itself.
        console.error('Error loading dashboard analytics:', error);
        containerElement.innerHTML = `<p class="error-message">A general error occurred while loading analytics: ${error.message}</p>`;
        updateHeaderGamification(null);
    }
}

/**
 * Creates an HTML element representing an analytics summary card for a course.
 * @param {object} analyticsData - The analytics data for one course from the API.
 * @returns {HTMLElement} - The analytics card div element.
 */
function createAnalyticsCardElement(analyticsData, allCourses) {
    const card = document.createElement('div');
    card.className = 'analytics-card';

    // Default values if data is incomplete
    const title = analyticsData?.courseTitle || allCourses?.find(c => c._id === analyticsData?.courseId)?.title || 'Unknown Course';
    const completionRate = analyticsData?.completionRate || 0;
    const lessonsCompleted = analyticsData?.lessonsCompleted || 0;
    const totalLessons = analyticsData?.totalLessons || 0;
    const quizScores = analyticsData?.quizScores || {};
    const certStatus = analyticsData?.certified || false;
    const hasCriteria = analyticsData?.hasCertificationCriteria || false;
    const badgeIds = analyticsData?.badges || []; // Now just an array of badge IDs

    // Avg Quiz Score Calc
    let avgQuizScore = 'N/A'; let quizCount = 0; /* ... calculation (same as before) ... */
    if (quizScores && Object.keys(quizScores).length > 0) { quizCount = Object.keys(quizScores).length; let totalScorePercent = 0; Object.values(quizScores).forEach(q => totalScorePercent += (q.scorePercent || 0)); avgQuizScore = quizCount > 0 ? (totalScorePercent / quizCount).toFixed(1) + '%' : 'N/A'; }

    // Cert Status Text/Class
     const certClass = certStatus ? 'certified' : 'not-certified';
     const certText = certStatus ? 'Certified' : 'Not Certified';

    // Check Requirements Link
    const showCheckRequirementsLink = !certStatus && hasCriteria;

    // --- Display Badge Icon ---
    // Since we only have badge IDs now, we need a way map IDs to icons.
    // This mapping could be fetched via /api/gamification/badges or hardcoded for simplicity.
    // Hardcoding for now:
    const badgeIconMap = {
        'cert-cs101': '🎓',
        'quiz-pass-1': '✅',
        'forum-post-1': '💬',
        'quiz-perfect-1': '🎯'
        // Add others as defined in backend
   };
   let certBadgeIcon = '';
   if (certStatus) {
       // Find if a *relevant* completion badge ID exists
       const completionBadgeId = `cert-${analyticsData?.courseId}`; // Simple guess, needs better mapping maybe
       const cs101BadgeId = 'cert-cs101'; // Specific example
       if (badgeIds.includes(cs101BadgeId) && analyticsData?.courseId === "6552001aa1d8f7a8a9c8b3b1") { // Check specific CS101 ObjectId
            certBadgeIcon = `<span title="CS101 Graduate">${badgeIconMap[cs101BadgeId] || '🏆'}</span>`;
       } else if (badgeIds.includes(completionBadgeId) && badgeIconMap[completionBadgeId]) {
             certBadgeIcon = `<span title="Course Certified">${badgeIconMap[completionBadgeId]}</span>`;
       } else if (badgeIds.some(id => id.startsWith('cert-'))) { // Generic check if *any* cert badge exists
            certBadgeIcon = `<span title="Course Certified">🏆</span>`;
       }
   }

   card.innerHTML = `
   <h4>${escapeHTML(title)}</h4>
   <p>Completion: <strong>${completionRate}%</strong> (${lessonsCompleted} / ${totalLessons} lessons)</p>
   <p>Avg. Quiz Score: <strong>${avgQuizScore}</strong> (${quizCount} quizzes taken)</p>
   <p>Status: <span class="certificate-status ${certClass}">${certText} ${certBadgeIcon}</span></p>
   ${showCheckRequirementsLink ? `<a href="/course.html?courseId=${analyticsData?.courseId}#check-cert" class="check-cert-link">Check Requirements</a>` : ''}
   ${certStatus ? `<a href="#" class="view-cert-link">(View Certificate - NI)</a>` : ''}
`;

    const viewCertLink = card.querySelector('.view-cert-link');
    if(viewCertLink) {
        viewCertLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            alert('Certificate viewing is not implemented yet.');
        });
    }


    return card;
}

/** Updates header points/badges display */
function updateHeaderGamification(gamificationData) {
    const userPointsElement = document.getElementById('user-points');
    const userBadgesSummaryElement = document.getElementById('user-badges-summary');
    if (!userPointsElement || !userBadgesSummaryElement) return;

    if (gamificationData) {
        userPointsElement.textContent = `${gamificationData.points || 0}`;
        // Expect badges to be an array of IDs or objects now, handle both
        const badgeCount = Array.isArray(gamificationData.badges) ? gamificationData.badges.length : (gamificationData.badgesCount !== undefined ? gamificationData.badgesCount : 0);
        userBadgesSummaryElement.textContent = `${badgeCount}`;
        userPointsElement.title = `Total Points: ${gamificationData.points || 0}`;
        // Tooltip update might need separate fetch for badge names if only IDs are passed
        userBadgesSummaryElement.title = `Earned Badges: ${badgeCount}`;
    } else { // Loading or error state
        userPointsElement.textContent = `...`; userBadgesSummaryElement.textContent = `...`;
        userPointsElement.title = `Total Points: Loading...`; userBadgesSummaryElement.title = `Earned Badges: Loading...`;
    }
}

/**
 * Displays the fetched predictive risk level and factors.
 * @param {object} riskData - Object like { riskLevel: 'Low'|'Medium'|'High', factors: Array<string> }
 */
function renderRiskLevel(riskData) {
    const riskElement = document.getElementById('user-risk-level');
    if (!riskElement) return;

    if (riskData?.error) { // Check for explicit error flag
        riskElement.innerHTML = `<p class="error-message">Could not load risk assessment: ${riskData.message || 'Unknown error'}</p>`;
        riskElement.className = 'risk-level-display';
        riskElement.style.display = 'block';
        return;
   }

    if (!riskData || !riskData.riskLevel) {
        riskElement.innerHTML = `<p class="error-message">Risk data unavailable.</p>`;
        riskElement.className = 'risk-level-display'; // Reset class
        riskElement.style.display = 'block';
        return;
    }

    const level = riskData.riskLevel.toLowerCase();
    let factorsHTML = '';
    if (riskData.factors && riskData.factors.length > 0) {
        factorsHTML = '<ul>' + riskData.factors.map(f => `<li>${escapeHTML(f)}</li>`).join('') + '</ul>';
    }

    riskElement.innerHTML = `<p><strong>Predicted Learning Risk Level:</strong> ${escapeHTML(riskData.riskLevel)}</p>${factorsHTML}`;
    riskElement.className = `risk-level-display ${level}`;
    riskElement.style.display = 'block';
}


// Utility (can be shared or redefined if needed)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}