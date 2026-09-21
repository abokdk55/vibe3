const crypto = require('crypto');
const { isAuthenticated } = require('./_lib/auth');
const { getInquiries, addInquiry, updateInquiryStatus } = require('./_lib/data');
const { endpoint } = require('./_lib/http');
const { bodyObject, inquiry, statusChange } = require('./_lib/validation');
const { limitRequests } = require('./_lib/rate-limit');

module.exports = endpoint(['GET', 'POST', 'PATCH'], async (req, res) => {
  if (req.method === 'POST') {
    const body = bodyObject(req.body);
    const { website } = body;

    // honeypot field — bots tend to fill every input
    if (website) {
      res.status(200).json({ ok: true });
      return;
    }

    const { name, contact, message } = inquiry(body);
    await limitRequests(req, res, 'inquiry');

    const entry = {
      id: crypto.randomUUID(),
      name, contact, message,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    await addInquiry(entry);
    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    if (!await isAuthenticated(req)) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const list = await getInquiries();
    res.status(200).json(list);
    return;
  }

  if (req.method === 'PATCH') {
    if (!await isAuthenticated(req)) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const { id, status } = statusChange(req.body);
    await updateInquiryStatus(id, status);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
