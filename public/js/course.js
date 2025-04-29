// public/js/course.js
// Phase 3 Update: Added AI Practice & Activity Suggestion integration.
// Phase 4 Update: Added header gamification update.

// Ensure auth.js is loaded first for checkLoginStatus and fetchAPI

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Course script loaded');

    // --- DOM Elements ---
    const coursePageTitleElement = document.getElementById('course-page-title');
    const courseSidebarTitleElement = document.getElementById('course-sidebar-title');
    const moduleListElement = document.getElementById('module-list');
    const contentTitleElement = document.getElementById('content-title');
    const contentAreaElement = document.getElementById('content-area');
    const lessonActionsElement = document.getElementById('lesson-actions');
    const contentFeedbackElement = document.getElementById('content-feedback');
    const adaptiveSuggestionElement = document.getElementById('adaptive-suggestion'); // New in P2

    // Phase 3 Elements
    const suggestActivityBtn = document.getElementById('suggest-activity-btn');
    const personalizedPracticeArea = document.getElementById('personalized-practice-area');
    const practiceContentElement = document.getElementById('practice-content');
    const practiceFeedbackElement = document.getElementById('practice-feedback');
    const aiActivitySuggestionArea = document.getElementById('ai-activity-suggestion-area');
    const activityContentElement = document.getElementById('activity-content');
    const userPointsElement = document.getElementById('user-points'); // Add header elements
    const userBadgesSummaryElement = document.getElementById('user-badges-summary');

    // --- Get Course ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');

    if (!courseId) {
        displayError('No course ID provided in the URL.');
        return;
    }

    // --- State Variables ---
    let currentCourseData = null; // Stores detailed course structure { id, title, modules: [{ id, title, lessons: [{ id, title, type, completed?, quizScore?, quizTotal? }] }] }
    let currentLessonId = null; // Track the currently viewed lesson

    // --- Initialization ---
    const currentUser = await checkLoginStatus(true); // Ensure user is logged in
    if (!currentUser) {
        displayError('User authentication failed.');
        return; // Stop execution if not authenticated
    }

    // *** Phase 4: Update header on course page load ***
    updateHeaderGamification(null); // Initial loading state
    await loadUserGamificationStats(currentUser.id); // Fetch stats

    await loadCourseDataAndRenderSidebar(courseId);

    // Check URL hash to potentially load a specific lesson on page load
    if (window.location.hash && window.location.hash.startsWith('#lesson-')) {
        const lessonIdFromHash = window.location.hash.substring('#lesson-'.length);
        // Find the corresponding link and simulate a click to load it
        const link = moduleListElement.querySelector(`a[data-lesson-id="${lessonIdFromHash}"]`);
        if (link) {
             handleLessonLinkClick({ target: link, preventDefault: () => {} }); // Simulate event
        }
    }

    // --- Phase 3: Event Listener for Suggest Activity Button ---
    if (suggestActivityBtn) {
        suggestActivityBtn.addEventListener('click', handleSuggestActivityClick);
    } else {
        console.warn('#suggest-activity-btn not found in the DOM.');
    }

    // --- Helper Functions (displayError, showFeedback, escapeHTML - same as Phase 1) ---
    function displayError(message, element = contentAreaElement) {
        console.error('Course Page Error:', message);
        element.innerHTML = `<p class="error-message">${message}</p>`;
         // Hide adaptive suggestion on error
         if (adaptiveSuggestionElement) adaptiveSuggestionElement.style.display = 'none';
         // Also hide AI sections on major errors
         if(personalizedPracticeArea) personalizedPracticeArea.style.display = 'none';
         if(aiActivitySuggestionArea) aiActivitySuggestionArea.style.display = 'none';
    }

    function showFeedback(message, type = 'info', duration = 5000, targetElement = contentFeedbackElement) {
        if (!targetElement) return;
        targetElement.textContent = message;
        targetElement.className = `feedback-message ${type}`;
        targetElement.style.display = 'block';
        if (duration > 0) { setTimeout(() => { targetElement.style.display = 'none'; }, duration); }
    }

     function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }


    // --- Core Logic ---

    /**
     * Fetches full course data (incl. progress baked in from backend) and renders the sidebar.
     * @param {string} cId - The ID of the course to load.
     */
    async function loadCourseDataAndRenderSidebar(cId) {
        moduleListElement.innerHTML = '<p>Loading course structure...</p>';
        try {
            // API now returns lessons with completion status baked in
            currentCourseData = await fetchAPI(`/api/courses/${cId}`);
            console.log('Course data loaded (with progress):', currentCourseData);

            if (!currentCourseData) throw new Error("No course data.");

            // Update page titles
            if (coursePageTitleElement) coursePageTitleElement.textContent = `${currentCourseData.title}`;
            if (courseSidebarTitleElement) courseSidebarTitleElement.textContent = 'Modules';

            renderSidebar(currentCourseData.modules);

        } catch (error) {
            displayError(`Error loading course data: ${error.message}`, moduleListElement);
        }
    }

    /** Fetches full course data via API and renders sidebar */
    async function loadCourseDataAndRenderSidebar(cId) {
        moduleListElement.innerHTML = '<p>Loading course structure...</p>';
        try {
            // API returns populated course structure including user progress on lessons
            // fetchAPI helper might extract nested 'data' automatically
            const fetchedData = await fetchAPI(`/courses/${cId}`);
            if (!fetchedData) throw new Error("Course data not found or invalid.");

            currentCourseData = fetchedData; // Store the populated data
            console.log('Course data loaded (DB):', currentCourseData);

            if (coursePageTitleElement) coursePageTitleElement.textContent = `${currentCourseData.title}`;
            if (courseSidebarTitleElement) courseSidebarTitleElement.textContent = 'Course Modules';

            renderSidebar(currentCourseData.modules); // Render using the fetched data

        } catch (error) {
            displayError(`Error loading course data: ${error.message}`, moduleListElement);
            if (coursePageTitleElement) coursePageTitleElement.textContent = 'Error Loading Course';
        }
    }

    /** Renders sidebar using fetched course data (uses _id) */
    function renderSidebar(modules) {
        if (!moduleListElement) return;
        moduleListElement.innerHTML = '';
        if (!modules || modules.length === 0) { moduleListElement.innerHTML = '<p>No modules found.</p>'; return; }

        modules.forEach(module => {
            const moduleDiv = document.createElement('div'); moduleDiv.className = 'module';
            moduleDiv.innerHTML = `<h3>${escapeHTML(module.title)}</h3>`;
            const lessonList = document.createElement('ul');
            if (module.lessons && module.lessons.length > 0) {
                module.lessons.forEach(lesson => {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = `#lesson-${lesson._id}`; // Use MongoDB _id
                    link.textContent = escapeHTML(lesson.title);
                    link.dataset.lessonId = lesson._id; // Store _id
                    link.dataset.moduleId = module._id; // Store _id
                    link.dataset.lessonType = lesson.type;
                    // Check completion status directly from fetched data
                    if (lesson.completed) {
                        link.classList.add('completed');
                    }
                    link.addEventListener('click', handleLessonLinkClick);
                    listItem.appendChild(link);
                    lessonList.appendChild(listItem);
                });
            } else { lessonList.innerHTML = '<li><em>No lessons.</em></li>'; }
            moduleDiv.appendChild(lessonList); moduleListElement.appendChild(moduleDiv);
        });
    }

    /**
     * Handles clicks on lesson links in the sidebar. Loads content and updates state.
     * @param {Event} event - The click event (can be real or simulated).
     */
    function handleLessonLinkClick(event) {
        event.preventDefault();
        const link = event.target; 
        const lessonId = link.dataset.lessonId; 
        const moduleId = link.dataset.moduleId;
        history.pushState(null, '', `#lesson-${lessonId}`);
        console.log(`Loading lesson ${lessonId}`);
        const lessonData = findLessonData(lessonId);
        if (lessonData) {
            currentLessonId = lessonId;
            document.querySelectorAll('.course-sidebar a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            // *** Hide AI sections when loading new lesson ***
            if(personalizedPracticeArea) personalizedPracticeArea.style.display = 'none';
            if(aiActivitySuggestionArea) aiActivitySuggestionArea.style.display = 'none';
            renderContent(lessonData, moduleId);
            fetchAndDisplayAdaptiveSuggestion(courseId, lessonId); // Fetch adaptive suggestion
        } else { displayError(`Data not found for lesson ${lessonId}.`); currentLessonId = null; }
    }

     /**
      * Finds lesson data from the locally stored `currentCourseData`.
      * @param {string} lessonId - The ID of the lesson to find.
      * @returns {object | null} - The lesson data object or null if not found.
      */
     function findLessonData(lessonId) {
         if (!currentCourseData || !currentCourseData.modules) return null;
         for (const module of currentCourseData.modules) {
             if (module.lessons) {
                 // Try both _id and id for robustness
                 const lesson = module.lessons.find(l => l._id === lessonId || l.id === lessonId);
                 if (lesson) return lesson;
             }
         }
         return null;
     }


    /** Renders content area (uses _id) */
    function renderContent(lesson, moduleId) {
        if (!contentAreaElement || !contentTitleElement || !lessonActionsElement) return;
        contentTitleElement.textContent = escapeHTML(lesson.title); contentAreaElement.innerHTML = ''; lessonActionsElement.innerHTML = '';
        contentFeedbackElement.style.display = 'none'; adaptiveSuggestionElement.style.display = 'none';
        // Find module data using _id
        const moduleData = currentCourseData.modules.find(m => m._id === moduleId);
        let showPracticeButton = false;

        switch (lesson.type) {
            case 'text':
                 contentAreaElement.innerHTML = `<div class="lesson-text-content">${lesson.content || ''}</div>`; // Handle potential HTML in content later if needed
                 if (!lesson.completed) addMarkCompleteButton(lesson._id); else { lessonActionsElement.innerHTML = `<p class="success-message"><em>Lesson completed.</em></p>`; showPracticeButton = true; }
                break;
            case 'video':
                 contentAreaElement.innerHTML = `<div class="lesson-video-content"><video controls width="100%"><source src="${escapeHTML(lesson.videoUrl || '')}" type="video/mp4">...</video></div>`;
                 if (!lesson.completed) addMarkCompleteButton(lesson._id); else { lessonActionsElement.innerHTML = `<p class="success-message"><em>Lesson completed.</em></p>`; showPracticeButton = true; }
                break;
            case 'quiz':
                // Check progress status directly on the lesson object fetched from API
                if (lesson.quizScore !== undefined) {
                    displayQuizResults({ score: lesson.quizScore, total: lesson.quizTotal, message: `Score: ${lesson.quizScore}/${lesson.quizTotal}` }, lesson);
                     showPracticeButton = true;
                } else { renderQuizForm(lesson); } // Pass full lesson object (_id included)
                break;
            default: contentAreaElement.innerHTML = `<p>Unsupported type: ${lesson.type}</p>`;
        }
        if (showPracticeButton) addPersonalizedPracticeButton(lesson._id); // Use _id
        if (moduleData) { if (moduleData.hasAssignment) renderAssignmentSection(moduleData); renderForumSection(moduleData._id); } // Use _id
    }

    /** Adds Mark Complete Button (uses _id) */
    function addMarkCompleteButton(lessonId) {
        const button = document.createElement('button'); button.textContent = 'Mark as Complete'; button.className = 'btn btn-success';
        button.addEventListener('click', async () => {
            try {
                button.disabled = true; button.textContent = 'Marking...';
                // Call API using lessonId (_id)
                await fetchAPI(`/lessons/${lessonId}/complete`, { method: 'POST' });
                showFeedback('Lesson marked as complete!', 'success');
                lessonActionsElement.innerHTML = `<p class="success-message"><em>Lesson completed.</em></p>`;
                const sidebarLink = moduleListElement.querySelector(`a[data-lesson-id="${lessonId}"]`); if (sidebarLink) sidebarLink.classList.add('completed');
                const lessonData = findLessonData(lessonId); if(lessonData) lessonData.completed = true; // Update local state
                addPersonalizedPracticeButton(lessonId); // Add practice button now
                fetchAndDisplayAdaptiveSuggestion(courseId, lessonId); // Fetch suggestion
                await loadUserGamificationStats(currentUser.id); // Refresh header stats
            } catch (error) { showFeedback(`Error marking complete: ${error.message}`, 'error'); button.disabled = false; button.textContent = 'Mark as Complete'; }
        });
        lessonActionsElement.prepend(button);
    }

    /** Renders quiz form (uses _id) */
    function renderQuizForm(lesson) {
        let formHTML = `<form id="quiz-form" class="quiz-form" data-lesson-id="${lesson._id}">`; // Use _id
        lesson.questions.forEach((q, index) => {
             formHTML += `<fieldset class="question-block"><legend class="question-text">${index + 1}. ${escapeHTML(q.q)}</legend><div class="options">`;
             (q.options || []).forEach((option, optionIndex) => { formHTML += `<label><input type="radio" name="question_${index}" value="${optionIndex}" required> ${escapeHTML(option)}</label>`; });
             formHTML += `</div></fieldset>`;
        });
        formHTML += `<button type="submit" class="btn">Submit Quiz</button></form>`;
        contentAreaElement.innerHTML = formHTML;
        const quizForm = document.getElementById('quiz-form'); if (quizForm) quizForm.addEventListener('submit', handleQuizSubmit);
    }

    /** Handles quiz submit (uses _id, updates state) */
    async function handleQuizSubmit(event) {
        event.preventDefault(); const form = event.target; const lessonId = form.dataset.lessonId; const button = form.querySelector('button'); button.disabled = true; button.textContent = 'Submitting...';
        const formData = new FormData(form); const answers = {}; for (const [k, v] of formData.entries()) { answers[k.split('_')[1]] = parseInt(v, 10); }
        try {
            // API now returns full results including score/total/results array
            const resultData = await fetchAPI(`/lessons/${lessonId}/quiz`, { method: 'POST', body: JSON.stringify({ answers }) });
            const lessonData = findLessonData(lessonId);
            if (lessonData) { // Update local state
                 lessonData.completed = true; lessonData.quizScore = resultData.score; lessonData.quizTotal = resultData.total;
                 const sidebarLink = moduleListElement.querySelector(`a[data-lesson-id="${lessonId}"]`); if (sidebarLink) sidebarLink.classList.add('completed');
             }
            displayQuizResults(resultData, lessonData || {title: "Quiz", _id: lessonId}); // Pass lesson data (_id needed)
            addPersonalizedPracticeButton(lessonId); // Add practice button
            fetchAndDisplayAdaptiveSuggestion(courseId, lessonId); // Fetch suggestion
            await loadUserGamificationStats(currentUser.id); // Refresh header stats
        } catch (error) { showFeedback(`Error submitting quiz: ${error.message}`, 'error'); button.disabled = false; button.textContent = 'Submit Quiz'; }
    }

    /** Displays quiz results (uses _id, expects detailed results) */
    function displayQuizResults(resultData, lesson) {
        contentTitleElement.textContent = `${escapeHTML(lesson.title)} - Results`;
        // Use resultData.message if provided by backend, otherwise format score
        const scoreMessage = resultData.message || `You scored ${resultData.score} out of ${resultData.total}.`;
        let resultsHTML = `<div class="quiz-results-summary ${resultData.score >= (resultData.total / 2) ? 'passed' : 'failed'}">${scoreMessage}</div>`;
        // Display detailed results if the 'results' array exists in the response
        if (resultData.results && Array.isArray(resultData.results)) {
             resultsHTML += '<h4>Detailed Results:</h4>';
             resultData.results.forEach((item, index) => {
                 resultsHTML += `<div class="quiz-result-item ${item.isCorrect ? 'correct' : 'incorrect'}"><p><strong>Question ${index + 1}:</strong> ${escapeHTML(item.question)}</p><p><strong>Your Answer:</strong> ${escapeHTML(item.yourAnswer)} ${item.isCorrect ? '<span>(Correct)</span>' : '<span>(Incorrect)</span>'}</p>${!item.isCorrect ? `<p><strong>Correct Answer:</strong> ${escapeHTML(item.correctAnswer)}</p>` : ''}</div>`;
             });
        }
        contentAreaElement.innerHTML = resultsHTML;
        lessonActionsElement.innerHTML = ''; // Clear actions after showing results
        // Add practice button even after showing results
         addPersonalizedPracticeButton(lesson._id);
    }

    /** Renders assignment section (uses _id) */
    function renderAssignmentSection(moduleData) {
        const assignmentContainer = document.createElement('div'); assignmentContainer.className = 'assignment-section'; assignmentContainer.id = `assignment-${moduleData._id}`;
        let assignmentHTML = `<h4>Module Assignment</h4><p class="assignment-description">${escapeHTML(moduleData.assignmentDescription || 'N/A')}</p>`;
        if (moduleData.assignmentSubmitted) { assignmentHTML += `<p class="success-message"><strong>Status:</strong> Submitted.</p>`; }
        else { assignmentHTML += `<form id="assignment-form-${moduleData._id}" data-module-id="${moduleData._id}"><div class="form-group"><label for="submissionText-${moduleData._id}">Submission:</label><textarea id="submissionText-${moduleData._id}" name="submissionText" rows="5" required></textarea></div><button type="submit" class="btn">Submit</button></form>`; }
        assignmentContainer.innerHTML = assignmentHTML;
        const existingSection = contentAreaElement.querySelector(`#assignment-${moduleData._id}`); if(existingSection) existingSection.remove();
        contentAreaElement.appendChild(assignmentContainer);
        const assignmentForm = document.getElementById(`assignment-form-${moduleData._id}`); if (assignmentForm) assignmentForm.addEventListener('submit', handleAssignmentSubmit);
    }

    /** Handles assignment submit (uses _id, updates state) */
    async function handleAssignmentSubmit(event) {
        event.preventDefault(); const form = event.target; const moduleId = form.dataset.moduleId; const button = form.querySelector('button'); const textarea = form.querySelector('textarea'); button.disabled = true; button.textContent = 'Submitting...';
        try {
            // API endpoint uses module ID
            await fetchAPI(`/assignments/${moduleId}/submit`, { method: 'POST', body: JSON.stringify({ submissionText: textarea.value.trim() }) });
            showFeedback('Assignment submitted!', 'success');
            const moduleData = currentCourseData.modules.find(m => m._id === moduleId); if (moduleData) moduleData.assignmentSubmitted = true; // Update local state
            renderAssignmentSection(moduleData); // Re-render section
            if(currentLessonId) fetchAndDisplayAdaptiveSuggestion(courseId, currentLessonId);
            await loadUserGamificationStats(currentUser.id); // Refresh header stats
        } catch (error) { showFeedback(`Error submitting assignment: ${error.message}`, 'error'); button.disabled = false; button.textContent = 'Submit Assignment'; }
    }

    /** Renders forum section (uses module _id) */
    async function renderForumSection(moduleId) {
        const forumContainerId = `forum-section-${moduleId}`;
        const existingForum = contentAreaElement.querySelector(`#${forumContainerId}`); if (existingForum) existingForum.remove();
        const forumContainer = document.createElement('div'); forumContainer.className = 'forum-section'; forumContainer.id = forumContainerId;
        forumContainer.innerHTML = `<h4>Discussion</h4><div class="forum-posts" id="forum-posts-${moduleId}"><p>Loading posts...</p></div><hr><h5>Add Post</h5><form id="new-post-form-${moduleId}" data-module-id="${moduleId}"><div class="form-group"><textarea name="postText" rows="3" required></textarea></div><button type="submit" class="btn btn-secondary">Post</button></form>`;
        contentAreaElement.appendChild(forumContainer); // Append below main content/practice/activity
        const newPostForm = document.getElementById(`new-post-form-${moduleId}`); if (newPostForm) newPostForm.addEventListener('submit', handleNewPostSubmit);
        await loadForumPosts(moduleId); // Load posts after structure is added
    }

    /** Loads forum posts (uses module _id, API returns populated user name) */
    async function loadForumPosts(moduleId) {
        const postsContainer = document.getElementById(`forum-posts-${moduleId}`); if (!postsContainer) return;
        postsContainer.innerHTML = '<p>Loading posts...</p>';
        try {
            // API returns { success: true, count: N, data: [...] }
            // fetchAPI extracts data array
            const posts = await fetchAPI(`/modules/${moduleId}/forum`); // Correct endpoint
            if (!posts || posts.length === 0) { postsContainer.innerHTML = '<p><em>No posts yet.</em></p>'; return; }
            postsContainer.innerHTML = '';
            posts.forEach(post => {
                const postElement = document.createElement('div'); postElement.className = 'forum-post';
                const postDate = new Date(post.createdAt || post.timestamp).toLocaleString(); // Use createdAt from DB
                // Use populated user name if available, fallback to stored userName
                const authorName = post.user?.name || post.userName || 'Anonymous';
                postElement.innerHTML = `<p class="forum-post-meta"><strong>${escapeHTML(authorName)}</strong> on ${postDate}</p><p class="forum-post-text">${escapeHTML(post.text)}</p>`;
                postsContainer.appendChild(postElement);
            });
        } catch (error) { console.error(`Error loading forum posts for ${moduleId}:`, error); postsContainer.innerHTML = `<p class="error-message">Could not load posts.</p>`; }
    }

    /** Handles new post submit (uses module _id) */
    async function handleNewPostSubmit(event) {
        event.preventDefault(); const form = event.target; const moduleId = form.dataset.moduleId; const textarea = form.querySelector('textarea'); const button = form.querySelector('button'); const text = textarea.value.trim();
        if (!text) { /* ... */ } button.disabled = true; button.textContent = 'Posting...';
        try {
             await fetchAPI(`/modules/${moduleId}/forum`, { method: 'POST', body: JSON.stringify({ text }) }); // Correct endpoint
             showFeedback('Post submitted!', 'success', 3000); textarea.value = '';
             await loadForumPosts(moduleId); // Refresh posts
             await loadUserGamificationStats(currentUser.id); // Refresh header stats (for first post bonus)
        } catch (error) { showFeedback(`Error submitting post: ${error.message}`, 'error'); }
        finally { button.disabled = false; button.textContent = 'Post'; }
    }


    /** Fetches/renders adaptive suggestion (uses lesson _id) */
    async function fetchAndDisplayAdaptiveSuggestion(cId, lessonId) {
        if (!adaptiveSuggestionElement) return; adaptiveSuggestionElement.innerHTML = '<p><em>Loading suggestion...</em></p>'; adaptiveSuggestionElement.style.display = 'block';
        try {
            // fetchAPI extracts nested data
            const suggestion = await fetchAPI(`/ai/adaptive/next-step/${cId}/${lessonId}`);
            renderAdaptiveSuggestion(suggestion);
        } catch (error) { console.error("Failed adaptive suggestion:", error); adaptiveSuggestionElement.innerHTML = `<p class="error-message">Could not load suggestion.</p>`; }
    }

    /**
     * Renders the adaptive suggestion into its container.
     * @param {object} suggestion - The suggestion object from the API.
     */
    function renderAdaptiveSuggestion(suggestion) {
        if (!adaptiveSuggestionElement || !suggestion) return;
        let suggestionHTML = '';
        let icon = '💡'; // Default icon

        let nextLessonModuleId = suggestion.lessonId ? findLessonData(suggestion.lessonId)?.module?._id : null;

        switch (suggestion.type) {
            case 'next':
                 icon = '➡️';
                suggestionHTML = `<p><span class="suggestion-icon">${icon}</span> <strong>Next Step:</strong> ${suggestion.message} <a href="#lesson-${suggestion.lessonId}" data-lesson-id="${suggestion.lessonId}" data-module-id="${lessons[suggestion.lessonId]?.moduleId}" class="suggestion-link">Go to Lesson</a></p>`;
                break;
            case 'review':
                 icon = '🤔';
                suggestionHTML = `<p><span class="suggestion-icon">${icon}</span> <strong>Suggestion:</strong> ${suggestion.message} <a href="#lesson-${suggestion.lessonId}" data-lesson-id="${suggestion.lessonId}" data-module-id="${lessons[suggestion.lessonId]?.moduleId}" class="suggestion-link">Review Lesson</a></p>`;
                break;
            case 'certificate':
                icon = '🏆';
                 suggestionHTML = `<p><span class="suggestion-icon">${icon}</span> <strong>Congratulations!</strong> ${suggestion.message} <a href="#">View Certificate (Not Implemented)</a></p>`;
                break;
            case 'complete_remaining':
                 icon = '🏁';
                 suggestionHTML = `<p><span class="suggestion-icon">${icon}</span> <strong>Almost There:</strong> ${suggestion.message}</p>`;
                 break;
            case 'course_end':
                icon = '🎉';
                 suggestionHTML = `<p><span class="suggestion-icon">${icon}</span> <strong>Course Complete:</strong> ${suggestion.message}</p>`;
                 break;
             case 'message': // General message
                 icon = '💬';
                 suggestionHTML = `<p><span class="suggestion-icon">${icon}</span> ${suggestion.message}</p>`;
                 break;
            default:
                 suggestionHTML = `<p><span class="suggestion-icon">ℹ️</span> ${suggestion.message || 'Suggestion data unclear.'}</p>`;
        }

        adaptiveSuggestionElement.innerHTML = suggestionHTML;
        adaptiveSuggestionElement.style.display = 'block';

        // Add event listeners to any links within the suggestion
         const suggestionLinks = adaptiveSuggestionElement.querySelectorAll('.suggestion-link');
         suggestionLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default hash jump
                 const targetLessonId = link.dataset.lessonId;
                 // Find the corresponding sidebar link and trigger its click handler
                 const targetSidebarLink = moduleListElement.querySelector(`a[data-lesson-id="${targetLessonId}"]`);
                 if (targetSidebarLink) {
                     handleLessonLinkClick({ target: targetSidebarLink, preventDefault: () => {} });
                 } else {
                      console.error(`Could not find sidebar link for suggested lesson ${targetLessonId}`);
                 }
            });
         });
    }


    /** Adds personalized practice button (uses _id) */
    function addPersonalizedPracticeButton(lessonId) {
        // Check if button already exists
        if (lessonActionsElement.querySelector('.get-practice-btn')) return;

        const practiceButton = document.createElement('button');
        practiceButton.textContent = 'Get Personalized Practice';
        practiceButton.className = 'btn btn-secondary btn-small get-practice-btn'; // Added class for potential specific styling/selection
        practiceButton.dataset.lessonId = lessonId;
        practiceButton.addEventListener('click', handleGetPracticeClick);

        // Append after any existing completion message/button
        lessonActionsElement.appendChild(practiceButton);
    }

    /** Handles get practice click (uses lesson _id) */
    async function handleGetPracticeClick(event) {
        const button = event.target; const lessonId = button.dataset.lessonId; if (!lessonId) return;
        button.disabled = true; button.textContent = 'Generating...'; practiceFeedbackElement.style.display = 'none';
        try {
            // fetchAPI extracts nested data
            const practiceData = await fetchAPI(`/ai/practice/${lessonId}`);
            renderPersonalizedPractice(practiceData, lessonId);
            personalizedPracticeArea.style.display = 'block';
            personalizedPracticeArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { showFeedback(`Error generating practice: ${error.message}`, 'error', 0, practiceFeedbackElement); }
        finally { button.disabled = false; button.textContent = 'Get Practice'; }
    }

    /** Renders the fetched practice content (assuming quiz format for now) */
    function renderPersonalizedPractice(practiceData, lessonId) {
        if (!practiceContentElement || !practiceData) return;

        practiceContentElement.innerHTML = ''; // Clear previous practice

        let contentHTML = `<h4>${escapeHTML(practiceData.title || 'Practice Exercises')}</h4>`;
        if (practiceData.feedback) {
            contentHTML += `<p><em>${escapeHTML(practiceData.feedback)}</em></p>`;
        }

        if (practiceData.type === 'quiz' && practiceData.questions && practiceData.questions.length > 0) {
            contentHTML += `<form id="practice-quiz-form" class="practice-quiz-form" data-lesson-id="${lessonId}">`;
            practiceData.questions.forEach((q, index) => {
                contentHTML += `<fieldset class="question-block"><legend class="question-text">${index + 1}. ${escapeHTML(q.q)}</legend><div class="options">`;
                q.options.forEach((option, optionIndex) => {
                    contentHTML += `<label><input type="radio" name="practice_q_${index}" value="${optionIndex}" required> ${escapeHTML(option)}</label>`;
                });
                contentHTML += `</div></fieldset>`;
            });

            contentHTML += `<button type="submit" class="btn btn-secondary">Submit Practice</button></form>`;
             practiceContentElement.innerHTML = contentHTML;
             // Add listener for the practice quiz form
             const practiceForm = document.getElementById('practice-quiz-form');
             if(practiceForm) practiceForm.addEventListener('submit', handlePracticeQuizSubmit);

        } else {
            // Handle other practice types later if needed
            contentHTML += `<p>Practice content type "${practiceData.type}" not supported yet.</p>`;
             practiceContentElement.innerHTML = contentHTML;
        }
    }

    /** Handles the submission of the practice quiz (displays feedback, doesn't save progress) */
    function handlePracticeQuizSubmit(event) {
         event.preventDefault();
         const form = event.target;
         // Note: We don't have the correct answers sent from the simple backend simulation.
         // A real implementation would need the AI to provide correct answers or have a way to check them.
         // For now, just show a generic "submitted" message.
         console.log("Practice Quiz Submitted (Validation/Scoring not implemented in this simulation)");
         showFeedback('Practice submitted! Keep learning.', 'success', 5000, practiceFeedbackElement);

         // Optionally disable the form after submission
         form.querySelectorAll('input, button').forEach(el => el.disabled = true);
    }


    /** Handles suggest activity click (uses course _id) */
    async function handleSuggestActivityClick() {
        suggestActivityBtn.disabled = true; suggestActivityBtn.textContent = 'Thinking...'; aiActivitySuggestionArea.style.display = 'none';
        try {
            // fetchAPI extracts nested data
            const activityData = await fetchAPI(`/ai/suggest-activity/${courseId}`); // Use course _id
            renderAiActivitySuggestion(activityData);
            aiActivitySuggestionArea.style.display = 'block';
            aiActivitySuggestionArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { showFeedback(`Error suggesting activity: ${error.message}`, 'error'); }
        finally { suggestActivityBtn.disabled = false; suggestActivityBtn.textContent = 'Suggest Activity'; }
    }

    /** Renders the fetched AI activity suggestion */
    function renderAiActivitySuggestion(activityData) {
        if (!activityContentElement) return;
        activityContentElement.innerHTML = `
            <p><strong>${escapeHTML(activityData.title || 'Suggested Activity')}</strong> (${escapeHTML(activityData.type || 'General')})</p>
            <p>${escapeHTML(activityData.description || 'No details provided.')}</p>
        `;
    }

// --- Phase 4: Function to load stats for header (Copied from leaderboard.js/dashboard.js) ---
     /**
      * Fetches the current user's gamification stats to update the header.
      * @param {string} userId
      */
     async function loadUserGamificationStats(userId) {
        if (!userPointsElement || !userBadgesSummaryElement) return; // Only run if header elements exist
       try {
           // HACK: Fetch analytics for *any* course to get global points/badges.
           const coursesResponse = await fetchAPI('/api/courses');
           const coursesArray = Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
           if (coursesArray.length > 0) {
               const firstCourseId = coursesArray[0]._id || coursesArray[0].id;
               const stats = await fetchAPI(`/api/analytics/user/course/${firstCourseId}`);
               updateHeaderGamification({ points: stats.points, badges: stats.badges });
           } else {
               updateHeaderGamification({ points: 0, badges: [] });
           }
       } catch (error) {
           console.error("Error fetching user stats for header:", error);
           updateHeaderGamification(null); // Show error state
       }
   }

   /**
    * Updates the points and badges display in the header. (Copied)
    * @param {object | null} gamificationData - Object containing { points: number, badges: Array<object> } or null.
    */
   function updateHeaderGamification(gamificationData) {
       if (!userPointsElement || !userBadgesSummaryElement) return;
       if (gamificationData) {
            userPointsElement.textContent = `${gamificationData.points || 0}`;
            const badgeCount = gamificationData.badges?.length || 0;
            userBadgesSummaryElement.textContent = `${badgeCount}`;
            const badgeNames = gamificationData.badges?.map(b => b.name).join(', ') || 'No badges';
            userBadgesSummaryElement.title = `Earned Badges: ${badgeNames}`;
            userPointsElement.title = `Total Points: ${gamificationData.points || 0}`;
       } else { /* ... Loading state ... */
           userPointsElement.textContent = `...`; userBadgesSummaryElement.textContent = `...`;
           userPointsElement.title = `Total Points: Loading...`; userBadgesSummaryElement.title = `Earned Badges: Loading...`;
       }
   }


}); // End DOMContentLoaded