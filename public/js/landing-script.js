function toggleMenu() {
    const nav = document.querySelector('.nav-links');
    nav.classList.toggle('active');
}

// Auth Modal Functions
function openAuthModal(formType) {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    switchAuthForm(formType);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
}

function switchAuthForm(formType) {
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const loginError = document.getElementById('login-error-msg');
    const signupError = document.getElementById('signup-error-msg');

    // Hide error messages when switching
    if (loginError) loginError.style.display = 'none';
    if (signupError) signupError.style.display = 'none';

    if (formType === 'login') {
        if (loginView) loginView.style.display = 'block';
        if (signupView) signupView.style.display = 'none';
    } else if (formType === 'signup') {
        if (loginView) loginView.style.display = 'none';
        if (signupView) signupView.style.display = 'block';
    }
}

// Form Validation for Login and Signup
document.querySelectorAll('.auth-form form').forEach(form => {
    form.addEventListener('submit', function(event) {
        const inputs = form.querySelectorAll('input[required]');
        let valid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                valid = false;
            } else {
                input.classList.remove('error');
            }
        });

        if (!valid) {
            event.preventDefault();
            alert('Please fill in all required fields.');
        }
    });
});


// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('auth-modal');
    if (event.target === modal) {
        closeAuthModal();
    }
};

// Scroll to Top Button
const scrollToTopBtn = document.getElementById('scrollToTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('active');
    } else {
        scrollToTopBtn.classList.remove('active');
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});


document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;

    // Load dark mode preference
    if (localStorage.getItem('dark-mode') === 'enabled') {
        body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');

        if (isDarkMode) {
            localStorage.setItem('dark-mode', 'enabled');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('dark-mode', 'disabled');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });

    // Force testimonial cards to update immediately
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    testimonialCards.forEach(card => {
        card.classList.toggle('dark-mode', body.classList.contains('dark-mode'));
    });
});

// --- NEW: API Integration ---

const API_BASE_URL = '/api'; // Backend API base path

/**
 * Simplified fetch wrapper for landing page (can customize error handling)
 */
async function postAuthData(endpoint, formDataObject) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(formDataObject)
        });

        const data = await response.json(); // Assume backend always sends JSON

        if (!response.ok) {
            // Use error from response body if available
            throw new Error(data.error || data.message || `HTTP error ${response.status}`);
        }

         // Check for explicit success: false?
        if (data.success === false) {
            throw new Error(data.error || data.message || 'Operation failed');
        }

        return data; // Return full response data (e.g., { success: true, user: {...} })

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        throw error; // Re-throw for the calling function to handle UI
    }
}

/** Displays error message within a specific form */
function showFormError(formId, message) {
    const errorElement = document.getElementById(`${formId}-error-msg`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// --- Login Form Handling ---
const loginFormElement = document.getElementById('login-form');
if (loginFormElement) {
    loginFormElement.addEventListener('submit', async function(event) {
        event.preventDefault();
        const submitButton = loginFormElement.querySelector('button[type="submit"]');
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const errorMsgElement = document.getElementById('login-error-msg');

        errorMsgElement.style.display = 'none'; // Hide previous errors
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        const formData = {
            username: usernameInput.value.trim(),
            password: passwordInput.value
        };

        try {
            const responseData = await postAuthData('/login', formData);
            console.log('Login successful:', responseData);
            // Redirect to the main application page upon success
            window.location.href = '/dashboard.html'; // Redirect to the main app dashboard
        } catch (error) {
            showFormError('login', error.message || 'Login failed.');
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
            passwordInput.value = ''; // Clear password on error
        }
    });
}


// --- Signup Form Handling ---
const signupFormElement = document.getElementById('signup-form');
if (signupFormElement) {
    signupFormElement.addEventListener('submit', async function(event) {
        event.preventDefault();
        const submitButton = signupFormElement.querySelector('button[type="submit"]');
        const nameInput = document.getElementById('signup-name');
        const usernameInput = document.getElementById('signup-username');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const errorMsgElement = document.getElementById('signup-error-msg');

        errorMsgElement.style.display = 'none'; // Hide previous errors
        submitButton.disabled = true;
        submitButton.textContent = 'Signing up...';

        // Basic client-side validation (add password match if needed)
        if (passwordInput.value.length < 6) {
            showFormError('signup', 'Password must be at least 6 characters.');
            submitButton.disabled = false; submitButton.textContent = 'Signup'; return;
        }

        const formData = {
            name: nameInput.value.trim(),
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
        };

        try {
            const responseData = await postAuthData('/register', formData);
            console.log('Signup successful:', responseData);
             // Redirect to the main application page upon success
            window.location.href = '/dashboard.html'; // Redirect to the main app dashboard
        } catch (error) {
            showFormError('signup', error.message || 'Signup failed.');
            submitButton.disabled = false;
            submitButton.textContent = 'Signup';
        }
    });
}