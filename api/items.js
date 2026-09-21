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

  const endpoint = new URL('/rest/v1/items', supabaseUrl);
  endpoint.searchParams.set('select', 'id,title,region,event_date,created_at,status');
  endpoint.searchParams.set('status', 'eq.active');
  endpoint.searchParams.set('order', 'event_date.asc.nullslast,created_at.desc');

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText || '목록을 불러오지 못했습니다.' });
      return;
    }

    const items = await response.json();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: '목록을 불러오지 못했습니다.' });
  }
};
