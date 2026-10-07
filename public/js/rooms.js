/* rooms.js — API-backed room and laboratory catalogues */
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireAuth())) return;
  const list = document.getElementById('rooms-list');
  if (!list) return;

  const labsPage = location.pathname.endsWith('labs.html');
  const makeEmpty = (iconName, title, message, style) => {
    const empty = document.createElement('div');
    empty.className = 'empty';
    if (style) empty.style.cssText = style;
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.appendChild(window.RoomSyncIcons.create(iconName));
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    empty.append(icon, heading, paragraph);
    return empty;
  };
  const normalizeName = (value) => String(value || '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');
  const updateStat = (id, label, value) => {
    const stat = document.getElementById(id);
    if (!stat) return;
    const caption = document.createElement('small');
    caption.textContent = label;
    const number = document.createElement('div');
    number.className = 'stat-num';
    number.textContent = String(value);
    stat.replaceChildren(caption, number);
  };
  const updateStats = (allRooms, visibleRooms) => {
    const labs = allRooms.filter((room) => room.type === 'lab');
    const openRooms = visibleRooms.filter((room) => room.isActive !== false && room.isActive !== 0);
    const totalSeats = visibleRooms.reduce((sum, room) => sum + (Number(room.capacity) || 0), 0);
    if (labsPage) {
      updateStat('stat-labs-count', 'Laboratories', labs.length);
      updateStat('stat-stations', 'Workstations', labs.reduce((sum, room) => sum + (Number(room.capacity) || 0), 0));
      updateStat('stat-open-lab', 'Open now', labs.filter((room) => room.isActive !== false && room.isActive !== 0).length);
      updateStat('stat-seats-avg', 'Seats (avg)', labs.length ? Math.round(labs.reduce((sum, room) => sum + (Number(room.capacity) || 0), 0) / labs.length) : 0);
      return;
    }
    updateStat('stat-rooms', 'Rooms', visibleRooms.length);
    updateStat('stat-labs', 'Laboratories', labs.length);
    updateStat('stat-open', 'Open now', openRooms.length);
    updateStat('stat-seats', 'Seats (avg)', visibleRooms.length ? Math.round(totalSeats / visibleRooms.length) : 0);
  };

  list.innerHTML = window.RoomSyncSkeletons.cards(6);
  list.setAttribute('aria-busy', 'true');

  try {
    const allRooms = await Api.get('/rooms');
    const rooms = allRooms.filter((room) => labsPage ? room.type === 'lab' : room.type !== 'lab');
    updateStats(allRooms, rooms);

    const equipmentResults = await Promise.allSettled(
      rooms.map((room) => room.id == null
        ? Promise.reject(new Error('Room ID unavailable'))
        : Api.get(`/rooms/${encodeURIComponent(room.id)}/equipment`))
    );
    const equipmentByRoom = new Map(rooms.map((room, index) => [
      String(room.id),
      equipmentResults[index].status === 'fulfilled' ? equipmentResults[index].value : null,
    ]));
    const canReserve = Auth.canReserve();

    const render = (items) => {
      list.setAttribute('aria-busy', 'false');
      if (!items.length) {
        list.replaceChildren(makeEmpty(
          'search',
          labsPage ? 'No laboratories found' : 'No rooms found',
          'Try adjusting your filters or search terms to see more results.'
        ));
        return;
      }

      const cards = items.map((room) => {
        const card = document.createElement('article');
        card.className = 'card room-card';
        const head = document.createElement('div');
        head.className = 'card-head';
        const name = document.createElement('h3');
        name.textContent = room.name ?? '';
        const type = document.createElement('span');
        type.className = room.type === 'lab' ? 'room-type lab' : 'room-type';
        type.textContent = (room.type || 'Room').trim();
        head.append(name, type);

        const locationText = document.createElement('p');
        locationText.className = 'muted';
        locationText.textContent = room.location || 'CSPC Campus';

        const stats = document.createElement('div');
        stats.className = 'card-stats';
        const capacity = document.createElement('div');
        capacity.className = 'mini';
        const capacityLabel = document.createElement('small');
        capacityLabel.textContent = 'Capacity';
        const capacityValue = document.createElement('span');
        capacityValue.textContent = String(room.capacity ?? '—');
        capacity.append(capacityLabel, capacityValue);

        const status = document.createElement('div');
        status.className = 'mini';
        const statusLabel = document.createElement('small');
        statusLabel.textContent = 'Status';
        const statusValue = document.createElement('span');
        const active = room.isActive !== false && room.isActive !== 0;
        statusValue.style.color = active ? 'var(--success)' : 'var(--danger)';
        statusValue.textContent = active ? 'Open' : 'Closed';
        status.append(statusLabel, statusValue);
        stats.append(capacity, status);
        card.append(head, locationText, stats);

        const equipment = equipmentByRoom.get(String(room.id));
        const equipmentNames = new Set((equipment || []).map((item) => normalizeName(item.name)));
        const features = (room.features || [])
          .filter(Boolean)
          .filter((feature) => !equipmentNames.has(normalizeName(feature)));
        if (features.length) {
          const chipRow = document.createElement('div');
          chipRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:var(--space-2)';
          features.slice(0, 6).forEach((feature) => {
            const chip = document.createElement('span');
            chip.style.cssText = 'font-size:11px;padding:3px 8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-2);font-weight:600;letter-spacing:.01em';
            chip.textContent = feature;
            chipRow.append(chip);
          });
          card.append(chipRow);
        }

        const equipmentSection = document.createElement('div');
        equipmentSection.style.cssText = 'margin-top:var(--space-2);font-size:var(--fs-sm)';
        const equipmentHeading = document.createElement('small');
        equipmentHeading.textContent = 'Equipment';
        equipmentSection.append(equipmentHeading);
        if (equipment === null) {
          const unavailable = document.createElement('div');
          unavailable.className = 'muted';
          unavailable.textContent = 'Unable to load equipment.';
          equipmentSection.append(unavailable);
        } else if (!equipment?.length) {
          const none = document.createElement('div');
          none.className = 'muted';
          none.textContent = 'No equipment listed.';
          equipmentSection.append(none);
        } else {
          const equipmentList = document.createElement('div');
          equipmentList.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-top:4px';
          equipment.forEach((item) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
            const itemName = document.createElement('span');
            itemName.textContent = item.name ?? '';
            const itemStatus = document.createElement('span');
            itemStatus.className = 'badge small';
            if (typeof item.status === 'string' && /^[a-z-]+$/.test(item.status)) itemStatus.classList.add(item.status);
            itemStatus.textContent = item.status ?? 'Unknown';
            row.append(itemName, itemStatus);
            equipmentList.append(row);
          });
          equipmentSection.append(equipmentList);
        }
        card.append(equipmentSection);

        const actions = document.createElement('div');
        actions.className = 'card-actions';
        if (canReserve) {
          const reserve = document.createElement('a');
          reserve.className = 'btn primary small';
          reserve.href = `reservation.html?roomId=${encodeURIComponent(room.id ?? '')}&room=${encodeURIComponent(room.name ?? '')}`;
          reserve.textContent = 'Reserve';
          actions.append(reserve);
        } else {
          const badge = document.createElement('span');
          badge.className = 'badge info small';
          badge.style.cursor = 'help';
          badge.title = 'Only an Instructor can reserve this room';
          badge.textContent = 'View-only';
          actions.append(badge);
        }
        card.append(actions);
        return card;
      });
      list.replaceChildren(...cards);
    };

    render(rooms);
    const search = document.getElementById('room-search');
    const capacity = document.getElementById('capacity-filter');
    const filter = () => render(rooms.filter((room) => (
      (!search.value || `${room.name} ${room.location || ''} ${(room.features || []).join(' ')}`.toLowerCase().includes(search.value.toLowerCase())) &&
      (!capacity.value || (
        capacity.value === '31+' ? room.capacity >= 31 :
          capacity.value === '1-10' ? room.capacity <= 10 :
            room.capacity >= 11 && room.capacity <= 30
      ))
    )));
    search?.addEventListener('input', filter);
    capacity?.addEventListener('change', filter);
  } catch (error) {
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(makeEmpty('alert', 'Unable to load rooms', error.message));
  }
});
