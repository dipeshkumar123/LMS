document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const userName = document.getElementById('user-name');
    const userProfilePicture = document.querySelector('.navbar .profile img');
    const userRole = document.getElementById('user-role');
    const userEmail = document.getElementById('user-email');
    const userNameDropdown = document.getElementById('user-name-dropdown');
    const userProfilePictureDropdown = document.getElementById('user-profile-picture-dropdown');
    const userRoleDropdown = document.getElementById('user-role-dropdown');
    const coursesGrid = document.getElementById('courses-grid');
    const overallProgress = document.getElementById('overall-progress');
    const overallProgressBar = document.getElementById('overall-progress-bar');

    function loadUserData() {
        try {
            const user = mockData.user;
    
            if (!user) throw new Error("User data not found.");
    
            userName.textContent = user.name;
            userProfilePicture.src = user.profilePicture;
            userRole.textContent = user.role;
            userEmail.textContent = user.email;
            userNameDropdown.textContent = user.name;
            userProfilePictureDropdown.src = user.profilePicture;
            overallProgress.textContent = `${user.overallProgress}%`;
            overallProgressBar.style.width = `${user.overallProgress}%`;
        } catch (error) {
            console.error("Error loading user data:", error);
            document.querySelector('.main-content').innerHTML = `
                <p class="error-message">Failed to load user data. Please try again later.</p>
            `;
        }
    }
    
    

    function loadCourses() {
        try {
            const courses = mockData.courses;
            if (!courses || courses.length === 0) throw new Error("No courses available.");
    
            coursesGrid.innerHTML = '';
    
            courses.forEach(course => {
                const courseHTML = `
                    <article class="course-card">
                        <div class="course-image">
                            <img src="${course.image}" alt="${course.title}" loading="lazy">
                        </div>
                        <div class="course-info">
                            <h3>${course.title}</h3>
                            <div class="course-meta">
                                <span><i class="fas fa-clock"></i> ${course.duration}</span>
                                <span><i class="fas fa-user-graduate"></i> ${course.students}</span>
                            </div>
                            <p>${course.description}</p>
                            <a href="#" class="view-details">Continue Learning</a>
                        </div>
                    </article>
                `;
                coursesGrid.innerHTML += courseHTML;
            });
        } catch (error) {
            console.error("Error loading courses:", error);
            coursesGrid.innerHTML = `
                <p class="error-message">Failed to load courses. Please try again later.</p>
            `;
        }

        injectStructuredData(mockData.courses);

    }

    function generateStructuredData(course) {
        return {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": course.title,
            "description": course.description,
            "provider": {
                "@type": "Organization",
                "name": "EduMaster",
                "url": "https://edumaster.com"
            }
        };
    }
    
    function injectStructuredData(courses) {
        const structuredDataScript = document.createElement('script');
        structuredDataScript.type = 'application/ld+json';
        structuredDataScript.textContent = JSON.stringify(courses.map(generateStructuredData), null, 2);
        document.head.appendChild(structuredDataScript);
    }
    
    


    function showLoadingSpinner() {
        document.getElementById('loading-spinner').classList.add('active');
    }
    
    function hideLoadingSpinner() {
        document.getElementById('loading-spinner').classList.remove('active');
    }
    

    // Initialize Dashboard
    function initDashboard() {
        showLoadingSpinner();
        setTimeout(() => {
            loadUserData();
            loadCourses();
            hideLoadingSpinner();
        }, 1000); // Simulate loading delay
    }

    // Load Dashboard on Page Load
    initDashboard();
});







function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleButton = document.querySelector('.menu-toggle');
    
    if (window.innerWidth <= 768 && 
        !sidebar.contains(event.target) && 
        !toggleButton.contains(event.target) &&
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
        overlay.classList.remove('active');
    }
});

// Profile Dropdown functionality
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');

// Toggle dropdown on profile click
profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!profileTrigger.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});

// Close dropdown when sidebar is toggled
const originalToggleSidebar = toggleSidebar;
toggleSidebar = function() {
    originalToggleSidebar();
    profileDropdown.classList.remove('active');
};

const progressBarFill = document.querySelectorAll('.progress-bar-fill');
progressBarFill.forEach(bar => {
    const progressValue = bar.style.width;
    bar.setAttribute('data-progress', progressValue);
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
