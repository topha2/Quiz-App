// Theme Logic
function initTheme() {
    // Default to Light Mode if no preference is saved, OR if saved is 'light'
    if (localStorage.theme === 'dark') {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light'; // Ensure it's set
        updateThemeIcon(false);
    }
}

function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
        updateThemeIcon(false);
    } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    // Some pages might not have the icon (like student view initially, but we will add it there too)
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (!sun || !moon) return;

    if (isDark) {
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
    } else {
        sun.classList.remove('hidden');
        moon.classList.add('hidden');
    }
}

// Initialize on load
initTheme();
