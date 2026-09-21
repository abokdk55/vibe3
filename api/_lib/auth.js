const crypto = require('crypto');
const { getAuthConfig } = require('./data');
const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (typeof value !== 'string' || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return value;
}
function sign(value) { return crypto.createHmac('sha256', secret()).update(value).digest('hex'); }
function version(config) {
  return sign(config ? config.hash + '.' + config.salt : 'bootstrap.' + (process.env.ADMIN_PASSWORD || ''));
}
function createSessionCookie(config) {
  const payload = 'admin.' + (Date.now() + MAX_AGE_SECONDS * 1000) + '.' + version(config);
  return COOKIE_NAME + '=' + payload + '.' + sign(payload) + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + MAX_AGE_SECONDS;
}
function clearSessionCookie() {
  return COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
async function isAuthenticated(req) {
  const header = req.headers?.cookie;
  if (typeof header !== 'string' || header.length > 8192) return false;
  const matches = header.split(';').map((part) => part.trim()).filter((part) => part.startsWith(COOKIE_NAME + '='));
  if (matches.length !== 1) return false;
  let token;
  try { token = decodeURIComponent(matches[0].slice(COOKIE_NAME.length + 1)); } catch { return false; }
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [prefix, expires, sessionVersion, signature] = parts;
  if (prefix !== 'admin' || !/^\d{13}$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature) || !/^[a-f0-9]{64}$/.test(sessionVersion)) return false;
  const expiry = Number(expires);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now() || expiry > Date.now() + MAX_AGE_SECONDS * 1000) return false;
  const expected = sign(parts.slice(0, 3).join('.'));
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) return false;
  const config = await getAuthConfig();
  return crypto.timingSafeEqual(Buffer.from(version(config), 'hex'), Buffer.from(sessionVersion, 'hex'));
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { hash: crypto.scryptSync(password, salt, 64).toString('hex'), salt };
}
function verifyPassword(password, hash, salt) {
  if (typeof password !== 'string' || password.length > 128 || !/^[a-f0-9]{128}$/.test(hash) || !/^[a-f0-9]{32}$/.test(salt)) return false;
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}
function compareSecret(provided, expected) {
  if (typeof expected !== 'string' || !expected || typeof provided !== 'string') return false;
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(provided), digest(expected));
}
module.exports = { createSessionCookie, clearSessionCookie, isAuthenticated, hashPassword, verifyPassword, compareSecret, secret };
