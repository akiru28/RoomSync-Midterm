/* main.js — UI helpers, verified session state, and role-aware navigation */
(function () {
  'use strict';
  const TOKEN = 'rr_token', USER = 'rr_user';
  const CAN_RESERVE = ['instructor'];
  const CAN_APPROVE = ['admin'];
  let currentUser = null, readyPromise = Promise.resolve(null);
  const qs = (s, c) => (c || document).querySelector(s);
  const qa = (s, c) => Array.from((c || document).querySelectorAll(s));
  window.qs = qs; window.qa = qa;
  window.formatDateLocal = (v) => v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  window.formatDateShort = (v) => v ? new Date(v).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
  window.formatTime = (v) => v ? new Date(v).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—';
  window.showToast = (type, title, message) => {
    let box = qs('.toast-container'); if (!box) { box = document.createElement('div'); box.className = 'toast-container'; document.body.appendChild(box); }
    const item = document.createElement('div'); item.className = `toast ${type || 'info'}`;
    item.innerHTML = '<div class="toast-body"><p class="toast-title"></p><p class="toast-msg"></p></div>';
    item.querySelector('.toast-title').textContent = title || ''; item.querySelector('.toast-msg').textContent = message || '';
    box.appendChild(item); setTimeout(() => item.remove(), 4500);
  };
  const hide = (el, yes) => {
    if (!el) return;
    el.hidden = !!yes;
    if (el.tagName === 'LI') el.toggleAttribute('hidden', !!yes);
    if (yes) el.style.setProperty('display', 'none', 'important');
    else el.style.removeProperty('display');
  };
  const Auth = {
    getToken: () => localStorage.getItem(TOKEN), getCurrentUser: () => currentUser, getCurrentRole: () => currentUser?.role || null,
    displayRole: (r) => ({ admin: 'Admin', instructor: 'Faculty', lab_tech: 'Lab Tech', student: 'Student' }[r] || 'User'),
    isAuthenticated: () => Boolean(currentUser && Auth.getToken()),
    isAdmin: () => Auth.getCurrentRole() === 'admin',
    isFaculty: () => Auth.getCurrentRole() === 'instructor',
    isLabTech: () => Auth.getCurrentRole() === 'lab_tech',
    isStudent: () => Auth.getCurrentRole() === 'student',
    canReserve: () => CAN_RESERVE.includes(Auth.getCurrentRole()),
    canApprove: () => CAN_APPROVE.includes(Auth.getCurrentRole()),
    ready: () => readyPromise,
    setSession(token, user) { localStorage.setItem(TOKEN, token); localStorage.setItem(USER, JSON.stringify(user)); currentUser = user; Auth.renderNavigation(); },
    clearSession(redirect) { localStorage.removeItem(TOKEN); localStorage.removeItem(USER); currentUser = null; if (redirect && !location.pathname.endsWith('login.html')) location.href = 'login.html'; },
    async initialize() { if (!Auth.getToken() || !window.Api) { Auth.renderNavigation(); return null; } try { currentUser = await window.Api.get('/auth/me'); localStorage.setItem(USER, JSON.stringify(currentUser)); } catch (_) { Auth.clearSession(false); } Auth.renderNavigation(); return currentUser; },
    async requireAuth() { await Auth.ready(); if (Auth.isAuthenticated()) return true; window.showToast('warning', 'Login required', 'Please sign in to continue.'); setTimeout(() => location.href = 'login.html', 300); return false; },
    async requireRole(...roles) { if (!(await Auth.requireAuth())) return false; if (roles.includes(Auth.getCurrentRole())) return true; window.showToast('error', 'Access denied', 'You do not have permission to view this page.'); setTimeout(() => location.href = 'dashboard.html', 300); return false; },
    async requireCanReserve() { return Auth.requireRole(...CAN_RESERVE); },
    async requireCanApprove() { return Auth.requireRole(...CAN_APPROVE); },
    async logout() { try { if (Auth.getToken()) await window.Api.post('/auth/logout', {}); } catch (_) {} Auth.clearSession(false); location.href = 'index.html'; },
    renderNavigation() {
      const user = currentUser;
      const admin = Auth.isAdmin();
      const student = Auth.isStudent();
      const labTech = Auth.isLabTech();
      const reportAccess = labTech || admin;
      const canReserve = Auth.canReserve();

      qa('[data-admin-only]').forEach((el) => { hide(el, !admin); });
      qa('a[href="admin.html"]').forEach((el) => {
        hide(el.closest('li'), !admin);
        hide(el, !admin);
      });
      qa('[data-can-reserve]').forEach((el) => {
        const li = el.closest && el.closest('li');
        hide(el, !canReserve);
        if (li && li !== el) hide(li, !canReserve);
      });
      qa('a[href="reservation.html"]').forEach((el) => {
        hide(el, !canReserve);
        const li = el.closest && el.closest('li');
        if (li) hide(li, !canReserve);
      });
      qa('a[href="my-reservations.html"]').forEach((el) => {
        hide(el, !canReserve);
        const li = el.closest && el.closest('li');
        if (li) hide(li, !canReserve);
      });
      qa('[data-report-access]').forEach((el) => hide(el, !reportAccess));
      qa('[data-no-student]').forEach((el) => {
        hide(el, student);
        const li = el.closest && el.closest('li');
        if (li && li !== el) hide(li, student);
      });
      qa('[data-user-only]').forEach((el) => hide(el, !user));
      qa('[data-guest-only]').forEach((el) => hide(el, Boolean(user)));
      qa('[data-role-label]').forEach((el) => el.textContent = user ? Auth.displayRole(user.role) : '');
      qa('[data-user-name]').forEach((el) => el.textContent = user?.name || user?.email || 'User');
      qa('a.brand').forEach((el) => {
        el.setAttribute('href', user ? 'dashboard.html' : 'home.html');
      });
      qa('[data-logout]').forEach((el) => {
        el.onclick = (e) => {
          e.preventDefault();
          Auth.logout();
        };
      });
    }
  };
  window.Auth = Auth; readyPromise = Auth.initialize();
  document.addEventListener('roomsync:components-ready', Auth.renderNavigation);
  document.addEventListener('roomsync:components-ready', () => {
    const year = qs('#footer-year');
    if (year) year.textContent = new Date().getFullYear();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const year = qs('#footer-year'); if (year) year.textContent = new Date().getFullYear();
    const header = qs('.site-header');
    const applyScroll = () => { if (header) header.classList.toggle('scrolled', window.scrollY > 8); };
    applyScroll(); window.addEventListener('scroll', applyScroll, { passive: true });

    const navToggle = qs('.nav-toggle');
    const sidebar = qs('#sidebar');
    if (navToggle && sidebar) {
      navToggle.addEventListener('click', (e) => {
        e.preventDefault();
        sidebar.classList.toggle('open');
        let bd = qs('.sidebar-backdrop');
        if (!bd) {
          bd = document.createElement('div');
          bd.className = 'sidebar-backdrop';
          document.body.appendChild(bd);
          bd.addEventListener('click', () => { sidebar.classList.remove('open'); bd.classList.remove('open'); });
        }
        bd.classList.toggle('open', sidebar.classList.contains('open'));
      });
    }

    qa('.page-header + section, .page-header + .card, .page-header ~ section, .page-header ~ .card, main.container > .grid-3, main.container > .card, main.container > .table-wrap, main.container > form.card, main.container > .calendar-wrap')
      .forEach((el, i) => el.classList.add('fade-up', `d${Math.min(8, (i % 8) + 1)}`));

    const path = location.pathname.split('/').pop() || 'dashboard.html';
    qa('.sidebar a[href], .topnav a[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (!href || href.startsWith('#')) return;
      const matches = href === path || (path === '' && href === 'index.html');
      if (matches) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
    });
  });
})();
