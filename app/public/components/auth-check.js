// auth-check.js
document.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('user'); // or however you track login
  const protectedPages = ['/dashboard.html', '/interview.html', '/feedback.html'];

  if (protectedPages.includes(window.location.pathname) && !user) {
    alert('You must be logged in to access this page.');
    window.location.href = '/login.html';
  }
});
