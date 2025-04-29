// public/js/leaderboard.js

// Ensure auth.js is loaded first for checkLoginStatus and fetchAPI

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Leaderboard script loaded');

    // --- DOM Elements ---
    const leaderboardContentElement = document.getElementById('leaderboard-content');
    const leaderboardErrorElement = document.getElementById('leaderboard-error');
    // Header elements for points/badges display
    const userPointsElement = document.getElementById('user-points');
    const userBadgesSummaryElement = document.getElementById('user-badges-summary');

    // --- Basic Checks ---
    if (!leaderboardContentElement || !leaderboardErrorElement || !userPointsElement || !userBadgesSummaryElement) {
        console.error('Leaderboard init failed: Required elements not found.');
        return;
    }

    // --- Initialization ---
    const currentUser = await checkLoginStatus(true); // Ensure user is logged in
    if (!currentUser) {
        displayLeaderboardError('User authentication failed.');
        updateHeaderGamification(null); // Show loading/error state in header
        return;
    }

    // --- Load Data ---
    leaderboardContentElement.innerHTML = '<p>Loading leaderboard...</p>';
    updateHeaderGamification(null); // Show loading state for points/badges

    // Fetch leaderboard and user's own stats (could be separate endpoint or combined)
    // For now, fetch leaderboard and then fetch user's course analytics for points/badges
    await loadLeaderboard();
    await loadUserGamificationStats(currentUser.id); // Fetch user's own stats for the header

    // --- Helper Functions ---
    function displayLeaderboardError(message) {
        console.error("Leaderboard Error:", message);
        if (leaderboardErrorElement) {
            leaderboardErrorElement.textContent = message;
            leaderboardErrorElement.style.display = 'block';
        }
    }

    function clearLeaderboardError() {
         if (leaderboardErrorElement) {
            leaderboardErrorElement.textContent = '';
            leaderboardErrorElement.style.display = 'none';
        }
    }

    // --- Data Loading and Rendering ---

    /**
     * Fetches and displays the leaderboard table.
     */
    async function loadLeaderboard() {
        clearLeaderboardError();
        leaderboardContentElement.innerHTML = '<p>Loading leaderboard...</p>';
        try {
            const leaderboardData = await fetchAPI('/gamification/leaderboard');

            if (!leaderboardData || leaderboardData.length === 0) {
                leaderboardContentElement.innerHTML = '<p>The leaderboard is empty. Be the first to earn points!</p>';
                return;
            }

            renderLeaderboardTable(leaderboardData, currentUser.id);

        } catch (error) {
            console.error("Error loading leaderboard:", error);
            displayLeaderboardError(`Failed to load leaderboard: ${error.message}`);
            leaderboardContentElement.innerHTML = ''; // Clear loading message on error
        }
    }

    /**
     * Renders the leaderboard data into a table.
     * @param {Array} leaderboardData - Array of leaderboard entry objects ({userId, name, points}).
     */
    function renderLeaderboardTable(leaderboardData, currentUserId) {
         let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
         `;

         leaderboardData.forEach((entry, index) => {
             const rank = index + 1;
             const userIdToCheck = entry._id || entry.userId;
             // Add a class if the entry is the current user
            const isCurrentUser = userIdToCheck === currentUserId ? ' class="current-user-row"' : '';
             tableHTML += `
                 <tr${isCurrentUser}>
                     <td>${rank}</td>
                     <td>${escapeHTML(entry.name || 'Anonymous')}</td>
                     <td>${entry.points || 0}</td>
                 </tr>
             `;
         });

         tableHTML += `</tbody></table>`;
         leaderboardContentElement.innerHTML = tableHTML;
    }

     /**
      * Fetches the current user's gamification stats to update the header.
      * Reuses the dashboard analytics endpoint logic (fetches one course arbitrarily).
      * A dedicated '/api/user/me/stats' endpoint would be better.
      * @param {string} userId
      */
     async function loadUserGamificationStats(userId) {

        if (!userPointsElement || !userBadgesSummaryElement) return;

         try {
             // HACK: Fetch analytics for *any* course to get global points/badges.
             // Ideally, we'd have a dedicated endpoint like /api/user/me/gamification
             const courses = await fetchAPI('/courses');
             if (courses && courses.length > 0) {
                 const firstCourseId = courses[0]._id; // Just pick the first one
                 const stats = await fetchAPI(`/analytics/user/course/${firstCourseId}`);
                 updateHeaderGamification({ points: stats.points, badges: stats.badges });
             } else {
                 // No courses, assume 0 points/badges
                 updateHeaderGamification({ points: 0, badges: [] });
             }
         } catch (error) {
             console.error("Error fetching user stats for header:", error);
             updateHeaderGamification(null); // Show error state
         }
     }

    /**
     * Updates the points and badges display in the header. (Copied from dashboard.js)
     * @param {object | null} gamificationData - Object containing { points: number, badges: Array<object> } or null.
     */
    function updateHeaderGamification(gamificationData) {
         // const userPointsElement = document.getElementById('user-points'); // Already defined above
         // const userBadgesSummaryElement = document.getElementById('user-badges-summary'); // Already defined above
         if (!userPointsElement || !userBadgesSummaryElement) return;

         if (gamificationData) {
              userPointsElement.textContent = `${gamificationData.points || 0}`;
              const badgeCount = gamificationData.badges?.length || 0;
              userBadgesSummaryElement.textContent = `${badgeCount}`;
              const badgeNames = gamificationData.badges?.map(b => b.name).join(', ') || 'No badges earned yet';
              userBadgesSummaryElement.title = `Earned Badges: ${badgeNames}`;
              userPointsElement.title = `Total Points: ${gamificationData.points || 0}`;
         } else {
             userPointsElement.textContent = `...`; userBadgesSummaryElement.textContent = `...`;
             userPointsElement.title = `Total Points: Loading...`; userBadgesSummaryElement.title = `Earned Badges: Loading...`;
         }
     }

    // Utility (Copied from course.js)
    function escapeHTML(str) {
         const div = document.createElement('div');
         div.textContent = str;
         return div.innerHTML;
     }

}); // End DOMContentLoaded