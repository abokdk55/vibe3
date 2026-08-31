const { isAuthenticated } = require('./_lib/auth');
const { getContent, saveContent, DEFAULT_CONTENT } = require('./_lib/data');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const content = await getContent();
    res.status(200).json(content);
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const body = req.body || {};
    const current = await getContent();
    const updated = { ...DEFAULT_CONTENT, ...current, ...body };
    await saveContent(updated);
    res.status(200).json(updated);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
