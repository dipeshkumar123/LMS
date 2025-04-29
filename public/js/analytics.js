// public/js/analytics.js

// Make sure auth.js is loaded first for checkLoginStatus and fetchAPI

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Analytics script loaded');

    // --- Get DOM Elements ---
    const courseOverviewSection = document.getElementById('course-overview-section');
    const userLookupForm = document.getElementById('user-lookup-form');
    const courseSelect = document.getElementById('course-select');
    const userSelect = document.getElementById('user-select');
    const userProgressDetailsContainer = document.getElementById('user-progress-details');
    const analyticsErrorElement = document.getElementById('analytics-error');

    if (!courseOverviewSection || !userLookupForm || !courseSelect || !userSelect || !userProgressDetailsContainer) {
        console.error('Analytics page init failed: One or more required elements not found.');
        if(analyticsErrorElement) analyticsErrorElement.textContent = "Page Initialization Error.";
        return;
    }

    // --- Initialization ---
    const currentUser = await checkLoginStatus(true); // Ensure user is logged in
    if (!currentUser) {
        displayAnalyticsError('User authentication failed.');
        return;
    }

    // Check role - Redirect or hide if not Instructor/Admin
    if (currentUser.role !== 'Instructor' && currentUser.role !== 'Administrator') {
        displayAnalyticsError('Access Denied: You do not have permission to view analytics.');
        // Hide the main content areas
        courseOverviewSection.style.display = 'none';
        document.getElementById('user-progress-section').style.display = 'none';
        // Optionally redirect: window.location.href = '/index.html';
        return;
    }

    // --- Load Initial Data ---
    await loadCourseOverview();
    await populateCourseSelect(); // Populate the course dropdown for user lookup

    // --- Event Listeners ---
    userLookupForm.addEventListener('submit', handleUserLookup);
    courseSelect.addEventListener('change', handleCourseSelectionChange);

    // --- Helper Functions ---
    function displayAnalyticsError(message) {
        console.error("Analytics Error:", message);
        if (analyticsErrorElement) {
            analyticsErrorElement.textContent = message;
            analyticsErrorElement.style.display = 'block';
        }
    }

    function clearAnalyticsError() {
         if (analyticsErrorElement) {
            analyticsErrorElement.textContent = '';
            analyticsErrorElement.style.display = 'none';
        }
    }

    // --- Data Loading and Rendering ---

    /**
     * Fetches and displays the course overview data.
     */
    async function loadCourseOverview() {
        clearAnalyticsError();
        courseOverviewSection.innerHTML = '<p>Loading course overview data...</p>';
        try {
            // Fetch all courses first to iterate
            const courses = await fetchAPI('/api/courses');
            if (!courses || courses.length === 0) {
                courseOverviewSection.innerHTML = '<p>No courses found.</p>';
                return;
            }

            // Fetch overview for each course
            const overviewPromises = courses.map(course =>
                fetchAPI(`/api/analytics/course/${course.id}/overview`)
                    .catch(err => {
                         console.error(`Failed to load overview for ${course.id}:`, err.message);
                         return { courseId: course.id, courseTitle: course.title, error: true }; // Mark error
                    })
            );
            const overviews = await Promise.all(overviewPromises);

            // Render the overview table
            renderCourseOverviewTable(overviews);

        } catch (error) {
            console.error("Error loading course overviews:", error);
            displayAnalyticsError(`Failed to load course overview: ${error.message}`);
             courseOverviewSection.innerHTML = ''; // Clear loading message on error
        }
    }

    /**
     * Renders the course overview data into a table.
     * @param {Array} overviews - Array of course overview objects.
     */
    function renderCourseOverviewTable(overviews) {
         if (!overviews || overviews.length === 0) {
             courseOverviewSection.innerHTML = '<p>No overview data available.</p>';
             return;
         }

         let tableHTML = `
            <table class="analytics-table">
                <thead>
                    <tr>
                        <th>Course Title</th>
                        <th>Enrolled</th>
                        <th>Completed (Certified)</th>
                        <th>In Progress</th>
                        <th>Avg. Completion</th>
                        <th>Avg. Score</th>
                    </tr>
                </thead>
                <tbody>
         `;

         overviews.forEach(ov => {
             if (ov.error) {
                 tableHTML += `
                     <tr>
                         <td>${ov.courseTitle || ov.courseId}</td>
                         <td colspan="5"><em class="error-message">Error loading data</em></td>
                     </tr>
                 `;
             } else {
                 tableHTML += `
                     <tr>
                         <td>${ov.courseTitle || 'N/A'}</td>
                         <td>${ov.totalEnrolled ?? 'N/A'}</td>
                         <td class="status-certified">${ov.totalCompleted ?? 'N/A'}</td>
                         <td class="status-in-progress">${ov.totalInProgress ?? 'N/A'}</td>
                         <td>${ov.averageCompletionRate ? ov.averageCompletionRate + '%' : 'N/A'}</td>
                         <td>${ov.averageCourseScore ? ov.averageCourseScore + '%' : 'N/A'}</td>
                     </tr>
                 `;
             }
         });

         tableHTML += `</tbody></table>`;
         courseOverviewSection.innerHTML = tableHTML;
    }

    /**
     * Populates the course selection dropdown.
     */
    async function populateCourseSelect() {
        try {
            const courses = await fetchAPI('/api/courses');
            courseSelect.innerHTML = '<option value="">-- Select a Course --</option>'; // Reset
            if (courses && courses.length > 0) {
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = course.title;
                    courseSelect.appendChild(option);
                });
            } else {
                 courseSelect.innerHTML = '<option value="">No courses available</option>';
            }
        } catch (error) {
             console.error("Failed to populate course select:", error);
             courseSelect.innerHTML = '<option value="">Error loading courses</option>';
             displayAnalyticsError(`Could not load courses for lookup: ${error.message}`);
        }
    }

    /**
     * Handles the change event when a course is selected.
     * Populates the user dropdown based on the selected course.
     */
    async function handleCourseSelectionChange() {
        const selectedCourseId = courseSelect.value;
        userSelect.innerHTML = '<option value="">Loading Users...</option>'; // Clear previous users
        userSelect.disabled = true; // Disable while loading
        userProgressDetailsContainer.innerHTML = '<p>Select a course and user to view detailed progress.</p>'; // Reset details

        if (!selectedCourseId) {
            userSelect.innerHTML = '<option value="">Select a Course First...</option>';
            return;
        }

        try {
            // Fetch all users (admin endpoint) - In a real system, you'd fetch users *enrolled* in the course.
            // This simple version fetches all users and lets the progress endpoint handle if they have data.
            const users = await fetchAPI('/api/admin/users'); // Requires Admin/Instructor access

            userSelect.innerHTML = '<option value="">-- Select a User --</option>'; // Reset
            if (users && users.length > 0) {
                 // Filter for learners only, maybe? Or allow viewing Instructors too?
                 // const learners = users.filter(u => u.role === 'Learner');
                 users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.name} (${user.username})`;
                    userSelect.appendChild(option);
                });
                 userSelect.disabled = false; // Enable user select
            } else {
                 userSelect.innerHTML = '<option value="">No users found</option>';
            }

        } catch (error) {
            console.error("Failed to populate user select:", error);
            userSelect.innerHTML = '<option value="">Error loading users</option>';
             displayAnalyticsError(`Could not load users: ${error.message}`);
        }
    }


    /**
     * Handles the submission of the user progress lookup form.
     * @param {Event} event - The form submission event.
     */
    async function handleUserLookup(event) {
        event.preventDefault();
        clearAnalyticsError();

        const courseId = courseSelect.value;
        const userId = userSelect.value;

        if (!courseId || !userId) {
            displayAnalyticsError('Please select both a course and a user.');
            return;
        }

        userProgressDetailsContainer.innerHTML = `<p>Loading progress for user ${userSelect.options[userSelect.selectedIndex].text} in course ${courseSelect.options[courseSelect.selectedIndex].text}...</p>`;

        try {
            const progressData = await fetchAPI(`/api/analytics/user/${userId}/course/${courseId}`);
            renderUserProgressDetails(progressData);
        } catch (error) {
             console.error("Error fetching user progress details:", error);
              displayAnalyticsError(`Failed to load user progress: ${error.message}`);
              userProgressDetailsContainer.innerHTML = `<p class="error-message">Could not load progress data.</p>`; // Show error in details area
        }
    }

    /**
     * Renders the detailed progress of a user in a course.
     * @param {object} data - The detailed progress data from the API.
     */
    function renderUserProgressDetails(data) {
        if (!data) {
            userProgressDetailsContainer.innerHTML = '<p>No progress data available for this selection.</p>';
            return;
        }

         // Helper to format dates
        const formatDate = (isoString) => {
            if (!isoString) return 'N/A';
            try {
                return new Date(isoString).toLocaleString();
            } catch (e) { return 'Invalid Date'; }
        };

        // Helper to format score
         const formatScore = (score, total) => {
             if (score === undefined || score === null || total === undefined || total === null || total === 0) {
                 return 'N/A';
             }
             const percent = (score / total) * 100;
             let scoreClass = '';
             if (percent < 50) scoreClass = 'low';
             else if (percent < 80) scoreClass = 'medium';
             else scoreClass = 'high';
             return `<span class="score ${scoreClass}">${score}/${total} (${percent.toFixed(0)}%)</span>`;
         };

         // Helper for progress bar
         const renderProgressBar = (percent) => {
             if (percent === null || percent === undefined || isNaN(percent)) return 'N/A';
             percent = Math.max(0, Math.min(100, percent)); // Clamp between 0-100
             let barClass = 'high';
             if (percent < 50) barClass = 'low';
             else if (percent < 80) barClass = 'medium';
             return `
                 <div class="progress-bar-container" title="${percent.toFixed(1)}%">
                     <div class="progress-bar ${barClass}" style="width: ${percent}%;">${percent.toFixed(0)}%</div>
                 </div>
             `;
         };

         let detailsHTML = `
            <h3>Progress Report</h3>
            <p><strong>User:</strong> ${data.userName || 'N/A'} (${data.userId})</p>
            <p><strong>Course:</strong> ${data.courseTitle || 'N/A'} (${data.courseId})</p>
            <p><strong>Overall Status:</strong> <span class="status-${data.status?.toLowerCase().replace(' ', '-')}">${data.status || 'N/A'}</span></p>
            <p><strong>Completion Rate:</strong> ${renderProgressBar(parseFloat(data.completionRate))}</p>
            <p><strong>Average Quiz Score:</strong> ${data.averageScore ? data.averageScore + '%' : 'N/A'}</p>
            <br>
            <h4>Item Details:</h4>
             <table class="analytics-table">
                <thead>
                    <tr>
                        <th>Item Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (data.progressDetails && Object.keys(data.progressDetails).length > 0) {
            Object.entries(data.progressDetails).forEach(([itemId, itemData]) => {
                 const statusText = itemData.completed ? 'Completed' : 'Not Completed';
                 const dateToShow = itemData.type === 'assignment' ? itemData.submittedAt : (itemData.type === 'quiz' ? itemData.submittedAt : itemData.completedAt);
                 detailsHTML += `
                     <tr>
                         <td>${itemData.title || itemId}</td>
                         <td>${itemData.type || 'N/A'}</td>
                         <td>${statusText}</td>
                         <td>${formatScore(itemData.score, itemData.total)}</td>
                         <td class="date-time">${formatDate(dateToShow)}</td>
                     </tr>
                 `;
            });
        } else {
            detailsHTML += `<tr><td colspan="5">No detailed item progress recorded yet.</td></tr>`;
        }

        detailsHTML += `</tbody></table>`;
        userProgressDetailsContainer.innerHTML = detailsHTML;
    }


}); // End DOMContentLoaded