const crypto = require('crypto');
const { isAuthenticated } = require('./_lib/auth');
const { getInquiries, addInquiry, putJsonBlob } = require('./_lib/data');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const body = req.body || {};
    const { name, contact, message, website } = body;

    // honeypot field — bots tend to fill every input
    if (website) {
      res.status(200).json({ ok: true });
      return;
    }

    if (!name || !contact) {
      res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      name: String(name).slice(0, 100),
      contact: String(contact).slice(0, 100),
      message: String(message || '').slice(0, 2000),
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    await addInquiry(entry);
    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const list = await getInquiries();
    res.status(200).json(list);
    return;
  }

  if (req.method === 'PATCH') {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const { id, status } = req.body || {};
    if (!id || !status) {
      res.status(400).json({ error: 'id와 status가 필요합니다.' });
      return;
    }
    const list = await getInquiries();
    const updated = list.map((item) => (item.id === id ? { ...item, status } : item));
    await putJsonBlob('data/inquiries.json', updated);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
