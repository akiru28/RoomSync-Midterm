const reservationRepo = require('../repositories/reservationRepository');
const roomRepo = require('../repositories/roomRepository');
const userRepo = require('../repositories/userRepository');
const { success } = require('../utils/response');
const { RESERVATION_STATUSES } = require('../constants/roles');
const { startOfDay, endOfDay, diffInMinutes } = require('../utils/dateUtils');

/**
 * GET /api/admin/reports/utilization
 * Percent occupancy by room for the last N days (default 7).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function utilization(req, res, next) {
  try {
    const days = Math.max(1, Number(req.query.days) || 7);
    const now = new Date();
    const from = startOfDay(new Date(now.getTime() - (days - 1) * 86400 * 1000));
    const to = endOfDay(now);
    const rooms = await roomRepo.findAll({ activeOnly: true });
    const reservations = await reservationRepo.findByDateRange(from, to);
    const MINUTES_PER_DAY_OPEN = 12 * 60;
    const totalMinutes = days * MINUTES_PER_DAY_OPEN;
    const perRoom = rooms.map((r) => {
      const mine = reservations.filter((rv) => String(rv.roomId) === String(r.id));
      const reserved = mine.reduce((sum, rv) => sum + Math.max(0, diffInMinutes(rv.startDate, rv.endDate)), 0);
      const pct = totalMinutes > 0 ? Math.min(100, (reserved / totalMinutes) * 100) : 0;
      return {
        roomId: r.id,
        roomName: r.name,
        reservedMinutes: Math.round(reserved),
        totalAvailableMinutes: totalMinutes,
        utilizationPercent: Number(pct.toFixed(2)),
        reservationCount: mine.length,
      };
    });
    return success(res, { periodDays: days, from: from.toISOString(), to: to.toISOString(), rooms: perRoom }, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/reports/by-status
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function reservationsByStatus(req, res, next) {
  try {
    const all = await reservationRepo.findAll();
    const counts = {};
    Object.values(RESERVATION_STATUSES).forEach((s) => (counts[s] = 0));
    all.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return success(res, { total: all.length, counts }, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/reports/user-activity
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function userActivity(req, res, next) {
  try {
    const reservations = await reservationRepo.findAll();
    const users = await userRepo.findAll();
    const byUser = {};
    reservations.forEach((r) => {
      const uid = String(r.userId);
      if (!byUser[uid]) byUser[uid] = { userId: uid, userName: r.userName, reservationCount: 0, totalMinutes: 0 };
      byUser[uid].reservationCount += 1;
      byUser[uid].totalMinutes += Math.max(0, diffInMinutes(r.startDate, r.endDate));
    });
    const list = users
      .map((u) => {
        const entry = byUser[String(u.id)] || { userId: u.id, userName: u.name, reservationCount: 0, totalMinutes: 0 };
        return { ...entry, userId: u.id, userName: u.name, email: u.email, role: u.role };
      })
      .sort((a, b) => b.reservationCount - a.reservationCount);
    return success(res, list, 'OK');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/reports/export.csv
 * Stub. Returns a minimal CSV header.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function exportCsv(req, res, next) {
  try {
    const rows = [['id', 'roomName', 'userName', 'purpose', 'startDate', 'endDate', 'status']];
    const all = await reservationRepo.findAll();
    all.forEach((r) => {
      rows.push([r.id, r.roomName, r.userName, r.purpose, r.startDate, r.endDate, r.status]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations.csv"');
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
}

module.exports = { utilization, reservationsByStatus, userActivity, exportCsv };
