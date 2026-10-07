document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireRole('instructor', 'admin'))) return; const root = document.getElementById('my-reservations');
  root.innerHTML = `<table class="table" aria-hidden="true"><tbody>${window.RoomSyncSkeletons.tableRows(5, 7)}</tbody></table>`;
  root.setAttribute('aria-busy', 'true');
  try { const rows = await Api.get('/reservations'); root.setAttribute('aria-busy', 'false'); if (!rows.length) { const message = document.createElement('p'); message.className = 'muted'; message.textContent = 'No reservation requests found.'; root.replaceChildren(message); return; }
    const table = document.createElement('table'); table.className = 'table';
    const thead = document.createElement('thead'), header = document.createElement('tr');
    ['Room', 'Program / Section', 'Schedule', 'Purpose', 'Attendees', 'Status', ''].forEach(label => { const th = document.createElement('th'); th.textContent = label; header.append(th); });
    thead.append(header); const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const row = document.createElement('tr');
      [r.roomName, r.programSection || '—', `${formatDateLocal(r.startDate)} – ${formatTime(r.endDate)}`, r.purpose, r.attendees].forEach(value => { const cell = document.createElement('td'); cell.textContent = value ?? ''; row.append(cell); });
      const statusCell = document.createElement('td'), badge = document.createElement('span'); badge.className = 'badge'; if (typeof r.status === 'string' && /^[a-z-]+$/.test(r.status)) badge.classList.add(r.status); badge.textContent = r.status ?? ''; statusCell.append(badge); row.append(statusCell);
      const actionCell = document.createElement('td');
      if (['pending', 'approved'].includes(r.status)) { const button = document.createElement('button'); button.className = 'btn ghost small'; button.dataset.cancel = r.id; button.textContent = 'Cancel'; actionCell.append(button); }
      row.append(actionCell); tbody.append(row);
    });
    table.append(thead, tbody); root.replaceChildren(table);
    root.addEventListener('click', async (e) => { const button = e.target.closest('button[data-cancel]'); if (!button || !root.contains(button)) return; const id = button.dataset.cancel; button.disabled = true; try { await Api.patch(`/reservations/${id}/status`, { status: 'cancelled' }); window.showToast('success', 'Reservation cancelled', 'Your reservation was cancelled.'); location.reload(); } catch (err) { button.disabled = false; window.showToast('error', 'Unable to cancel', err.message); } });
  } catch (err) { root.setAttribute('aria-busy', 'false'); const message = document.createElement('p'); message.className = 'muted'; message.textContent = `Unable to load reservations: ${err.message}`; root.replaceChildren(message); }
});
