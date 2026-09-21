module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
    return;
  }

  res.status(200).json({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  });
};
