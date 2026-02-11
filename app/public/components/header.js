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

  const setPublicAuthButtonsHidden = (hidden) => {
    [signInBtn, signUpBtn].forEach((button) => {
      if (!button) return;

      if (hidden) {
        // Force-hide regardless of responsive Tailwind display classes.
        button.style.display = 'none';
        button.classList.add('hidden');
        button.classList.remove('sm:block');
      } else {
        // Default public behavior: hidden on mobile, visible from sm and up.
        button.style.removeProperty('display');
        button.classList.add('hidden');
        button.classList.add('sm:block');
      }
    });
  };

  const bindLogout = () => {
    logoutBtn?.addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.href = '/index.html';
    });
  };

  if (isPublicPage) {
    // Public pages: hide auth links for logged-in users.
    if (isAuthenticated) {
      setPublicAuthButtonsHidden(true);
      logoutBtn?.classList.remove('hidden');
      bindLogout();
    } else {
      setPublicAuthButtonsHidden(false);
      logoutBtn?.classList.add('hidden');
    }
    return; // skip further logic
  }

  // Non-public pages: require authentication
  if (isAuthenticated) {
    appNav?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');
    setPublicAuthButtonsHidden(true);
  } else {
    // Redirect to login if not logged in
    window.location.href = '/login.html';
  }

  bindLogout();
});
