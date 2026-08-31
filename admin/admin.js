const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  loadInquiries();
  loadContent();
}

function showLogin() {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

async function checkSession() {
  const res = await fetch('/api/inquiries');
  if (res.ok) {
    showDashboard();
  } else {
    showLogin();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    document.getElementById('password').value = '';
    showDashboard();
  } else {
    const data = await res.json().catch(() => ({}));
    loginError.textContent = data.error || '로그인에 실패했습니다.';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  showLogin();
});

// Forgot password / reset flow
const resetForm = document.getElementById('reset-form');
const resetError = document.getElementById('reset-error');
const resetSuccess = document.getElementById('reset-success');

document.getElementById('show-reset-btn').addEventListener('click', () => {
  loginForm.classList.add('hidden');
  resetForm.classList.remove('hidden');
  resetError.textContent = '';
  resetSuccess.textContent = '';
});

document.getElementById('back-to-login-btn').addEventListener('click', () => {
  resetForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetError.textContent = '';
  resetSuccess.textContent = '';
  const recoveryCode = document.getElementById('recovery-code').value;
  const newPassword = document.getElementById('new-password').value;
  const res = await fetch('/api/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recoveryCode, newPassword }),
  });
  if (res.ok) {
    resetSuccess.textContent = '비밀번호가 변경되었습니다. 이제 로그인해주세요.';
    document.getElementById('recovery-code').value = '';
    document.getElementById('new-password').value = '';
  } else {
    const data = await res.json().catch(() => ({}));
    resetError.textContent = data.error || '비밀번호 변경에 실패했습니다.';
  }
});

// Tabs
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// Inquiries
const statusLabels = { new: '신규', contacted: '연락완료', done: '처리완료' };

function updateStats(list) {
  document.getElementById('stat-total').textContent = list.length;
  document.getElementById('stat-new').textContent = list.filter((i) => i.status === 'new').length;
  document.getElementById('stat-contacted').textContent = list.filter((i) => i.status === 'contacted').length;
  document.getElementById('stat-done').textContent = list.filter((i) => i.status === 'done').length;
}

async function loadInquiries() {
  const res = await fetch('/api/inquiries');
  if (!res.ok) return;
  const list = await res.json();
  const container = document.getElementById('inquiries-list');

  updateStats(list);

  if (list.length === 0) {
    container.innerHTML = '<p class="empty-text">아직 접수된 문의가 없습니다.</p>';
    return;
  }

  container.innerHTML = list
    .map(
      (item) => `
    <div class="inquiry-card" data-id="${item.id}">
      <div class="inquiry-header">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="status-badge status-${item.status}">${statusLabels[item.status] || item.status}</span>
      </div>
      <div class="inquiry-contact">${escapeHtml(item.contact)}</div>
      <p class="inquiry-message">${escapeHtml(item.message || '(메시지 없음)')}</p>
      <div class="inquiry-footer">
        <span class="inquiry-date">${new Date(item.createdAt).toLocaleString('ko-KR')}</span>
        <select class="status-select">
          <option value="new" ${item.status === 'new' ? 'selected' : ''}>신규</option>
          <option value="contacted" ${item.status === 'contacted' ? 'selected' : ''}>연락완료</option>
          <option value="done" ${item.status === 'done' ? 'selected' : ''}>처리완료</option>
        </select>
      </div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (e) => {
      const card = e.target.closest('.inquiry-card');
      const id = card.dataset.id;
      await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: e.target.value }),
      });
      loadInquiries();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Content editor
const contentForm = document.getElementById('content-form');

async function loadContent() {
  const res = await fetch('/api/content');
  if (!res.ok) return;
  const content = await res.json();
  Object.entries(content).forEach(([key, value]) => {
    const field = contentForm.elements[key];
    if (field && typeof value !== 'object') field.value = value;
  });
  renderCurriculumAdmin(content.curriculum || []);
}

// Curriculum admin
const curriculumList = document.getElementById('curriculum-admin-list');

function curriculumCardMarkup(item, localId) {
  const details = Array.isArray(item.details) ? item.details.join('\n') : '';
  return `
    <div class="curriculum-admin-card" data-local-id="${localId}">
      <div class="curriculum-card-header">
        <span>커리큘럼 항목</span>
        <button type="button" class="remove-curriculum-btn">삭제</button>
      </div>
      <div class="row">
        <label>태그
          <input type="text" data-field="tag" value="${escapeHtml(item.tag || '')}">
        </label>
        <label>제목
          <input type="text" data-field="title" value="${escapeHtml(item.title || '')}">
        </label>
        <label>난이도
          <input type="text" data-field="level" value="${escapeHtml(item.level || '')}" placeholder="입문/중급/실무">
        </label>
        <label>소요시간
          <input type="text" data-field="hours" value="${escapeHtml(item.hours || '')}" placeholder="예: 2시간">
        </label>
      </div>
      <label>요약 (카드에 항상 보이는 한 줄 설명)
        <input type="text" data-field="summary" value="${escapeHtml(item.summary || '')}">
      </label>
      <label>세부 학습 내용 <span class="hint">한 줄에 하나씩</span>
        <textarea data-field="details" rows="3">${escapeHtml(details)}</textarea>
      </label>
      <label>상세페이지 링크 <span class="hint">선택 사항, 비워두면 "더 알아보기" 링크가 생략됩니다</span>
        <input type="text" data-field="detailUrl" value="${escapeHtml(item.detailUrl || '')}">
      </label>
    </div>
  `;
}

function renderCurriculumAdmin(list) {
  curriculumList.innerHTML = list
    .map((item, idx) => curriculumCardMarkup(item, `c${idx}-${Date.now()}`))
    .join('');
  attachRemoveHandlers();
}

function attachRemoveHandlers() {
  curriculumList.querySelectorAll('.remove-curriculum-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.curriculum-admin-card').remove();
    });
  });
}

document.getElementById('add-curriculum-btn').addEventListener('click', () => {
  const card = document.createElement('div');
  card.innerHTML = curriculumCardMarkup({}, `new-${Date.now()}`);
  curriculumList.appendChild(card.firstElementChild);
  attachRemoveHandlers();
});

document.getElementById('save-curriculum-btn').addEventListener('click', async () => {
  const cards = curriculumList.querySelectorAll('.curriculum-admin-card');
  const curriculum = Array.from(cards).map((card) => {
    const get = (field) => card.querySelector(`[data-field="${field}"]`).value;
    return {
      tag: get('tag'),
      title: get('title'),
      level: get('level'),
      hours: get('hours'),
      summary: get('summary'),
      details: get('details').split('\n').map((s) => s.trim()).filter(Boolean),
      detailUrl: get('detailUrl'),
    };
  });

  const savedText = document.getElementById('curriculum-saved');
  const res = await fetch('/api/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ curriculum }),
  });
  if (res.ok) {
    savedText.textContent = '저장되었습니다!';
    setTimeout(() => (savedText.textContent = ''), 3000);
  } else {
    savedText.textContent = '저장에 실패했습니다.';
  }
});

contentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(contentForm);
  const payload = Object.fromEntries(formData.entries());
  const res = await fetch('/api/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const savedText = document.getElementById('content-saved');
  if (res.ok) {
    savedText.textContent = '저장되었습니다!';
    setTimeout(() => (savedText.textContent = ''), 3000);
  } else {
    savedText.textContent = '저장에 실패했습니다.';
  }
});

checkSession();
