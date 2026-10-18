(async function () {
  'use strict';
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const panel = document.getElementById('signed-in');

  try {
    const s = await SB.api('/api/admin/session');
    if (s.authenticated) { form.hidden = true; panel.hidden = false; }
  } catch (e) { errorBox.textContent = e.message; }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await SB.api('/api/admin/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    panel.hidden = true; form.hidden = false; SB.toast('You are logged out.', 'success');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    errorBox.textContent = '';
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!username || !password) { errorBox.textContent = 'Enter your username and password.'; return; }
    btn.disabled = true; btn.querySelector('.spinner').hidden = false;
    try {
      await SB.api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      location.assign('upload.html');
    } catch (err) {
      errorBox.textContent = err.message; form.password.value = '';
      btn.disabled = false; btn.querySelector('.spinner').hidden = true;
    }
  });
})();
