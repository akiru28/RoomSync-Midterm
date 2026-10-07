const reportService = require('../services/laboratoryReportService');
const { success } = require('../utils/response');

async function list(req, res, next) {
  try {
    return success(res, await reportService.list(req.user), 'OK');
  } catch (err) {
    return next(err);
  }
}

async function get(req, res, next) {
  try {
    return success(res, await reportService.get(req.params.id, req.user), 'OK');
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    return success(res, await reportService.create(req.body || {}, req.user), 'Report submitted.', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    return success(res, await reportService.update(req.params.id, req.body || {}, req.user), 'Report updated.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, get, create, update };
