// auth-check.js
document.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('user'); // Check login
  const protectedPages = [
    '/dashboard.html',
    '/interview.html',
    '/feedback.html',
    '/history.html'
  ];

  // Only redirect if page is protected and user not logged in
  if (protectedPages.includes(window.location.pathname) && !user) {
    // Optional: nicer UI than alert
    alert('You must be logged in to access this page.');
    window.location.href = '/login.html';
  }
});
