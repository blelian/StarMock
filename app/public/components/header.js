document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/components/header.html');
  let html = await res.text();

  const pathname = window.location.pathname;
  const publicPages = ['/', '/index.html', '/login.html', '/signup.html'];
  const isPublicPage = publicPages.some(page => pathname.endsWith(page));
  const isAuthenticated = !!localStorage.getItem('user');

  // Remove app nav entirely on public pages to prevent flicker
  if (isPublicPage) {
    html = html.replace(/<nav id="app-nav".*?<\/nav>/s, '');
  }

  document.getElementById('site-header').innerHTML = html;

  // DOM elements
  const appNav = document.getElementById('app-nav');
  const signInBtn = document.getElementById('signin-btn');
  const signUpBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');

  if (isPublicPage) {
    // Public pages: show only Sign In / Sign Up
    signInBtn?.classList.remove('hidden');
    signUpBtn?.classList.remove('hidden');
    return; // skip further logic
  }

  // Non-public pages: require authentication
  if (isAuthenticated) {
    appNav?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');
    signInBtn?.classList.add('hidden');
    signUpBtn?.classList.add('hidden');
  } else {
    // Redirect to login if not logged in
    window.location.href = '/login.html';
  }

  // Logout handler
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  });
});
