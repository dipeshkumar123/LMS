// public/js/app-common.js
// Shared UI logic for logged-in app pages

document.addEventListener('DOMContentLoaded', () => {
    // --- Dark Mode ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;

    function setDarkMode(isDark) {
         if (isDark) {
             body.classList.add('dark-mode');
             if(darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon
             localStorage.setItem('dark-mode', 'enabled');
         } else {
             body.classList.remove('dark-mode');
              if(darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon
             localStorage.setItem('dark-mode', 'disabled');
         }
         // Add this line to force re-evaluation of styles if needed, especially for pseudo-elements or complex selectors
         // document.documentElement.style.setProperty('--dm-trigger', Date.now());
         // Or more simply, dispatch an event that other components might listen to
         // window.dispatchEvent(new CustomEvent('darkmodechange', { detail: { isDark } }));
    }

    // Load preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedPreference = localStorage.getItem('dark-mode');
    // Default to saved preference, or OS preference if no preference saved
    const initialDarkMode = savedPreference === 'enabled' || (savedPreference === null && prefersDark);
    setDarkMode(initialDarkMode);


    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isCurrentlyDark = body.classList.contains('dark-mode');
            setDarkMode(!isCurrentlyDark);
        });
    }

    // --- Scroll to Top ---
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (scrollToTopBtn) {
         window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('active');
            } else {
                scrollToTopBtn.classList.remove('active');
            }
        });
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

     console.log('app-common.js loaded');

});