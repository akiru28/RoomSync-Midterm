/**
 * Send a consistent success JSON response.
 * @param {import('express').Response} res - Express response object
 * @param {*} [data] - Data payload
 * @param {string} [message='OK'] - Success message
 * @param {number} [status=200] - HTTP status code
 */
function success(res, data, message = 'OK', status = 200) {
  res.status(status).json({
    ok: true,
    status,
    message,
    data: typeof data === 'undefined' ? null : data,
    meta: null,
  });
}

/**
 * Send a consistent error JSON response.
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} [status=400] - HTTP status code
 * @param {Array|object} [errors] - Detailed validation errors
 */
function error(res, message, status = 400, errors) {
  const envelope = {
    ok: false,
    status,
    message,
    data: null,
    meta: null,
  };
  if (typeof errors !== 'undefined') {
    envelope.meta = { errors };
  }
  res.status(status).json(envelope);
}

/**
 * Send a paginated JSON response.
 * @param {import('express').Response} res - Express response object
 * @param {Array} items - Items for current page
 * @param {number} total - Total count of items
 * @param {number} page - Current page (1-based)
 * @param {number} perPage - Items per page
 */
function paginated(res, items, total, page, perPage) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const per = Math.max(1, parseInt(perPage, 10) || 10);
  const totalPages = Math.ceil(total / per) || 1;
  res.status(200).json({
    ok: true,
    status: 200,
    message: 'OK',
    data: items,
    meta: {
      total,
      page: pageNum,
      perPage: per,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  });
}

module.exports = { success, error, paginated };
