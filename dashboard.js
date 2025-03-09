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
        const user = mockData.user;
        userName.textContent = user.name;
        userProfilePicture.src = user.profilePicture;
        userRole.textContent = user.role;
        userEmail.textContent = user.email;
        userNameDropdown.textContent = user.name;
        userProfilePictureDropdown.src = user.profilePicture;
        userRole.textContentDropdown = user.role;
        overallProgress.textContent = `${user.overallProgress}%`;
        overallProgressBar.style.width = `${user.overallProgress}%`;
    }
    

    function loadCourses() {
        const courses = mockData.courses;
        coursesGrid.innerHTML = ''; // Clear previous content
    
        courses.forEach(course => {
            const courseHTML = `
                <article class="course-card">
                    <div class="course-image">
                        <img src="${course.image}" alt="${course.title}">
                    </div>
                    <div class="course-info">
                        <h3>${course.title}</h3>
                        <div class="course-meta">
                            <span><i class="fas fa-clock"></i> ${course.duration}</span>
                            <span><i class="fas fa-user-graduate"></i> ${course.students}</span>
                        </div>
                        <p>${course.description}</p>
                        <div class="progress-bar">
                            <div class="progress-bar-fill" style="width: ${course.progress}%;">
                                ${course.progress}%
                            </div>
                        </div>
                    </div>
                </article>
            `;
            coursesGrid.innerHTML += courseHTML;
        });
    }
    

    // Initialize Dashboard
    function initDashboard() {
        loadUserData();
        loadCourses();
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
