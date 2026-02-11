document.addEventListener('DOMContentLoaded', async () => {
  const publicPages = ['/', '/index.html', '/login.html', '/signup.html'];
  const pathname = window.location.pathname;
  const isPublicPage = publicPages.some((page) => pathname.endsWith(page));

  const redirectToLogin = () => {
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    );
    window.location.href = `/login.html?next=${next}`;
  };

  const resolveAuthState = async () => {
    if (window.__STARMOCK_AUTH?.checked) {
      return !!window.__STARMOCK_AUTH.isAuthenticated;
    }

    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
      });
      const payload = response.ok ? await response.json() : null;
      const isAuthenticated = !!payload?.isAuthenticated;
      window.__STARMOCK_AUTH = { checked: true, isAuthenticated };
      return isAuthenticated;
    } catch {
      window.__STARMOCK_AUTH = { checked: true, isAuthenticated: false };
      return false;
    }
  };

  const isAuthenticated = await resolveAuthState();

  const headerHost = document.getElementById('site-header');
  if (!headerHost) {
    return;
  }

  const res = await fetch('/components/header.html');
  let html = await res.text();

  if (isPublicPage) {
    html = html.replace(/<nav id="app-nav".*?<\/nav>/s, '');
  }

  headerHost.innerHTML = html;

  const appNav = document.getElementById('app-nav');
  const signInBtn = document.getElementById('signin-btn');
  const signUpBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');

  const setPublicButtonsVisible = (visible) => {
    [signInBtn, signUpBtn].forEach((button) => {
      if (!button) return;
      if (visible) {
        button.classList.remove('hidden');
        button.classList.add('sm:block');
      } else {
        button.classList.add('hidden');
        button.classList.remove('sm:block');
      }
    });
  };

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Redirect regardless of logout call result.
    }
    window.__STARMOCK_AUTH = { checked: true, isAuthenticated: false };
    window.location.href = '/index.html';
  });

  if (isPublicPage) {
    setPublicButtonsVisible(!isAuthenticated);
    logoutBtn?.classList.toggle('hidden', !isAuthenticated);
    return;
  }

  if (!isAuthenticated) {
    redirectToLogin();
    return;
  }

  appNav?.classList.remove('hidden');
  setPublicButtonsVisible(false);
  logoutBtn?.classList.remove('hidden');
});
