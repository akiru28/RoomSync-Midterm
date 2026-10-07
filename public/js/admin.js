/* admin.js — guarded admin dashboard and room inventory CRUD */
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireRole('admin'))) return;

  const reservationsBody = document.getElementById('pending-tbody');
  const roomsBody = document.getElementById('rooms-tbody');
  const usersBody = document.getElementById('users-tbody');
  const roomForm = document.getElementById('room-form');
  const userForm = document.getElementById('user-form');
  const reservationForm = document.getElementById('reservation-form');
  const overviewSummary = document.getElementById('admin-overview-summary');
  if (!reservationsBody || !roomsBody || !usersBody || !roomForm || !userForm || !reservationForm) return;
  let currentUsers = [];
  let currentRooms = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);

  function renderReservations(reservations) {
    reservationsBody.innerHTML = reservations.length ? reservations.map((reservation) => {
      const status = escapeHtml(reservation.status);
      const actions = reservation.status === 'pending'
        ? `<button class="btn success small" data-status="approved" data-id="${escapeHtml(reservation.id)}">Approve</button>
           <button class="btn danger small" data-status="rejected" data-id="${escapeHtml(reservation.id)}">Reject</button>`
        : `<span class="badge ${status}">${status}</span>`;
      const editable = ['pending', 'approved'].includes(reservation.status)
        ? `<button class="btn ghost small" data-edit-reservation="${escapeHtml(reservation.id)}">Edit</button>`
        : '';
      return `<tr>
        <td><strong>${escapeHtml(reservation.userName)}</strong><br><small>${escapeHtml(reservation.userId)}</small></td>
        <td><strong>${escapeHtml(reservation.roomName)}</strong><br><small>${escapeHtml(reservation.purpose)} · ${escapeHtml(reservation.programSection || 'Program/section not provided')}</small></td>
        <td>${escapeHtml(formatDateLocal(reservation.startDate))} – ${escapeHtml(formatTime(reservation.endDate))}<br>
          <small>${escapeHtml(reservation.attendees)} attendees · requested ${escapeHtml(formatDateShort(reservation.createdAt))}</small></td>
        <td><div class="admin-room-actions">${actions}${editable}</div></td>
      </tr>`;
    }).join('') : '<tr><td colspan="4">No reservation requests.</td></tr>';
  }

  function renderRooms(rooms) {
    roomsBody.innerHTML = rooms.length ? rooms.map((room) => {
      const active = room.isActive !== false && room.isActive !== 0;
      const features = Array.isArray(room.features) ? room.features.join(', ') : '';
      return `<tr>
        <td><strong>${escapeHtml(room.name)}</strong><br><small>${escapeHtml(room.code)}</small></td>
        <td>${escapeHtml(room.type)}<br><small>${escapeHtml(room.capacity)} seats</small></td>
        <td>${escapeHtml(room.location || '—')}</td>
        <td>${escapeHtml(features || '—')}</td>
        <td><span class="badge ${active ? 'approved' : 'cancelled'}">${active ? 'Available' : 'Unavailable'}</span></td>
        <td><div class="admin-room-actions">
          <button class="btn ghost small" data-edit-room="${escapeHtml(room.id)}">Edit</button>
          <button class="btn danger small" data-delete-room="${escapeHtml(room.id)}">Delete</button>
        </div></td>
      </tr>`;
    }).join('') : '<tr><td colspan="6">No rooms in the inventory.</td></tr>';
  }

  function renderUsers(users) {
    const currentUserId = Auth.getCurrentUser()?.id;
    usersBody.innerHTML = users.length ? users.map((user) => {
      const isCurrentUser = String(user.id) === String(currentUserId);
      const role = { admin: 'Admin', instructor: 'Faculty', lab_tech: 'Lab Technician', student: 'Student' }[user.role] || user.role;
      const actions = isCurrentUser
        ? '<span class="muted">Current account</span>'
        : `<div class="admin-room-actions">
            <button class="btn ghost small" data-edit-user="${escapeHtml(user.id)}">Edit</button>
            <button class="btn danger small" data-delete-user="${escapeHtml(user.id)}">Delete</button>
          </div>`;
      return `<tr>
        <td><strong>${escapeHtml(user.name)}</strong></td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(role)}</td>
        <td>${escapeHtml(user.department || '—')}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5">No user accounts found.</td></tr>';
  }

  function renderReservationOptions() {
    const userSelect = reservationForm.elements.namedItem('userId');
    const roomSelect = reservationForm.elements.namedItem('roomId');
    const instructors = currentUsers.filter((user) => user.role === 'instructor');
    const availableRooms = currentRooms.filter((room) => room.isActive !== false && room.isActive !== 0);
    userSelect.innerHTML = '<option value="">Select an instructor</option>' + instructors.map((user) =>
      `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} — ${escapeHtml(user.email)}</option>`
    ).join('');
    roomSelect.innerHTML = '<option value="">Select an available room</option>' + availableRooms.map((room) =>
      `<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)} (${escapeHtml(room.code)}) — ${escapeHtml(room.capacity)} seats</option>`
    ).join('');
  }

  async function load() {
    reservationsBody.innerHTML = window.RoomSyncSkeletons.tableRows(4, 4);
    roomsBody.innerHTML = window.RoomSyncSkeletons.tableRows(5, 6);
    usersBody.innerHTML = window.RoomSyncSkeletons.tableRows(5, 5);
    [reservationsBody, roomsBody, usersBody].forEach((body) => body.setAttribute('aria-busy', 'true'));
    if (overviewSummary) overviewSummary.innerHTML = window.RoomSyncSkeletons.lines(1);
    const [reservationsResult, roomsResult, usersResult] = await Promise.allSettled([
      Api.get('/admin/reservations'),
      Api.get('/admin/rooms'),
      Api.get('/admin/users'),
    ]);

    currentUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
    currentRooms = roomsResult.status === 'fulfilled' ? roomsResult.value : [];
    renderReservationOptions();

    if (reservationsResult.status === 'fulfilled') {
      renderReservations(reservationsResult.value);
    } else {
      reservationsBody.innerHTML = `<tr><td colspan="4">Unable to load reservations: ${escapeHtml(reservationsResult.reason.message)}</td></tr>`;
    }
    if (roomsResult.status === 'fulfilled') {
      renderRooms(currentRooms);
    } else {
      roomsBody.innerHTML = `<tr><td colspan="6">Unable to load room inventory: ${escapeHtml(roomsResult.reason.message)}</td></tr>`;
    }
    if (usersResult.status === 'fulfilled') {
      renderUsers(currentUsers);
    } else {
      usersBody.innerHTML = `<tr><td colspan="5">Unable to load user accounts: ${escapeHtml(usersResult.reason.message)}</td></tr>`;
    }

    if (overviewSummary) {
      const summary = [];
      if (reservationsResult.status === 'fulfilled') {
        const pending = reservationsResult.value.filter((reservation) => reservation.status === 'pending').length;
        summary.push(`${pending} pending reservations`);
      }
      if (roomsResult.status === 'fulfilled') {
        const activeRooms = currentRooms.filter((room) => room.isActive !== false && room.isActive !== 0).length;
        summary.push(`${activeRooms} active rooms and labs`);
      }
      if (usersResult.status === 'fulfilled') summary.push(`${currentUsers.length} user accounts`);
      const failures = [
        reservationsResult.status === 'rejected' && 'reservations',
        roomsResult.status === 'rejected' && 'room inventory',
        usersResult.status === 'rejected' && 'user accounts',
      ].filter(Boolean);
      if (failures.length) summary.push(`Unable to load ${failures.join(', ')}`);
      overviewSummary.textContent = summary.join(' · ') || 'No admin data available.';
      overviewSummary.setAttribute('aria-busy', 'false');
    }

    [reservationsBody, roomsBody, usersBody].forEach((body) => body.setAttribute('aria-busy', 'false'));
  }
  function resetRoomForm() {
    roomForm.reset();
    roomForm.elements.namedItem('id').value = '';
    roomForm.elements.namedItem('isActive').checked = true;
    document.getElementById('room-save-btn').textContent = 'Add room';
    document.getElementById('room-cancel-edit').hidden = true;
  }

  roomForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(roomForm);
    const id = String(formData.get('id') || '');
    const room = {
      name: String(formData.get('name') || '').trim(),
      code: String(formData.get('code') || '').trim(),
      type: String(formData.get('type') || ''),
      capacity: Number(formData.get('capacity')),
      location: String(formData.get('location') || '').trim(),
      features: String(formData.get('features') || '').split(',').map((feature) => feature.trim()).filter(Boolean),
      description: String(formData.get('description') || '').trim(),
      isActive: roomForm.elements.namedItem('isActive').checked,
    };
    const saveButton = document.getElementById('room-save-btn');
    saveButton.disabled = true;
    try {
      if (id) await Api.patch(`/rooms/${encodeURIComponent(id)}`, room);
      else await Api.post('/rooms', room);
      window.showToast('success', 'Room saved', id ? 'Room details updated.' : 'Room added to the inventory.');
      resetRoomForm();
      await load();
    } catch (error) {
      window.showToast('error', 'Unable to save room', error.message);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('room-cancel-edit').addEventListener('click', resetRoomForm);

  function resetUserForm() {
    userForm.reset();
    userForm.elements.namedItem('id').value = '';
    userForm.elements.namedItem('password').required = true;
    userForm.elements.namedItem('password').placeholder = '';
    document.getElementById('user-save-btn').textContent = 'Create user';
    document.getElementById('user-cancel-edit').hidden = true;
  }

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(userForm);
    const id = String(formData.get('id') || '');
    const user = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      role: String(formData.get('role') || ''),
      department: String(formData.get('department') || '').trim(),
    };
    const password = String(formData.get('password') || '');
    if (password) user.password = password;

    const saveButton = document.getElementById('user-save-btn');
    saveButton.disabled = true;
    try {
      if (id) await Api.patch(`/admin/users/${encodeURIComponent(id)}`, user);
      else await Api.post('/admin/users', user);
      window.showToast('success', 'User saved', id ? 'User details updated.' : 'Account created.');
      resetUserForm();
      await load();
    } catch (error) {
      window.showToast('error', 'Unable to save user', error.message);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('user-cancel-edit').addEventListener('click', resetUserForm);

  function resetReservationForm() {
    reservationForm.reset();
    reservationForm.elements.namedItem('id').value = '';
    reservationForm.elements.namedItem('attendees').value = '1';
    document.getElementById('reservation-save-btn').textContent = 'Create reservation';
    document.getElementById('reservation-cancel-edit').hidden = true;
    renderReservationOptions();
  }

  function dateTimeInput(value) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(reservationForm);
    const id = String(formData.get('id') || '');
    const reservation = {
      userId: String(formData.get('userId') || ''),
      roomId: Number(formData.get('roomId')),
      purpose: String(formData.get('purpose') || '').trim(),
      programSection: String(formData.get('programSection') || '').trim(),
      attendees: Number(formData.get('attendees')),
      notes: String(formData.get('notes') || '').trim(),
    };
    const saveButton = document.getElementById('reservation-save-btn');
    saveButton.disabled = true;
    try {
      const startDate = new Date(String(formData.get('startDate')));
      const endDate = new Date(String(formData.get('endDate')));
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Choose valid reservation start and end times.');
      }
      reservation.startDate = startDate.toISOString();
      reservation.endDate = endDate.toISOString();
      if (id) await Api.patch(`/admin/reservations/${encodeURIComponent(id)}`, reservation);
      else await Api.post('/admin/reservations', reservation);
      window.showToast('success', 'Reservation saved', id ? 'Reservation updated. Approved requests return to pending.' : 'Reservation submitted for approval.');
      resetReservationForm();
      await load();
    } catch (error) {
      window.showToast('error', 'Unable to save reservation', error.message);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('reservation-cancel-edit').addEventListener('click', resetReservationForm);

  usersBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-edit-user], [data-delete-user]');
    if (!button) return;
    if (button.hasAttribute('data-edit-user')) {
      const user = currentUsers.find((item) => String(item.id) === button.dataset.editUser);
      if (!user) {
        window.showToast('error', 'Unable to load user', 'The selected user is no longer in the list.');
        return;
      }
      userForm.elements.namedItem('id').value = user.id;
      userForm.elements.namedItem('name').value = user.name || '';
      userForm.elements.namedItem('email').value = user.email || '';
      userForm.elements.namedItem('role').value = user.role || 'student';
      userForm.elements.namedItem('department').value = user.department || '';
      userForm.elements.namedItem('password').value = '';
      userForm.elements.namedItem('password').required = false;
      userForm.elements.namedItem('password').placeholder = 'Leave blank to keep the current password';
      document.getElementById('user-save-btn').textContent = 'Save changes';
      document.getElementById('user-cancel-edit').hidden = false;
      userForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!window.confirm('Delete this user account permanently?')) return;
    button.disabled = true;
    try {
      await Api.delete(`/admin/users/${encodeURIComponent(button.dataset.deleteUser)}`);
      window.showToast('success', 'User deleted', 'The account was removed.');
      await load();
    } catch (error) {
      button.disabled = false;
      window.showToast('error', 'Unable to delete user', error.message);
    }
  });

  roomsBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-edit-room], [data-delete-room]');
    if (!button) return;
    if (button.hasAttribute('data-edit-room')) {
      const id = button.dataset.editRoom;
      button.disabled = true;
      try {
        const room = await Api.get(`/rooms/${encodeURIComponent(id)}`);
        roomForm.elements.namedItem('id').value = room.id;
        roomForm.elements.namedItem('name').value = room.name || '';
        roomForm.elements.namedItem('code').value = room.code || '';
        roomForm.elements.namedItem('type').value = room.type || 'lecture';
        roomForm.elements.namedItem('capacity').value = room.capacity || '';
        roomForm.elements.namedItem('location').value = room.location || '';
        roomForm.elements.namedItem('features').value = Array.isArray(room.features) ? room.features.join(', ') : '';
        roomForm.elements.namedItem('description').value = room.description || '';
        roomForm.elements.namedItem('isActive').checked = room.isActive !== false && room.isActive !== 0;
        document.getElementById('room-save-btn').textContent = 'Save changes';
        document.getElementById('room-cancel-edit').hidden = false;
        roomForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        window.showToast('error', 'Unable to load room', error.message);
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (!window.confirm('Delete this room? Rooms with reservation records cannot be deleted.')) return;
    button.disabled = true;
    try {
      await Api.delete(`/rooms/${encodeURIComponent(button.dataset.deleteRoom)}`);
      window.showToast('success', 'Room deleted', 'Room removed from the inventory.');
      await load();
    } catch (error) {
      button.disabled = false;
      window.showToast('error', 'Unable to delete room', error.message);
    }
  });

  reservationsBody.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-reservation]');
    if (editButton) {
      editButton.disabled = true;
      try {
        const reservation = await Api.get(`/reservations/${encodeURIComponent(editButton.dataset.editReservation)}`);
        reservationForm.elements.namedItem('id').value = reservation.id;
        reservationForm.elements.namedItem('userId').value = reservation.userId;
        const selectedRoomId = String(reservation.roomId);
        const roomExists = Array.from(reservationForm.elements.namedItem('roomId').options)
          .some((option) => option.value === selectedRoomId);
        if (!roomExists) {
          const unavailableRoom = currentRooms.find((room) => String(room.id) === selectedRoomId);
          if (unavailableRoom) {
            reservationForm.elements.namedItem('roomId').add(new Option(
              `${unavailableRoom.name} (${unavailableRoom.code}) — unavailable`,
              selectedRoomId
            ));
          }
        }
        reservationForm.elements.namedItem('roomId').value = selectedRoomId;
        reservationForm.elements.namedItem('purpose').value = reservation.purpose || '';
        reservationForm.elements.namedItem('programSection').value = reservation.programSection || '';
        reservationForm.elements.namedItem('startDate').value = dateTimeInput(reservation.startDate);
        reservationForm.elements.namedItem('endDate').value = dateTimeInput(reservation.endDate);
        reservationForm.elements.namedItem('attendees').value = reservation.attendees || 1;
        reservationForm.elements.namedItem('notes').value = reservation.notes || '';
        document.getElementById('reservation-save-btn').textContent = 'Save changes';
        document.getElementById('reservation-cancel-edit').hidden = false;
        reservationForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        window.showToast('error', 'Unable to load reservation', error.message);
      } finally {
        editButton.disabled = false;
      }
      return;
    }

    const statusButton = event.target.closest('[data-status]');
    if (statusButton) {
      statusButton.disabled = true;
      try {
        await Api.patch(`/reservations/${encodeURIComponent(statusButton.dataset.id)}/status`, {
          status: statusButton.dataset.status,
        });
        window.showToast('success', 'Reservation updated', `Request ${statusButton.dataset.status}.`);
        await load();
      } catch (error) {
        statusButton.disabled = false;
        window.showToast('error', 'Update failed', error.message);
      }
      return;
    }
  });

  await load();
});
