/* calendar.js — renders the approved room schedule without exposing request details */
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireAuth())) return; const role = Auth.getCurrentRole(); const isStudent = role === 'student'; const root = document.getElementById('calendar'); root.innerHTML = `<table class="table" aria-hidden="true"><tbody>${window.RoomSyncSkeletons.tableRows(6, isStudent ? 3 : 4)}</tbody></table>`; root.setAttribute('aria-busy', 'true');
  if (isStudent) document.querySelector('.legend')?.setAttribute('hidden', '');
  try {
    const reservations = await Api.get('/reservations/schedule');
    root.setAttribute('aria-busy', 'false');
    if (!reservations.length) { const message = document.createElement('p'); message.className = 'muted'; message.textContent = 'No reservations found.'; root.replaceChildren(message); return; }
    const table = document.createElement('table'); table.className = 'table';
    const thead = document.createElement('thead'), header = document.createElement('tr');
    (isStudent ? ['Room', 'Start', 'End'] : ['Room', 'Start', 'End', 'Status']).forEach(label => { const th = document.createElement('th'); th.textContent = label; header.append(th); });
    thead.append(header); const tbody = document.createElement('tbody');
    reservations.forEach(r => {
      const row = document.createElement('tr');
      [r.roomName, formatDateLocal(r.startDate), formatDateLocal(r.endDate)].forEach(value => { const cell = document.createElement('td'); cell.textContent = value ?? ''; row.append(cell); });
      if (!isStudent) {
        const statusCell = document.createElement('td'), badge = document.createElement('span'); badge.className = 'badge'; if (typeof r.status === 'string' && /^[a-z-]+$/.test(r.status)) badge.classList.add(r.status); badge.textContent = r.status ?? ''; statusCell.append(badge); row.append(statusCell);
      }
      tbody.append(row);
    });
    table.append(thead, tbody); root.replaceChildren(table);
  }
  catch (err) { root.setAttribute('aria-busy', 'false'); const message = document.createElement('p'); message.className = 'muted'; message.textContent = `Unable to load schedule: ${err.message}`; root.replaceChildren(message); }
});
