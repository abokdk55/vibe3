const { isAuthenticated } = require('./_lib/auth');
const { getContent, saveContent } = require('./_lib/data');
const { endpoint } = require('./_lib/http');
const { contentPatch } = require('./_lib/validation');

module.exports = endpoint(['GET', 'PUT', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const content = await getContent();
    res.status(200).json(content);
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    if (!await isAuthenticated(req)) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const body = contentPatch(req.body);
    const updated = await saveContent(body);
    res.status(200).json(updated);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
