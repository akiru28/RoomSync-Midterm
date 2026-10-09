/**
 * Validate user registration payload.
 * @param {object} payload - Registration data
 * @returns {{error: string|null, value: object}}
 */
function registerSchema(payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Registration payload is required.', value: null };
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (name.length < 2 || name.length > 150) {
    return { error: 'Name must be between 2 and 150 characters.', value: null };
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'A valid email address no longer than 150 characters is required.', value: null };
  }

  const password = typeof payload.password === 'string' ? payload.password : '';
  if (password.length < 4) {
    return { error: 'Password must be at least 4 characters.', value: null };
  }

  const department = typeof payload.department === 'string' ? payload.department.trim() : '';
  if (department.length > 150) {
    return { error: 'Department must not exceed 150 characters.', value: null };
  }

  return {
    error: null,
    value: { name, email, password, department: department || undefined },
  };
}

/**
 * Validate user login payload.
 * @param {object} payload - Login data
 * @returns {{error: string|null, value: object}}
 */
function loginSchema(payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Login payload is required.', value: null };
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) {
    return { error: 'Email is required.', value: null };
  }

  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!password) {
    return { error: 'Password is required.', value: null };
  }

  return { error: null, value: { email, password } };
}

module.exports = { registerSchema, loginSchema };
