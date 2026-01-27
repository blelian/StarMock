document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/components/header.html');
  const html = await res.text();
  document.getElementById('site-header').innerHTML = html;
});
