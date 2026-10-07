const env = require('../config/environment');
const userRepo = require('../repositories/userRepository');
const { ROLES } = require('../constants/roles');

const SENT_MESSAGES = [];

/**
 * Internal helper: queue notification.
 * @param {object} msg
 */
function enqueue(msg) {
  SENT_MESSAGES.push({ ...msg, sentAt: new Date().toISOString() });
  if (env.nodeEnv === 'development' || env.nodeEnv === 'dev') {
    console.log('[notification]', JSON.stringify(msg));
  }
}

/**
 * Generic notify helper for single recipient.
 * @param {string} to
 * @param {string} subject
 * @param {string} body
 */
function notify(to, subject, body) {
  enqueue({ type: 'email', to, subject, body });
}

/**
 * Notify all admin users of something.
 * @param {string} subject
 * @param {string} body
 */
async function notifyAdmins(subject, body) {
  const users = await userRepo.findAll();
  const admins = users.filter((u) => u && u.role === ROLES.ADMIN && u.email);
  admins.forEach((a) => enqueue({ type: 'email', to: a.email, subject, body }));
}

/**
 * Notify when a reservation is created.
 * @param {object} reservation
 */
async function onReservationCreated(reservation) {
  const subject = `[RoomSync] New reservation request: ${reservation.roomName}`;
  const body = [
    `User: ${reservation.userName}`,
    `Room: ${reservation.roomName}`,
    `Purpose: ${reservation.purpose}`,
    `Start: ${reservation.startDate}`,
    `End: ${reservation.endDate}`,
    `Status: ${reservation.status}`,
  ].join('\n');
  if (reservation.userId) {
    const u = await userRepo.findById(reservation.userId);
    if (u && u.email) notify(u.email, subject, body);
  }
  await notifyAdmins(subject, body);
}

/**
 * Notify when reservation status changes.
 * @param {object} reservation
 * @param {string} prevStatus
 * @param {object|null} [actor]
 */
async function onStatusChanged(reservation, prevStatus, actor) {
  const actorName = actor ? actor.name || actor.email : 'System';
  const subject = `[RoomSync] Reservation ${reservation.status.toUpperCase()}: ${reservation.roomName}`;
  const body = [
    `Your reservation status changed from "${prevStatus}" to "${reservation.status}".`,
    `Room: ${reservation.roomName}`,
    `Start: ${reservation.startDate}`,
    `End: ${reservation.endDate}`,
    `Action by: ${actorName}`,
  ].join('\n');
  if (reservation.userId) {
    const u = await userRepo.findById(reservation.userId);
    if (u && u.email) notify(u.email, subject, body);
  }
}

/**
 * Notify when a user registers.
 * @param {object} user
 */
async function onUserRegistered(user) {
  const subject = '[RoomSync] Welcome!';
  const body = `Hi ${user.name},\n\nYour account has been created successfully.\n`;
  if (user.email) notify(user.email, subject, body);
  await notifyAdmins('[RoomSync] New user registered', `${user.name} (${user.email}) registered.`);
}

module.exports = {
  notify,
  notifyAdmins,
  onReservationCreated,
  onStatusChanged,
  onUserRegistered,
  _sent: SENT_MESSAGES,
};
