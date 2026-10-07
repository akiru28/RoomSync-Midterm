const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { generateToken, verifyToken } = require('../../src/utils/generateId');
const { fromMySqlUtcDateTime, toMySqlUtcDateTime } = require('../../src/utils/dateUtils');
const { createReservation: validateReservation } = require('../../src/validators/reservationValidator');

test('reservation datetimes round-trip through MySQL DATETIME as UTC', () => {
  const utcDate = '2026-10-03T10:15:00.000Z';
  const storedDate = toMySqlUtcDateTime(utcDate);
  assert.equal(storedDate, '2026-10-03 10:15:00');
  assert.equal(fromMySqlUtcDateTime(storedDate), utcDate);
});

test('reservations require a program/section within the supported length', () => {
  assert.equal(validateReservation({
    roomId: 1,
    purpose: 'Class',
    startDate: '2026-10-05T08:00:00.000Z',
    endDate: '2026-10-05T09:00:00.000Z',
  }), 'Program/section is required.');
  assert.equal(validateReservation({
    roomId: 1,
    purpose: 'Class',
    programSection: 'A'.repeat(151),
    startDate: '2026-10-05T08:00:00.000Z',
    endDate: '2026-10-05T09:00:00.000Z',
  }), 'Program/section must not exceed 150 characters.');
});

test('signed access tokens verify only with the issuing secret and expire', async (t) => {
  const secret = 'unit-test-secret-that-is-at-least-32-chars';
  const token = generateToken(secret, '1s');
  assert.equal(verifyToken(token, secret), true);
  assert.equal(verifyToken(token, 'different-secret-that-is-not-the-same'), false);
  assert.equal(verifyToken(`${token.slice(0, -1)}x`, secret), false);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(verifyToken(token, secret), false);
});

test('production configuration fails without a strong JWT secret', () => {
  const configPath = require.resolve('../../src/config/environment');
  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(configPath)})`], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production requires a JWT_SECRET of at least 32 characters/);
});

test('reservation schedule is exposed through the service with normalized filters', async (t) => {
  const reservationRepo = require('../../src/repositories/reservationRepository');
  const originalFindSchedule = reservationRepo.findSchedule;
  let receivedFilters;
  reservationRepo.findSchedule = async (filters) => {
    receivedFilters = filters;
    return [{ roomName: 'Lab 1', status: 'approved' }];
  };
  t.after(() => { reservationRepo.findSchedule = originalFindSchedule; });

  const service = require('../../src/services/reservationService');
  const entries = await service.schedule({ roomId: '7', start: '2026-08-01', end: '2026-08-31' });
  assert.deepEqual(receivedFilters, { roomId: 7, start: '2026-08-01', end: '2026-08-31' });
  assert.equal(entries[0].status, 'approved');
});

test('laboratory reports enforce Lab Tech submission and owner-only access', async (t) => {
  const roomRepo = require('../../src/repositories/roomRepository');
  const equipmentRepo = require('../../src/repositories/equipmentRepository');
  const reportRepo = require('../../src/repositories/laboratoryReportRepository');
  const originalRoomFind = roomRepo.findById;
  const originalEquipmentFind = equipmentRepo.findById;
  const originalCreate = reportRepo.create;
  const originalReportFind = reportRepo.findById;
  roomRepo.findById = async (id) => Number(id) === 7
    ? { id: 7, type: 'lab', isActive: true }
    : { id: Number(id), type: 'lecture', isActive: true };
  equipmentRepo.findById = async (id) => ({
    id: Number(id),
    roomId: Number(id) === 10 ? 8 : 7,
    status: 'operational',
  });
  reportRepo.create = async (report) => ({ id: 'report-test', status: 'reported', ...report });
  reportRepo.findById = async () => ({
    id: 'report-test', roomId: 7, reportedBy: 'lab-tech-1', status: 'reported',
  });
  t.after(() => {
    roomRepo.findById = originalRoomFind;
    equipmentRepo.findById = originalEquipmentFind;
    reportRepo.create = originalCreate;
    reportRepo.findById = originalReportFind;
  });

  const service = require('../../src/services/laboratoryReportService');
  await assert.rejects(
    service.create({ roomId: 7, issueType: 'Hardware', description: 'No display' }, { id: 'student-1', role: 'student' }),
    { status: 403 }
  );
  await assert.rejects(
    service.create({ roomId: 7, equipmentId: 10, issueType: 'Hardware', description: 'No display' }, { id: 'lab-tech-1', role: 'lab_tech' }),
    { status: 400, message: 'The selected equipment does not belong to this laboratory.' }
  );
  const created = await service.create(
    { roomId: 7, equipmentId: 11, issueType: 'Hardware', description: 'No display', severity: 'high' },
    { id: 'lab-tech-1', role: 'lab_tech' }
  );
  assert.equal(created.status, 'reported');
  await assert.rejects(
    service.get('report-test', { id: 'lab-tech-2', role: 'lab_tech' }),
    { status: 403 }
  );
});
