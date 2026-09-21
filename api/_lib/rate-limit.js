const crypto = require('crypto');
const { isIP } = require('net');
const { updateJsonBlob } = require('./data');
const { secret } = require('./auth');
const { HttpError } = require('./http');

const policies = { login: [10, 15 * 60], recovery: [5, 60 * 60], inquiry: [5, 10 * 60] };
async function limitRequests(req, res, action) {
  const [maximum, seconds] = policies[action];
  const candidate = process.env.VERCEL === '1' ? req.headers?.['x-forwarded-for'] : req.socket?.remoteAddress;
  const ip = typeof candidate === 'string' && isIP(candidate.trim()) ? candidate.trim() : 'unknown';
  const key = crypto.createHmac('sha256', secret()).update(action + ':' + ip).digest('hex');
  // Fixed hash buckets bound stored objects; expired entries are pruned on each write.
  const pathname = 'data/rate-limits/' + action + '-' + key.slice(0, 2) + '.json';
  const now = Date.now();
  await updateJsonBlob(pathname, {}, (current) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) throw new Error('Invalid rate limit state');
    const previous = current[key];
    if (previous && previous.expires > now && previous.count >= maximum) {
      res.setHeader('Retry-After', String(Math.ceil((previous.expires - now) / 1000)));
      throw new HttpError(429, '요청이 많습니다. 잠시 후 다시 시도해주세요.');
    }
    const next = Object.fromEntries(Object.entries(current).filter(([, value]) => value.expires > now));
    next[key] = previous && previous.expires > now ? { ...previous, count: previous.count + 1 } : { count: 1, expires: now + seconds * 1000 };
    return next;
  });
}
module.exports = { limitRequests };
