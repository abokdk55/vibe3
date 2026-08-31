const { createSessionCookie, verifyPassword } = require('./_lib/auth');
const { getAuthConfig } = require('./_lib/data');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    return;
  }

  const auth = await getAuthConfig();
  let ok = false;

  if (auth && auth.hash && auth.salt) {
    ok = verifyPassword(password, auth.hash, auth.salt);
  } else {
    // Bootstrap: no password has been set in the blob store yet, fall back
    // to the ADMIN_PASSWORD environment variable.
    ok = password === process.env.ADMIN_PASSWORD;
  }

  if (!ok) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};
