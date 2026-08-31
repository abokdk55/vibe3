const crypto = require('crypto');
const { hashPassword } = require('./_lib/auth');
const { saveAuthConfig } = require('./_lib/data');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { recoveryCode, newPassword } = req.body || {};

  if (typeof recoveryCode !== 'string' || !recoveryCode) {
    res.status(400).json({ error: '복구 코드를 입력해주세요.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 4) {
    res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
    return;
  }

  const expected = Buffer.from(process.env.RECOVERY_CODE || '');
  const provided = Buffer.from(recoveryCode);
  const matches =
    expected.length > 0 &&
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided);

  if (!matches) {
    res.status(401).json({ error: '복구 코드가 올바르지 않습니다.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  await saveAuthConfig({ hash, salt, updatedAt: new Date().toISOString() });

  res.status(200).json({ ok: true });
};
