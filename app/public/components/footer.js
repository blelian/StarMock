document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/components/footer.html');
  const html = await res.text();
  document.getElementById('site-footer').innerHTML = html;
});
