document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireAuth())) return;

  const role = Auth.getCurrentRole();
  const user = Auth.getCurrentUser();
  const upcoming = document.getElementById('upcoming-list');
  const activities = document.getElementById('activities-tbody');
  const summary = document.getElementById('summary-list');
  const statToday = document.getElementById('stat-today');
  const statWeek = document.getElementById('stat-week');
  const statPending = document.getElementById('stat-pending');
  const statRooms = document.getElementById('stat-rooms');
  const title = document.getElementById('activities-title');
  const headers = document.getElementById('activities-headers');
  const pendingLabel = document.getElementById('stat-pending-label');

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const dateValue = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const isActiveRoom = (room) => room.isActive !== false && room.isActive !== 0;
  const statusClass = (status) => /^[a-z_]+$/.test(String(status || '')) ? status : 'info';
  const setStat = (element, value) => {
    if (element) element.textContent = value == null ? '—' : String(value);
  };
  const localDayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nextDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const startOfWeek = (date) => {
    const start = localDayStart(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  };
  const cell = (row, value) => {
    const td = document.createElement('td');
    td.textContent = value == null || value === '' ? '—' : String(value);
    row.append(td);
    return td;
  };
  const showListMessage = (element, message) => {
    if (element) element.innerHTML = `<li class="muted">${escapeHtml(message)}</li>`;
  };
  const setTableMessage = (element, message, colspan = 4) => {
    if (element) element.innerHTML = `<tr><td colspan="${colspan}" class="muted">${escapeHtml(message)}</td></tr>`;
  };
  let activityColumnCount = 4;
  const setActivityHeaders = (labels) => {
    activityColumnCount = labels.length;
    headers.replaceChildren(...labels.map((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      return th;
    }));
  };

  if (role === 'student') {
    pendingLabel.textContent = 'Laboratories';
    title.textContent = 'Upcoming Room Schedule';
    setActivityHeaders(['Room', 'Schedule']);
  } else if (role === 'lab_tech') {
    pendingLabel.textContent = 'Open Reports';
    title.textContent = 'My Recent Lab Reports';
    setActivityHeaders(['Laboratory', 'Issue', 'Reported', 'Status']);
  } else {
    pendingLabel.textContent = role === 'admin' ? 'Pending' : 'My Pending';
    title.textContent = role === 'admin' ? 'Recent Reservation Activity' : 'My Recent Reservations';
    setActivityHeaders(['User', 'Action', 'When', 'Status']);
  }

  async function load() {
    [statToday, statWeek, statPending, statRooms].forEach((stat) => {
      if (stat) stat.innerHTML = window.RoomSyncSkeletons.stat();
    });
    upcoming.innerHTML = window.RoomSyncSkeletons.listItems(4);
    summary.innerHTML = window.RoomSyncSkeletons.listItems(3);
    activities.innerHTML = window.RoomSyncSkeletons.tableRows(5, activityColumnCount);
    [upcoming, summary, activities].forEach((element) => element.setAttribute('aria-busy', 'true'));

    const tasks = [
      Api.get('/rooms'),
      Api.get('/reservations/schedule'),
    ];
    const hasReservationAccess = role === 'admin' || role === 'instructor';
    const hasReportAccess = role === 'admin' || role === 'lab_tech';
    if (hasReservationAccess) tasks.push(Api.get('/reservations'));
    if (role === 'lab_tech') tasks.push(Api.get('/reports'));

    const results = await Promise.allSettled(tasks);
    const [roomsResult, scheduleResult] = results;
    const reservationsResult = hasReservationAccess ? results[2] : null;
    const reportsResult = role === 'lab_tech' ? results[2] : null;
    const now = new Date();
    const todayStart = localDayStart(now);
    const tomorrowStart = nextDay(now);
    const weekStart = startOfWeek(now);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    if (scheduleResult.status === 'fulfilled') {
      const schedule = scheduleResult.value;
      setStat(statToday, schedule.filter((item) => {
        const start = dateValue(item.startDate);
        return start && start >= todayStart && start < tomorrowStart;
      }).length);
      setStat(statWeek, schedule.filter((item) => {
        const start = dateValue(item.startDate);
        return start && start >= weekStart && start < nextWeekStart;
      }).length);

      const upcomingBookings = schedule
        .filter((item) => {
          const end = dateValue(item.endDate);
          return end && end >= now;
        })
        .sort((a, b) => dateValue(a.startDate) - dateValue(b.startDate))
        .slice(0, 5);
      upcoming.innerHTML = upcomingBookings.length
        ? upcomingBookings.map((item) =>
          role === 'student'
            ? `<li><strong>${escapeHtml(item.roomName)}</strong> — ${escapeHtml(formatDateLocal(item.startDate))}</li>`
            : `<li><strong>${escapeHtml(item.roomName)}</strong> — ${escapeHtml(formatDateLocal(item.startDate))} <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></li>`
        ).join('')
        : '<li class="muted">No upcoming approved reservations.</li>';

      if (role === 'student') {
        activities.innerHTML = upcomingBookings.length
          ? upcomingBookings.slice(0, 6).map((item) =>
            `<tr><td>${escapeHtml(item.roomName)}</td><td>${escapeHtml(formatDateLocal(item.startDate))} – ${escapeHtml(formatTime(item.endDate))}</td></tr>`
          ).join('')
          : `<tr><td colspan="${activityColumnCount}" class="muted">No upcoming approved reservations.</td></tr>`;
      }
    } else {
      setStat(statToday, null);
      setStat(statWeek, null);
      showListMessage(upcoming, `Unable to load room schedule: ${scheduleResult.reason.message}`);
      if (role === 'student') setTableMessage(activities, `Unable to load room schedule: ${scheduleResult.reason.message}`, activityColumnCount);
    }

    if (roomsResult.status === 'fulfilled') {
      const rooms = roomsResult.value.filter(isActiveRoom);
      setStat(statRooms, rooms.length);
      if (role === 'student') {
        setStat(statPending, rooms.filter((room) => room.type === 'lab').length);
      }
      const labs = rooms.filter((room) => room.type === 'lab').length;
      const lectureRooms = rooms.filter((room) => room.type === 'lecture').length;
      summary.innerHTML = `<li>Active rooms <strong>${rooms.length}</strong></li><li>Laboratories <strong>${labs}</strong></li><li>Lecture rooms <strong>${lectureRooms}</strong></li>`;
    } else {
      summary.innerHTML = `<li class="muted">Unable to load room inventory: ${escapeHtml(roomsResult.reason.message)}</li>`;
      if (role === 'student') setStat(statPending, null);
    }

    if (reservationsResult) {
      if (reservationsResult.status === 'fulfilled') {
        const reservations = reservationsResult.value;
        setStat(statPending, reservations.filter((item) => item.status === 'pending').length);
        const recent = [...reservations]
          .sort((a, b) => (dateValue(b.createdAt)?.getTime() || 0) - (dateValue(a.createdAt)?.getTime() || 0))
          .slice(0, 6);
        activities.innerHTML = recent.length
          ? recent.map((item) =>
            `<tr><td>${escapeHtml(item.userName)}</td><td>${escapeHtml(item.purpose)}</td><td>${escapeHtml(formatDateLocal(item.createdAt))}</td><td><span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td></tr>`
          ).join('')
          : '<tr><td colspan="4" class="muted">No reservation activity found.</td></tr>';

        const upcomingReservations = reservations
          .filter((item) => {
            const end = dateValue(item.endDate);
            return end && end >= now && ['pending', 'approved'].includes(item.status);
          })
          .sort((a, b) => dateValue(a.startDate) - dateValue(b.startDate))
          .slice(0, 5);
        upcoming.innerHTML = upcomingReservations.length
          ? upcomingReservations.map((item) =>
            `<li><strong>${escapeHtml(item.roomName)}</strong> — ${escapeHtml(formatDateLocal(item.startDate))} <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></li>`
          ).join('')
          : '<li class="muted">No upcoming reservation requests.</li>';
      } else {
        setStat(statPending, null);
        setTableMessage(activities, `Unable to load reservations: ${reservationsResult.reason.message}`);
        showListMessage(upcoming, `Unable to load reservations: ${reservationsResult.reason.message}`);
      }
    }

    if (reportsResult) {
      if (reportsResult.status === 'fulfilled') {
        const reports = reportsResult.value;
        const openReports = reports.filter((report) => report.status !== 'resolved');
        setStat(statPending, openReports.length);
        const recent = reports.slice(0, 6);
        activities.innerHTML = recent.length
          ? recent.map((report) =>
            `<tr><td>${escapeHtml(report.roomName)}</td><td>${escapeHtml(report.issueType)}</td><td>${escapeHtml(formatDateLocal(report.createdAt))}</td><td><span class="badge ${statusClass(report.status)}">${escapeHtml(report.status)}</span></td></tr>`
          ).join('')
          : '<tr><td colspan="4" class="muted">No lab reports found.</td></tr>';
      } else {
        setStat(statPending, null);
        setTableMessage(activities, `Unable to load lab reports: ${reportsResult.reason.message}`);
      }
    }

    [upcoming, summary, activities].forEach((element) => element.setAttribute('aria-busy', 'false'));
  }
  await load();
});
