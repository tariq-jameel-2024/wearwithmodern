const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const htmlElement = document.documentElement;

if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlElement.classList.add('dark');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
} else {
    htmlElement.classList.remove('dark');
    themeIcon.classList.add('fa-moon');
    themeIcon.classList.remove('fa-sun');
}

themeToggleBtn.addEventListener('click', function() {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
        themeIcon.classList.add('fa-moon');
        themeIcon.classList.remove('fa-sun');
    } else {
        htmlElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
});