// public/js/profile.js

// Ensure auth.js is loaded first for checkLoginStatus and fetchAPI

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile script loaded');

    // --- DOM Elements ---
    const profileNameElement = document.getElementById('profile-name');
    const profileUsernameElement = document.getElementById('profile-username');
    const profileRoleElement = document.getElementById('profile-role');
    const profileIdElement = document.getElementById('profile-id');
    const deleteButton = document.getElementById('delete-account-btn');
    const deleteFeedbackElement = document.getElementById('delete-feedback');
    // Header elements for points/badges display
    const userPointsElement = document.getElementById('user-points');
    const userBadgesSummaryElement = document.getElementById('user-badges-summary');

    // --- Basic Checks ---
    if (!profileNameElement || !profileUsernameElement || !profileRoleElement || !profileIdElement || !deleteButton || !deleteFeedbackElement || !userPointsElement || !userBadgesSummaryElement) {
        console.error('Profile page init failed: Required elements not found.');
        return;
    }

    // --- Initialization ---
    const currentUser = await checkLoginStatus(true); // Ensure user is logged in
    if (!currentUser) {
        // Redirect handled by checkLoginStatus, but display error just in case
        document.body.innerHTML = '<p class="error-message container">User authentication failed. Please log in.</p>';
        return;
    }

    // --- Populate Profile Info ---
    populateProfileDetails(currentUser);

    // --- Load Header Gamification Stats ---
    updateHeaderGamification(null); // Initial loading state
    await loadUserGamificationStats(currentUser.id);

    // --- Event Listeners ---
    deleteButton.addEventListener('click', handleDeleteAccountClick);


    // --- Helper Functions ---

    /** Populates the profile details section */
    function populateProfileDetails(user) {
        profileNameElement.textContent = user.name || '(Not set)';
        profileUsernameElement.textContent = user.username;
        profileRoleElement.textContent = user.role;
        profileIdElement.textContent = user.id;
    }

    /** Shows feedback messages for the delete action */
    function showDeleteFeedback(message, type = 'info') {
         if (!deleteFeedbackElement) return;
         deleteFeedbackElement.textContent = message;
         deleteFeedbackElement.className = `feedback-message ${type}`; // Use type for styling
         deleteFeedbackElement.style.display = 'block';
    }

    /** Handles the click on the delete account button */
    async function handleDeleteAccountClick() {
        // Double-check confirmation
        const confirmation = window.confirm(
            "WARNING: Are you absolutely sure you want to delete your account and all associated data?\n\n" +
            "This action is permanent and cannot be undone."
        );

        if (!confirmation) {
            showDeleteFeedback('Account deletion cancelled.', 'info');
            return;
        }

        // Proceed with deletion
        deleteButton.disabled = true;
        deleteButton.textContent = 'Deleting...';
        deleteFeedbackElement.style.display = 'none'; // Hide previous feedback

        try {
            const response = await fetchAPI('/users/me', {
                method: 'DELETE'
            });

            // Success: Server should log user out by destroying session.
            showDeleteFeedback(response.message || 'Account deletion process initiated successfully. You will be logged out.', 'success');
            // Optional: Force redirect after a short delay, as session should be gone.
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000); // Redirect after 3 seconds

        } catch (error) {
            console.error("Account deletion failed:", error);
            showDeleteFeedback(`Error deleting account: ${error.message || 'Please try again later.'}`, 'error');
            deleteButton.disabled = false; // Re-enable button on failure
            deleteButton.textContent = 'Delete My Account and Data';
        }
    }


    // --- Gamification Stats Loading (Copied from leaderboard.js) ---
     /**
      * Fetches the current user's gamification stats to update the header.
      * @param {string} userId
      */
     async function loadUserGamificationStats(userId) {
          if (!userPointsElement || !userBadgesSummaryElement) return;
         try {
             const courses = await fetchAPI('/courses'); // HACK: Fetch any course analytics
             if (courses && courses.length > 0) {
                 const firstCourseId = courses[0]._id;
                 const stats = await fetchAPI(`/analytics/user/course/${firstCourseId}`);
                 updateHeaderGamification({ points: stats.points, badges: stats.badges });
             } else { updateHeaderGamification({ points: 0, badges: [] }); }
         } catch (error) { console.error("Error fetching user stats for header:", error); updateHeaderGamification(null); }
     }

     /**
      * Updates the points and badges display in the header. (Copied)
      * @param {object | null} gamificationData
      */
     function updateHeaderGamification(gamificationData) {
         if (!userPointsElement || !userBadgesSummaryElement) return;
         if (gamificationData) {
              userPointsElement.textContent = `${gamificationData.points || 0}`;
              const badgeCount = Array.isArray(gamificationData.badges) ? gamificationData.badges.length : (gamificationData.badgesCount !== undefined ? gamificationData.badgesCount : 0);
              userBadgesSummaryElement.textContent = `${badgeCount}`;
              const badgeNames = Array.isArray(gamificationData.badges) ? gamificationData.badges.map(b => b?.name || b?.id || '?').join(', ') : 'N/A'; // Handle array of objects or IDs
              userBadgesSummaryElement.title = `Earned Badges: ${badgeNames || 'None'}`;
              userPointsElement.title = `Total Points: ${gamificationData.points || 0}`;
         } else {
             userPointsElement.textContent = `...`; userBadgesSummaryElement.textContent = `...`;
             userPointsElement.title = `Total Points: Loading...`; userBadgesSummaryElement.title = `Earned Badges: Loading...`;
         }
     }

     // Utility (can be shared via separate utils.js file later)
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

}); // End DOMContentLoaded