const ROLES = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  LAB_TECH: 'lab_tech',
  ADMIN: 'admin',
};

const FACULTY_ROLES = [ROLES.INSTRUCTOR];

const CAN_RESERVE_ROLES = [ROLES.INSTRUCTOR];

const CAN_APPROVE_ROLES = [ROLES.ADMIN];

const CAN_MANAGE_ROLES = [ROLES.ADMIN];

// Lab Tech can access room information and reporting features only.
const CAN_REPORT_ROLES = [ROLES.LAB_TECH, ROLES.ADMIN];

// No role auto-approves reservations. Only Instructor can submit, and Admin approves.
const AUTO_APPROVE_ROLES = [];

const RESERVATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

const ROOM_TYPES = {
  LECTURE: 'lecture',
  LAB: 'lab',
  SEMINAR: 'seminar',
  HALL: 'hall',
};

const RESERVATION_MIN_MINUTES = 15;
const RESERVATION_MAX_HOURS = 8;

const SESSION_COOKIE = 'rr_session';

module.exports = {
  ROLES,
  FACULTY_ROLES,
  CAN_RESERVE_ROLES,
  CAN_APPROVE_ROLES,
  CAN_MANAGE_ROLES,
  CAN_REPORT_ROLES,
  AUTO_APPROVE_ROLES,
  RESERVATION_STATUSES,
  ROOM_TYPES,
  RESERVATION_MIN_MINUTES,
  RESERVATION_MAX_HOURS,
  SESSION_COOKIE,
};
