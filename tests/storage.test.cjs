const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, response, memoryBlob } = require('./helpers.cjs');

test('read failures never overwrite inquiries or allow bootstrap login', async () => {
  let writes = 0;
  const mocks = { '@vercel/blob': { get: async () => { throw Error('offline'); }, put: async () => { writes++; } } };
  const data = load('api/_lib/data.js', mocks);
  await assert.rejects(data.addInquiry({ id: 'new' }));
  assert.equal(writes, 0);
  const login = load('api/login.js', { ...mocks, './_lib/rate-limit': { limitRequests: async () => {} } }, { ADMIN_PASSWORD: 'bootstrap-password' });
  const res = response();
  await login({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { password: 'bootstrap-password' } }, res);
  assert.equal(res.code, 503);
  assert.equal(res.headers['Set-Cookie'], undefined);
});

test('only missing blobs return defaults; invalid JSON is an error', async () => {
  const absent = load('api/_lib/data.js', { '@vercel/blob': { get: async () => null } });
  assert.equal(await absent.getAuthConfig(), null);
  const corrupt = load('api/_lib/data.js', { '@vercel/blob': { get: async () => ({ statusCode: 200, stream: '{broken', blob: { etag: '1' } }) } });
  await assert.rejects(corrupt.getContent());
  const nullAuth = load('api/_lib/data.js', { '@vercel/blob': memoryBlob({ 'data/admin-auth.json': null }) });
  await assert.rejects(nullAuth.getAuthConfig());
});

test('concurrent creation and status updates preserve all inquiries', async () => {
  const blob = memoryBlob();
  const data = load('api/_lib/data.js', { '@vercel/blob': blob });
  await Promise.all([data.addInquiry({ id: 'a', status: 'new' }), data.addInquiry({ id: 'b', status: 'new' })]);
  assert.equal((await data.getInquiries()).length, 2);
  await Promise.all([data.addInquiry({ id: 'c', status: 'new' }), data.updateInquiryStatus('a', 'done')]);
  const entries = await data.getInquiries();
  assert.equal(entries.length, 3);
  assert.equal(entries.find((item) => item.id === 'a').status, 'done');
});

test('concurrent content patches preserve unrelated fields', async () => {
  const data = load('api/_lib/data.js', { '@vercel/blob': memoryBlob() });
  await Promise.all([data.saveContent({ ctaLabel: 'new label' }), data.saveContent({ contactPhone: '123' })]);
  const content = await data.getContent();
  assert.equal(content.ctaLabel, 'new label');
  assert.equal(content.contactPhone, '123');
});
