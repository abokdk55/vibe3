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

  function getFriendlyAuthError(error) {
    const message = error && error.message ? error.message : '';

    if (message.includes('환경변수가 설정되지 않았습니다')) {
      return '로그인 서비스 연결 설정이 필요합니다. 관리자에게 문의해주세요.';
    }

    return '로그인 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
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
      })
      .catch((error) => {
        clientPromise = null;
        throw error;
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

  function renderAuthUnavailable(error) {
    const message = getFriendlyAuthError(error);
    document.querySelectorAll('[data-auth-nav]').forEach((container) => {
      container.innerHTML = `<span class="auth-unavailable">${escapeHtml(message)}</span>`;
    });
  }

  async function updateAuthNav() {
    const session = await getSession();
    renderAuthNav(session);
    return session;
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
    getFriendlyAuthError,
    requireAuth,
    updateAuthNav,
  };

  document.addEventListener('DOMContentLoaded', async () => {
    let client = null;
    let session = null;
    let error = null;

    try {
      client = await getSupabaseClient();
      session = document.body.dataset.requireAuth === 'true'
        ? await requireAuth()
        : await updateAuthNav();
    } catch (authError) {
      error = authError;
      renderAuthUnavailable(authError);
    }

    if (client) {
      client.auth.onAuthStateChange(() => {
        updateAuthNav();
      });
    }

    document.dispatchEvent(new CustomEvent('app-auth-ready', { detail: { session, error } }));
  });
})();
