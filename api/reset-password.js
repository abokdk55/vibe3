const { hashPassword, compareSecret, clearSessionCookie } = require('./_lib/auth');
const { saveAuthConfig } = require('./_lib/data');
const { endpoint } = require('./_lib/http');
const { limitRequests } = require('./_lib/rate-limit');

module.exports = endpoint(['POST'], async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { recoveryCode, newPassword } = req.body || {};

  if (typeof recoveryCode !== 'string' || !recoveryCode || recoveryCode.length > 256) {
    res.status(400).json({ error: '복구 코드를 입력해주세요.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length < 12 || newPassword.length > 128) {
    res.status(400).json({ error: '새 비밀번호는 12~128자로 입력해주세요.' });
    return;
  }

  await limitRequests(req, res, 'recovery');
  if (!process.env.RECOVERY_CODE || process.env.RECOVERY_CODE.length < 32) throw new Error('Recovery code too short');
  const matches = compareSecret(recoveryCode, process.env.RECOVERY_CODE);

  if (!matches) {
    res.status(401).json({ error: '복구 코드가 올바르지 않습니다.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  await saveAuthConfig({ hash, salt, updatedAt: new Date().toISOString() });
  res.setHeader('Set-Cookie', clearSessionCookie());

  res.status(200).json({ ok: true });
});
