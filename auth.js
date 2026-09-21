(function () {
  let clientPromise = null;

  function getRedirectPath() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/';
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  async function getSupabaseClient() {
    if (clientPromise) return clientPromise;

    clientPromise = fetch('/api/supabase-config')
      .then(async (response) => {
        const config = await response.json().catch(() => null);
        if (!response.ok || !config) {
          throw new Error(config && config.error ? config.error : 'Supabase 설정을 불러오지 못했습니다.');
        }
        return window.supabase.createClient(config.url, config.anonKey);
      });

    return clientPromise;
  }

  async function getSession() {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  function renderAuthNav(session) {
    document.querySelectorAll('[data-auth-nav]').forEach((container) => {
      if (session && session.user) {
        container.innerHTML = `
          <span class="auth-email">${escapeHtml(session.user.email)}</span>
          <button type="button" class="auth-logout" data-auth-logout>로그아웃</button>
        `;
      } else {
        container.innerHTML = `
          <a href="/login/" class="auth-link">로그인</a>
          <a href="/signup/" class="auth-link auth-link-strong">회원가입</a>
        `;
      }
    });

    document.querySelectorAll('[data-auth-logout]').forEach((button) => {
      button.addEventListener('click', async () => {
        const client = await getSupabaseClient();
        await client.auth.signOut();
        window.location.href = '/';
      });
    });
  }

  async function updateAuthNav() {
    try {
      const session = await getSession();
      renderAuthNav(session);
      return session;
    } catch (error) {
      renderAuthNav(null);
      return null;
    }
  }

  async function requireAuth() {
    const session = await updateAuthNav();
    if (!session) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login/?redirect=${redirect}`);
      return null;
    }
    return session;
  }

  window.appAuth = {
    getSupabaseClient,
    getSession,
    getRedirectPath,
    requireAuth,
    updateAuthNav,
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const client = await getSupabaseClient().catch(() => null);
    const session = document.body.dataset.requireAuth === 'true'
      ? await requireAuth()
      : await updateAuthNav();

    if (client) {
      client.auth.onAuthStateChange(() => {
        updateAuthNav();
      });
    }

    document.dispatchEvent(new CustomEvent('app-auth-ready', { detail: { session } }));
  });
})();
