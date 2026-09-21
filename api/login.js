const { createSessionCookie, verifyPassword, compareSecret } = require('./_lib/auth');
const { getAuthConfig } = require('./_lib/data');
const { endpoint } = require('./_lib/http');
const { limitRequests } = require('./_lib/rate-limit');

module.exports = endpoint(['POST'], async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || !password || password.length > 128) {
    res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    return;
  }

  await limitRequests(req, res, 'login');
  const auth = await getAuthConfig();
  let ok = false;

  if (auth && auth.hash && auth.salt) {
    ok = verifyPassword(password, auth.hash, auth.salt);
  } else if (auth === null) {
    // Bootstrap: no password has been set in the blob store yet, fall back
    // to the ADMIN_PASSWORD environment variable.
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) throw new Error('Initial password too short');
    ok = compareSecret(password, process.env.ADMIN_PASSWORD);
  }

  if (!ok) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie(auth));
  res.status(200).json({ ok: true });
});
