/* auth.js — API-backed login and public Student registration */
document.addEventListener('DOMContentLoaded', () => {
  const setBusy = (form, busy, label) => { const b = form.querySelector('button[type="submit"]'); if (b) { b.disabled = busy; b.textContent = busy ? label : b.dataset.label; } };
  const login = document.getElementById('login-form');
  if (login) {
    const button = login.querySelector('button[type="submit"]'); if (button) button.dataset.label = button.textContent;
    login.addEventListener('submit', async (e) => {
      e.preventDefault(); setBusy(login, true, 'Signing in…');
      try { const result = await Api.post('/auth/login', Object.fromEntries(new FormData(login).entries())); Auth.setSession(result.token, result.user); window.showToast('success', 'Welcome back', `Signed in as ${Auth.displayRole(result.user.role)}.`); location.href = 'dashboard.html'; }
      catch (err) { window.showToast('error', 'Sign in failed', err.message); setBusy(login, false); }
    });
  }
  const register = document.getElementById('register-form');
  if (register) {
    const button = register.querySelector('button[type="submit"]'); if (button) button.dataset.label = button.textContent;
    register.addEventListener('submit', async (e) => {
      e.preventDefault(); setBusy(register, true, 'Creating account…');
      const data = Object.fromEntries(new FormData(register).entries()); data.role = 'student';
      try { const result = await Api.post('/auth/register', data); Auth.setSession(result.token, result.user); window.showToast('success', 'Account created', 'Your Student account is ready.'); location.href = 'dashboard.html'; }
      catch (err) { window.showToast('error', 'Registration failed', err.message); setBusy(register, false); }
    });
  }
});
