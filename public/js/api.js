/* api.js — shared client for the existing RoomSync API */
(function () {
  const API_BASE = '/api';
  class ApiError extends Error { constructor(message, status, data) { super(message); this.name = 'ApiError'; this.status = status || 0; this.data = data || null; } }
  async function request(path, options) {
    const opts = options || {}, headers = { Accept: 'application/json', ...(opts.headers || {}) };
    const token = localStorage.getItem('rr_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await fetch(`${API_BASE}${path}`, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }); }
    catch (_) { throw new ApiError('Unable to reach RoomSync. Check your connection and try again.'); }
    const json = (response.headers.get('content-type') || '').includes('application/json');
    const payload = json ? await response.json().catch(() => null) : null;
    if (!response.ok || !payload || payload.ok === false) {
      const message = payload?.message || `Request failed (${response.status}).`;
      if (response.status === 401 && window.Auth) window.Auth.clearSession(true);
      throw new ApiError(message, response.status, payload);
    }
    return payload.data;
  }
  window.Api = { ApiError, get: (p) => request(p), post: (p, b) => request(p, { method: 'POST', body: b }), patch: (p, b) => request(p, { method: 'PATCH', body: b }), delete: (p) => request(p, { method: 'DELETE' }) };
})();
