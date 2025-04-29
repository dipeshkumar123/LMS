// public/js/auth.js

const API_BASE_URL = '/api';

// --- DOM Elements (Common across pages that use auth) ---
const logoutButton = document.getElementById('logout-button');
const userGreetingElement = document.getElementById('user-greeting');
const loginForm = document.getElementById('login-form');
const loginErrorElement = document.getElementById('login-error');
const userPointsElement = document.getElementById('user-points');
const userBadgesSummaryElement = document.getElementById('user-badges-summary');

// --- Helper Function for API Requests ---
async function fetchAPI(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`; // Ensure endpoint is prefixed with a slash if not already
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json', // Default content type
                'Accept': 'application/json',
                ...options.headers, // Allow overriding headers
            },
            ...options, // Spread other options like method, body
        });

        // Attempt to parse JSON, even for errors, as API might send error details
        const data = await response.json().catch(() => null); // Handle cases where response is not JSON

        if (!response.ok) {
            // Use error message from API response if available, otherwise use status text
            const errorMessage = data?.error || data?.message || response.statusText || `HTTP error! status: ${response.status}`;
            console.error(`API Error (${response.status}) on ${url}:`, errorMessage, data);
            // Throw an error object that includes status and parsed data (if any)
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data; // Attach the parsed data for more context
            throw error;
        }

        // Check for backend-indicated failure even with 2xx status (optional, depends on backend consistency)
        // if (data && data.success === false) {
        //      const errorMessage = data.error || data.message || 'API indicated failure';
        //      const error = new Error(errorMessage);
        //      error.status = response.status; // Keep original status
        //      error.data = data;
        //      throw error;
        // }

        // Return the relevant data, potentially nested under 'data' key
        // Adjust this based on how consistently your backend wraps responses
        return data?.data ?? data; // Prefer data.data if exists, otherwise return the whole object

        return data?.data ?? data; // Return parsed JSON data on success
    } catch (error) {
        console.error('Network or Fetch error:', error);
         // Re-throw the error so calling functions know it failed
         // If it's not an error we constructed above, wrap it
         if (!error.status) {
             const networkError = new Error('Network error or server unreachable.');
             networkError.isNetworkError = true; // Add a flag to identify network errors
             throw networkError;
         }
         throw error;
    }
}


// --- Authentication Functions ---
async function handleLogin(event) {
    event.preventDefault(); // Prevent default form submission
    if (!loginForm) return; // Only run if login form exists

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (loginErrorElement) loginErrorElement.style.display = 'none'; // Hide previous errors

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginError('Username and password are required.');
        return;
    }

    try {
        const data = await fetchAPI('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        console.log('Login successful:', data.user);
        // Redirect to the dashboard on successful login
        window.location.href = '/index.html';

    } catch (error) {
        // Display error message from API or a generic one
        showLoginError(error.message || 'Login failed. Please check your credentials or try again later.');
        if(passwordInput) passwordInput.value = ''; // Clear password field on error
    }
}

// Displays an error message on the login form.
function showLoginError(message) {
     if (loginErrorElement) {
        loginErrorElement.textContent = message;
        loginErrorElement.style.display = 'block';
    } else {
        console.error("Login Error:", message); // Fallback if element not found
    }
}


/**
 * Handles the logout action.
 */
async function handleLogout() {
    console.log('Attempting logout...');
    try {
        // Logout response is now { success: true, message: '...' }
        const responseData = await fetchAPI('/logout', { method: 'GET' }); // No longer needs GET? Check route def
        console.log('Logout successful on client:', responseData.message);
        window.location.href = '/login.html';
    } catch (error) {
        alert(`Logout failed: ${error.message}. Redirecting to login page.`);
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
}

/**
 * Checks if the user is currently logged in.
 * If not logged in and `redirectIfLoggedOut` is true, redirects to login page.
 * Updates the user greeting element if found.
 * @param {boolean} redirectIfLoggedOut - Whether to redirect to login if not authenticated.
 * @returns {Promise<object|null>} - The user object if logged in, null otherwise.
 */
async function checkLoginStatus(redirectIfLoggedOut = true) {
    try {
        // getCurrentUser response is { success: true, user: {...} }
        const responseData = await fetchAPI('/current-user'); // Endpoint relative to /api
        const user = responseData.user; // Access user data directly
        console.log('User is logged in:', user);

        // Update greeting
        if (userGreetingElement) {
            userGreetingElement.textContent = `Welcome, ${user.name || user.username}! (${user.role})`;
        }
        // Update header gamification (basic display, actual values fetched by specific page scripts)
        updateHeaderGamification(null); // Show loading initially, let page scripts fill data

         // Show/setup logout button
        if (logoutButton) {
             logoutButton.style.display = 'inline-block';
             if (!logoutButton.hasAttribute('data-listener-attached')) {
                logoutButton.addEventListener('click', handleLogout);
                logoutButton.setAttribute('data-listener-attached', 'true');
            }
        }
        return user; // Return user data from session

    } catch (error) {
        console.log('User not logged in or session error.');
         if (userGreetingElement) userGreetingElement.textContent = 'Not logged in';
         if (logoutButton) logoutButton.style.display = 'none';
         updateHeaderGamification(null); // Clear gamification display

        if (redirectIfLoggedOut && error.status === 401) {
            console.log('Redirecting to login page...');
            window.location.href = '/login.html';
        }
        return null;
    }
}

/**
 * Updates header gamification display (placeholder/loading state).
 * Specific page scripts will call this with actual data later.
 */
function updateHeaderGamification(gamificationData) {
    if (!userPointsElement || !userBadgesSummaryElement) return;

    if (gamificationData) { // If actual data provided
        userPointsElement.textContent = `${gamificationData.points || 0}`;
        const badgeCount = Array.isArray(gamificationData.badges) ? gamificationData.badges.length : (gamificationData.badgesCount !== undefined ? gamificationData.badgesCount : 0);
        userBadgesSummaryElement.textContent = `${badgeCount}`;
        // Tooltip requires fetching full badge data, maybe deferred
        userPointsElement.title = `Total Points: ${gamificationData.points || 0}`;
        userBadgesSummaryElement.title = `Earned Badges: ${badgeCount}`;
    } else { // Loading or error state
        userPointsElement.textContent = `...`;
        userBadgesSummaryElement.textContent = `...`;
        userPointsElement.title = `Total Points: Loading...`;
        userBadgesSummaryElement.title = `Earned Badges: Loading...`;
    }
}

// --- Event Listeners ---

// Add login form listener only if the form exists on the current page
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Add logout listener if the button exists (checkLoginStatus will typically handle adding it,
// but this ensures it's tried even if checkLoginStatus fails initially)
// CheckLoginStatus is preferred as it ensures user is logged in before showing the button
// if (logoutButton) {
//    logoutButton.addEventListener('click', handleLogout);
// }

// Expose necessary functions globally if needed, or rely on event listeners
// window.auth = { checkLoginStatus, handleLogout }; // Example if needed by inline scripts (avoid if possible)

console.log('auth.js loaded');

// --- Auto-run checkLoginStatus on pages that include this script and are NOT the login page ---
if (!window.location.pathname.includes('/login.html')) {
    console.log("Checking login status on page load...");
    checkLoginStatus(true); // Redirect if not logged in
}