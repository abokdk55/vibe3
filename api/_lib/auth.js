const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function sign(value) {
  const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET);
  hmac.update(value);
  return hmac.digest('hex');
}

function createSessionCookie() {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expires}`;
  const sig = sign(payload);
  const token = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [prefix, expires, sig] = parts;
  const payload = `${prefix}.${expires}`;
  const expected = sign(payload);
  if (expected.length !== sig.length) return false;
  const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  if (!valid) return false;
  if (Date.now() > Number(expires)) return false;
  return true;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(attempt, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  hashPassword,
  verifyPassword,
};
