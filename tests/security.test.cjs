const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, response, memoryBlob } = require('./helpers.cjs');
const env = { SESSION_SECRET: 'test-secret-'.repeat(4), ADMIN_PASSWORD: 'test-password-123', RECOVERY_CODE: 'test-recovery-'.repeat(4) };
const headers = { 'content-type': 'application/json' };

test('password reset invalidates previously issued sessions', async () => {
  const blob = memoryBlob();
  const auth = load('api/_lib/auth.js', { '@vercel/blob': blob }, env);
  const cookie = auth.createSessionCookie(null).split(';')[0];
  assert.equal(await auth.isAuthenticated({ headers: { cookie } }), true);
  const reset = load('api/reset-password.js', { '@vercel/blob': blob }, env);
  const res = response();
  await reset({ method: 'POST', headers, socket: { remoteAddress: '127.0.0.1' }, body: { recoveryCode: env.RECOVERY_CODE, newPassword: 'replacement-password' } }, res);
  assert.equal(res.code, 200);
  assert.equal(await auth.isAuthenticated({ headers: { cookie } }), false);
  const config = blob.records.get('data/admin-auth.json').data;
  assert.equal(auth.verifyPassword('replacement-password', config.hash, config.salt), true);
  const fresh = auth.createSessionCookie(config).split(';')[0];
  assert.equal(await auth.isAuthenticated({ headers: { cookie: fresh } }), true);
});

test('malformed, expired and modified cookies are rejected without exceptions', async () => {
  const auth = load('api/_lib/auth.js', { '@vercel/blob': memoryBlob() }, env);
  for (const cookie of ['admin_session=%', 'admin_session=admin.NaN.' + 'a'.repeat(64), 'admin_session=admin.123.' + '가'.repeat(64), 'admin_session=a; admin_session=b', 'other=%']) {
    assert.equal(await auth.isAuthenticated({ headers: { cookie } }), false);
  }
  const token = auth.createSessionCookie(null).split(';')[0];
  assert.equal(await auth.isAuthenticated({ headers: { cookie: token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a') } }), false);
});

test('input validation rejects malformed data and dangerous links', () => {
  const v = load('api/_lib/validation.js');
  assert.throws(() => v.inquiry({ name: ' ', contact: {} }));
  assert.throws(() => v.statusChange({ id: 'a', status: '<script>' }));
  assert.throws(() => v.contentPatch({ curriculum: 'bad' }));
  assert.throws(() => v.contentPatch({ unexpected: true }));
  const item = { id: 'one', tag: 'AI', title: '제목', level: '입문', hours: '2시간', summary: '요약', details: ['내용'], detailUrl: 'javascript:alert(1)' };
  assert.throws(() => v.contentPatch({ curriculum: [item] }));
  item.detailUrl = '/curriculum/ai-실무-활용';
  assert.equal(v.contentPatch({ curriculum: [item] }).curriculum[0].id, 'one');
  assert.throws(() => v.contentPatch({ curriculum: [item, item] }));
});

test('rate limits persist across function instances and isolate addresses', async () => {
  const blob = memoryBlob();
  const req = { headers, socket: { remoteAddress: '127.0.0.1' } };
  for (let i = 0; i < 5; i++) {
    const limiter = load('api/_lib/rate-limit.js', { '@vercel/blob': blob }, env);
    await limiter.limitRequests(req, response(), 'inquiry');
  }
  const limiter = load('api/_lib/rate-limit.js', { '@vercel/blob': blob }, env);
  const res = response();
  await assert.rejects(limiter.limitRequests(req, res, 'inquiry'), (e) => e.status === 429);
  assert.ok(Number(res.headers['Retry-After']) > 0);
  await limiter.limitRequests({ ...req, socket: { remoteAddress: '127.0.0.2' } }, response(), 'inquiry');
});

test('private APIs reject anonymous requests, malformed input and absent IDs', async () => {
  const blob = memoryBlob();
  const handler = load('api/inquiries.js', { '@vercel/blob': blob }, env);
  let res = response(); await handler({ method: 'GET', headers: {} }, res); assert.equal(res.code, 401);
  res = response(); await handler({ method: 'POST', headers, body: { name: ' ', contact: {} } }, res); assert.equal(res.code, 400);
  const auth = load('api/_lib/auth.js', { '@vercel/blob': blob }, env);
  const cookie = auth.createSessionCookie(null).split(';')[0];
  res = response(); await handler({ method: 'PATCH', headers: { ...headers, cookie }, body: { id: 'absent', status: 'done' } }, res); assert.equal(res.code, 404);
});
