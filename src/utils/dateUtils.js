/**
 * Convert date to ISO string.
 * @param {Date|string|number} d - Date input
 * @returns {string} ISO 8601 string
 */
function toISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString();
}

/**
 * Convert a date value to a MySQL DATETIME string in UTC.
 * @param {Date|string|number} value
 * @returns {string}
 */
function toMySqlUtcDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('A valid date is required.');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Mark a MySQL DATETIME value as UTC for unambiguous API serialization.
 * @param {string} value
 * @returns {string}
 */
function fromMySqlUtcDateTime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) return value;
  const milliseconds = (match[3] || '').slice(0, 3).padEnd(3, '0');
  return `${match[1]}T${match[2]}.${milliseconds}Z`;
}

/**
 * Check if two dates are on the same calendar day.
 * @param {Date|string|number} a - First date
 * @param {Date|string|number} b - Second date
 * @returns {boolean}
 */
function isSameDay(a, b) {
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Difference in minutes between two dates (end - start).
 * @param {Date|string|number} a - Start date
 * @param {Date|string|number} b - End date
 * @returns {number}
 */
function diffInMinutes(a, b) {
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  return (db.getTime() - da.getTime()) / 60000;
}

/**
 * Round date to nearest multiple of minutes (floor).
 * @param {Date|string|number} d - Date input
 * @param {number} [mins=15] - Minute granularity
 * @returns {Date}
 */
function roundToMinutes(d, mins = 15) {
  const date = d instanceof Date ? new Date(d.getTime()) : new Date(d);
  const ms = mins * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

/**
 * Validate a start/end date range.
 * @param {Date|string|number} start - Start date
 * @param {Date|string|number} end - End date
 * @returns {boolean}
 */
function isValidDateRange(start, end) {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  return s < e;
}

/**
 * Check if date is in the past (compared to now minus 1 min buffer).
 * @param {Date|string|number} d - Date input
 * @returns {boolean}
 */
function isPast(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.getTime() < Date.now() - 60000;
}

/**
 * Format a range as a short string, e.g. "9/8 10:00 - 12:00".
 * @param {Date|string|number} start - Start date
 * @param {Date|string|number} end - End date
 * @returns {string}
 */
function formatRangeShort(start, end) {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  const pad = (n) => String(n).padStart(2, '0');
  const sameDay = isSameDay(s, e);
  const datePart = `${s.getMonth() + 1}/${s.getDate()}`;
  const timeS = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const timeE = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
  if (sameDay) return `${datePart} ${timeS} - ${timeE}`;
  const datePartE = `${e.getMonth() + 1}/${e.getDate()}`;
  return `${datePart} ${timeS} - ${datePartE} ${timeE}`;
}

/**
 * Return start of day (00:00:00) for given date.
 * @param {Date|string|number} d - Date input
 * @returns {Date}
 */
function startOfDay(d) {
  const date = d instanceof Date ? new Date(d.getTime()) : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Return end of day (23:59:59.999) for given date.
 * @param {Date|string|number} d - Date input
 * @returns {Date}
 */
function endOfDay(d) {
  const date = d instanceof Date ? new Date(d.getTime()) : new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

module.exports = {
  toISO,
  toMySqlUtcDateTime,
  fromMySqlUtcDateTime,
  isSameDay,
  diffInMinutes,
  roundToMinutes,
  isValidDateRange,
  isPast,
  formatRangeShort,
  startOfDay,
  endOfDay,
};
