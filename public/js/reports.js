document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireRole('lab_tech', 'admin'))) return;
  const admin = Auth.isAdmin();
  const reportFormSection = document.getElementById('report-form-section');
  const equipmentSection = document.getElementById('equipment-management');
  const reportForm = document.getElementById('report-form');
  const equipmentForm = document.getElementById('equipment-form');
  const reportList = document.getElementById('reports-list');
  const equipmentList = document.getElementById('equipment-list');
  if (!reportList) return;

  if (!admin) reportFormSection.hidden = false;
  if (admin) equipmentSection.hidden = false;

  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined && text !== null) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  };
  const cell = (row, content) => {
    const td = document.createElement('td');
    if (content instanceof Node) td.append(content);
    else td.textContent = content == null ? '—' : String(content);
    row.append(td);
  };
  const statusLabel = (status) => ({
    reported: 'Reported',
    under_review: 'Under Review',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  }[status] || status);

  let labs = [];
  let equipment = [];
  const labSelects = [
    reportForm?.elements.namedItem('roomId'),
    equipmentForm?.elements.namedItem('roomId'),
  ].filter(Boolean);

  function setSelectOptions(select, items, placeholder, label) {
    select.replaceChildren(new Option(placeholder, ''));
    items.forEach((item) => select.add(new Option(label(item), String(item.id))));
  }

  async function loadLabs() {
    const rooms = await Api.get('/rooms');
    labs = rooms.filter((room) => room.type === 'lab');
    labSelects.forEach((select) => setSelectOptions(
      select,
      labs,
      'Select a laboratory…',
      (room) => `${room.name} (${room.code})`
    ));
    if (!admin && reportForm) {
      reportForm.elements.namedItem('equipmentId').disabled = true;
      reportForm.querySelector('button[type="submit"]').disabled = true;
    }
  }

  async function loadEquipment(roomId) {
    const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
    if (equipmentList) {
      equipmentList.innerHTML = `<table class="table" aria-hidden="true"><tbody>${window.RoomSyncSkeletons.tableRows(4, 4)}</tbody></table>`;
      equipmentList.setAttribute('aria-busy', 'true');
    }
    equipment = await Api.get(`/admin/equipment${query}`);
    renderEquipment();
    const select = reportForm?.elements.namedItem('equipmentId');
    if (select) {
      const filtered = equipment.filter((item) => String(item.roomId) === String(roomId) && item.status !== 'retired');
      setSelectOptions(select, filtered, 'General laboratory issue', (item) => `${item.name} (${item.code})`);
    }
  }

  function renderReports(reports) {
    reportList.setAttribute('aria-busy', 'false');
    reportList.replaceChildren();
    if (!reports.length) {
      reportList.append(make('p', 'No laboratory reports found.', 'muted'));
      return;
    }
    const table = make('table', null, 'table');
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Laboratory / Equipment', 'Issue', 'Severity', 'Reported', 'Status', 'Resolution'].forEach((title) => {
      headerRow.append(make('th', title));
    });
    if (admin) headerRow.append(make('th', 'Actions'));
    head.append(headerRow);
    const body = document.createElement('tbody');
    reports.forEach((report, index) => {
      const row = document.createElement('tr');
      const location = document.createElement('div');
      location.append(make('strong', report.roomName));
      location.append(make('div', report.equipmentName || 'General laboratory issue', 'muted'));
      cell(row, location);
      const issue = document.createElement('div');
      issue.append(make('strong', report.issueType));
      issue.append(make('div', report.description, 'muted'));
      if (admin) issue.append(make('div', `Reported by ${report.reporterName}`, 'muted'));
      cell(row, issue);
      cell(row, make('span', report.severity, `badge ${report.severity}`));
      cell(row, window.formatDateLocal(report.createdAt));

      if (!admin) {
        cell(row, make('span', statusLabel(report.status), `badge ${report.status}`));
        cell(row, report.resolutionNotes || '—');
      } else {
        const formId = `report-update-${index}`;
        const statusId = `report-status-${index}`;
        const resolutionId = `report-resolution-${index}`;
        const resolutionHelpId = `report-resolution-help-${index}`;
        const resolutionCountId = `report-resolution-count-${index}`;

        const updateForm = document.createElement('form');
        updateForm.id = formId;
        updateForm.className = 'report-review-form';

        const statusCell = document.createElement('td');
        const statusField = make('label', 'Update status', 'report-review-field');
        statusField.htmlFor = statusId;
        const statusSelect = document.createElement('select');
        statusSelect.id = statusId;
        statusSelect.name = 'status';
        statusSelect.required = true;
        statusSelect.setAttribute('form', formId);
        statusSelect.setAttribute('aria-label', `Status for ${report.roomName} report`);
        ['reported', 'under_review', 'in_progress', 'resolved'].forEach((status) => {
          statusSelect.add(new Option(statusLabel(status), status));
        });
        statusSelect.value = report.status;
        statusField.append(statusSelect);
        const statusHelp = make('small', 'Choose the current stage of this issue.', 'muted');
        statusField.append(statusHelp);
        statusCell.append(statusField);
        row.append(statusCell);

        const resolutionCell = document.createElement('td');
        const resolutionField = make('label', 'Resolution notes', 'report-review-field');
        const resolution = document.createElement('textarea');
        resolution.id = resolutionId;
        resolution.name = 'resolutionNotes';
        resolution.rows = 2;
        resolution.maxLength = 10000;
        resolution.value = report.resolutionNotes || '';
        resolution.required = statusSelect.value === 'resolved';
        resolution.setAttribute('aria-describedby', `${resolutionHelpId} ${resolutionCountId}`);
        resolutionField.htmlFor = resolutionId;
        resolutionField.append(resolution);
        updateForm.append(resolutionField);
        const resolutionHelp = make(
          'small',
          resolution.required
            ? 'Required to mark this issue resolved.'
            : 'Add steps taken or the outcome; required when resolving.',
          'muted'
        );
        resolutionHelp.id = resolutionHelpId;
        const resolutionCount = make('small', `${resolution.value.length} / ${resolution.maxLength} characters`, 'muted report-character-count');
        resolutionCount.id = resolutionCountId;
        resolutionCount.setAttribute('aria-live', 'polite');
        updateForm.append(resolutionHelp, resolutionCount);
        resolution.addEventListener('input', () => {
          resolutionCount.textContent = `${resolution.value.length} / ${resolution.maxLength} characters`;
        });
        statusSelect.addEventListener('change', () => {
          resolution.required = statusSelect.value === 'resolved';
          resolutionHelp.textContent = resolution.required
            ? 'Required to mark this issue resolved.'
            : 'Add steps taken or the outcome; required when resolving.';
        });
        resolutionCell.append(updateForm);
        row.append(resolutionCell);

        const actionCell = document.createElement('td');
        const save = make('button', 'Save update', 'btn primary small');
        save.type = 'submit';
        save.setAttribute('form', formId);
        updateForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          save.disabled = true;
          save.textContent = 'Saving…';
          try {
            await Api.patch(`/reports/${encodeURIComponent(report.id)}`, {
              status: statusSelect.value,
              resolutionNotes: resolution.value,
            });
            window.showToast('success', 'Report updated', 'The issue report status was saved.');
            await loadReports();
          } catch (err) {
            window.showToast('error', 'Unable to update report', err.message);
            save.disabled = false;
            save.textContent = 'Save update';
          }
        });
        actionCell.append(save);
        row.append(actionCell);
      }
      body.append(row);
    });
    table.append(head, body);
    reportList.append(table);
  }

  async function loadReports() {
    reportList.innerHTML = `<table class="table" aria-hidden="true"><tbody>${window.RoomSyncSkeletons.tableRows(5, admin ? 7 : 6)}</tbody></table>`;
    reportList.setAttribute('aria-busy', 'true');
    try {
      renderReports(await Api.get('/reports'));
    } catch (err) {
      reportList.setAttribute('aria-busy', 'false');
      reportList.replaceChildren(make('p', `Unable to load reports: ${err.message}`, 'muted'));
    }
  }

  function resetEquipmentForm() {
    equipmentForm.reset();
    equipmentForm.elements.namedItem('id').value = '';
    document.getElementById('equipment-save').textContent = 'Add equipment';
    document.getElementById('equipment-cancel').hidden = true;
  }

  function renderEquipment() {
    if (!admin || !equipmentList) return;
    equipmentList.setAttribute('aria-busy', 'false');
    equipmentList.replaceChildren();
    if (!equipment.length) {
      equipmentList.append(make('p', 'No equipment records found.', 'muted'));
      return;
    }
    const roomsById = new Map(labs.map((room) => [String(room.id), room]));
    const table = make('table', null, 'table');
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Equipment', 'Laboratory', 'Status', 'Actions'].forEach((title) => headerRow.append(make('th', title)));
    head.append(headerRow);
    const body = document.createElement('tbody');
    equipment.forEach((item) => {
      const row = document.createElement('tr');
      const details = document.createElement('div');
      details.append(make('strong', item.name));
      details.append(make('div', item.code, 'muted'));
      cell(row, details);
      cell(row, roomsById.get(String(item.roomId))?.name || 'Unknown laboratory');
      cell(row, make('span', item.status, `badge ${item.status}`));
      const actions = document.createElement('td');
      const edit = make('button', 'Edit', 'btn ghost small');
      edit.type = 'button';
      edit.addEventListener('click', () => {
        equipmentForm.elements.namedItem('id').value = item.id;
        equipmentForm.elements.namedItem('roomId').value = item.roomId;
        equipmentForm.elements.namedItem('code').value = item.code;
        equipmentForm.elements.namedItem('name').value = item.name;
        equipmentForm.elements.namedItem('status').value = item.status;
        equipmentForm.elements.namedItem('description').value = item.description || '';
        document.getElementById('equipment-save').textContent = 'Save equipment';
        document.getElementById('equipment-cancel').hidden = false;
        equipmentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      actions.append(edit);
      if (item.status !== 'retired') {
        const retire = make('button', 'Retire', 'btn danger small');
        retire.type = 'button';
        retire.addEventListener('click', async () => {
          retire.disabled = true;
          try {
            await Api.delete(`/admin/equipment/${encodeURIComponent(item.id)}`);
            await loadEquipment(equipmentForm.elements.namedItem('roomId').value);
          } catch (err) {
            window.showToast('error', 'Unable to retire equipment', err.message);
            retire.disabled = false;
          }
        });
        actions.append(retire);
      }
      row.append(actions);
      body.append(row);
    });
    table.append(head, body);
    equipmentList.append(table);
  }

  try {
    await loadLabs();
    if (admin) await loadEquipment();
    else {
      const options = reportForm.elements.namedItem('roomId');
      const equipmentSelect = reportForm.elements.namedItem('equipmentId');
      const equipmentHelp = document.getElementById('report-equipment-help');
      const submit = reportForm.querySelector('button[type="submit"]');
      let equipmentRequest = 0;
      options.addEventListener('change', async () => {
        const requestId = ++equipmentRequest;
        const roomId = options.value;
        submit.disabled = !roomId;
        equipmentSelect.disabled = true;
        if (!roomId) {
          setSelectOptions(equipmentSelect, [], 'Select a laboratory first', () => '');
          if (equipmentHelp) equipmentHelp.textContent = 'Choose a laboratory to see its equipment, or report a general issue.';
          return;
        }
        setSelectOptions(equipmentSelect, [], 'Loading equipment…', () => '');
        if (equipmentHelp) equipmentHelp.textContent = 'Loading equipment for this laboratory…';
        try {
          const items = await Api.get(`/rooms/${encodeURIComponent(roomId)}/equipment`);
          if (requestId !== equipmentRequest) return;
          setSelectOptions(
            equipmentSelect,
            items.filter((item) => item.status !== 'retired'),
            'General laboratory issue',
            (item) => `${item.name} (${item.code})`
          );
          equipmentSelect.disabled = false;
          if (equipmentHelp) equipmentHelp.textContent = 'Select a specific item or leave “General laboratory issue” selected.';
        } catch (err) {
          if (requestId !== equipmentRequest) return;
          setSelectOptions(equipmentSelect, [], 'General laboratory issue', () => '');
          equipmentSelect.disabled = false;
          if (equipmentHelp) equipmentHelp.textContent = `Equipment could not be loaded; you can still report a general issue. ${err.message}`;
          window.showToast('error', 'Unable to load equipment', err.message);
        }
      });
    }
  } catch (err) {
    equipmentList?.setAttribute('aria-busy', 'false');
    window.showToast('error', 'Laboratories unavailable', err.message);
  }

  reportForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(reportForm).entries());
    const submit = reportForm.querySelector('button[type="submit"]');
    const status = document.getElementById('report-form-status');
    const submitLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Submitting report…';
    if (status) status.textContent = 'Sending your report…';
    try {
      await Api.post('/reports', {
        roomId: Number(data.roomId),
        equipmentId: data.equipmentId || null,
        issueType: data.issueType,
        severity: data.severity,
        description: data.description,
      });
      reportForm.reset();
      const equipmentSelect = reportForm.elements.namedItem('equipmentId');
      setSelectOptions(equipmentSelect, [], 'Select a laboratory first', () => '');
      equipmentSelect.disabled = true;
      const equipmentHelp = document.getElementById('report-equipment-help');
      if (equipmentHelp) equipmentHelp.textContent = 'Choose a laboratory to see its equipment, or report a general issue.';
      document.getElementById('report-description-count').textContent = '0 / 10000 characters';
      status.textContent = 'Report submitted successfully.';
      window.showToast('success', 'Report submitted', 'Admin can now review this issue.');
      await loadReports();
    } catch (err) {
      if (status) status.textContent = `Report not submitted: ${err.message}`;
      window.showToast('error', 'Report not submitted', err.message);
    } finally {
      submit.textContent = submitLabel;
      submit.disabled = !reportForm.elements.namedItem('roomId').value;
    }
  });

  if (reportForm) {
    const description = reportForm.elements.namedItem('description');
    const characterCount = document.getElementById('report-description-count');
    description.addEventListener('input', () => {
      characterCount.textContent = `${description.value.length} / ${description.maxLength} characters`;
    });
  }

  if (admin) {
    equipmentForm.elements.namedItem('roomId').addEventListener('change', (event) => loadEquipment(event.target.value));
    document.getElementById('equipment-cancel').addEventListener('click', resetEquipmentForm);
    equipmentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(equipmentForm).entries());
      const id = data.id;
      const payload = {
        roomId: Number(data.roomId),
        code: data.code,
        name: data.name,
        status: data.status,
        description: data.description,
      };
      const save = document.getElementById('equipment-save');
      save.disabled = true;
      try {
        if (id) await Api.patch(`/admin/equipment/${encodeURIComponent(id)}`, payload);
        else await Api.post('/admin/equipment', payload);
        resetEquipmentForm();
        await loadEquipment();
        window.showToast('success', 'Equipment saved', 'The equipment inventory was updated.');
      } catch (err) {
        window.showToast('error', 'Equipment not saved', err.message);
      } finally {
        save.disabled = false;
      }
    });
  }
  await loadReports();
});
