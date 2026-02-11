const protectedPages = new Set([
  '/dashboard.html',
  '/interview.html',
  '/feedback.html',
  '/history.html',
]);

const isProtectedPage = protectedPages.has(window.location.pathname);

if (isProtectedPage) {
  const redirectToLogin = () => {
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    );
    window.location.href = `/login.html?next=${next}`;
  };

  fetch('/api/auth/status', { credentials: 'include' })
    .then(async (response) => {
      const payload = response.ok ? await response.json() : null;
      const isAuthenticated = !!payload?.isAuthenticated;
      window.__STARMOCK_AUTH = { checked: true, isAuthenticated };

      if (!isAuthenticated) {
        redirectToLogin();
      }
    })
    .catch(() => {
      window.__STARMOCK_AUTH = { checked: true, isAuthenticated: false };
      redirectToLogin();
    });
}
