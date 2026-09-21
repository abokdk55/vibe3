class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function endpoint(methods, handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: '지원하지 않는 요청 방식입니다.' });
    }
    try {
      if (req.method !== 'GET') {
        if (req.headers?.['sec-fetch-site'] === 'cross-site') throw new HttpError(403, '허용되지 않는 요청입니다.');
        const type = req.headers?.['content-type'] || '';
        if (!/^application\/json(?:\s*;|$)/i.test(type)) throw new HttpError(415, 'JSON 형식으로 요청해주세요.');
        if (Buffer.byteLength(JSON.stringify(req.body ?? {})) > 128 * 1024) throw new HttpError(413, '요청 내용이 너무 큽니다.');
      }
      await handler(req, res);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 503;
      res.status(status).json({ error: error instanceof HttpError ? error.message : '서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
    }
  };
}

module.exports = { HttpError, endpoint };
