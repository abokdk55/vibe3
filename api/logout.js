const { clearSessionCookie } = require('./_lib/auth');
const { endpoint } = require('./_lib/http');

module.exports = endpoint(['POST'], async (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
});
