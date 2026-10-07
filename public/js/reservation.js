/* reservation.js — API-backed reservation submission */
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireCanReserve())) return;
  const form = document.getElementById('reservation-form'); if (!form) return;
  const select = form.querySelector('[name="room_id"]');
  const loadingIndicator = document.getElementById('res-room-loading');
  const loading = document.createElement('option');
  loading.textContent = 'Loading rooms…';
  select.replaceChildren(loading);
  select.setAttribute('aria-busy', 'true');
  if (loadingIndicator) loadingIndicator.hidden = false;
  try {
    const rooms = await Api.get('/rooms'); const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Select a room…';
    const options = rooms.map(r => { const option = document.createElement('option'); option.value = r.id; option.textContent = `${r.name} (${r.capacity} pax)`; return option; });
    select.replaceChildren(placeholder, ...options);
  }
  catch (err) { const unavailable = document.createElement('option'); unavailable.value = ''; unavailable.textContent = 'Unable to load rooms'; select.replaceChildren(unavailable); window.showToast('error', 'Rooms unavailable', err.message); }
  finally {
    select.removeAttribute('aria-busy');
    if (loadingIndicator) loadingIndicator.hidden = true;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(form).entries()); const start = new Date(f.start_time), end = new Date(f.end_time);
    if (!f.room_id || !f.purpose || !f.programSection.trim() || Number.isNaN(start) || Number.isNaN(end) || start >= end) return window.showToast('warning', 'Check reservation details', 'Choose a room, purpose, program/section, and a valid time range.');
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Submitting…';
    try { const r = await Api.post('/reservations', { roomId: Number(f.room_id), purpose: f.purpose, programSection: f.programSection.trim(), startDate: start.toISOString(), endDate: end.toISOString(), attendees: Number(f.attendees || 1), notes: f.notes || '' }); window.showToast('success', 'Request submitted', `Reservation status: ${r.status}.`); setTimeout(() => location.href = 'my-reservations.html', 600); }
    catch (err) { window.showToast('error', 'Reservation not submitted', err.message); button.disabled = false; button.textContent = 'Submit Request'; }
  });
});
