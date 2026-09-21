'use strict';
const $ = (id) => document.getElementById(id);
const loginForm = $('login-form');
const contentForm = $('content-form');
const curriculumList = $('curriculum-admin-list');
const statusLabels = { new: '신규', contacted: '연락완료', done: '처리완료' };
let generation = 0;
const dirty = new Set();
let contentLoaded = false;

function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function showLogin(message = '') {
  generation++;
  $('dashboard-view').classList.add('hidden');
  $('login-view').classList.remove('hidden');
  $('reset-form').classList.add('hidden');
  loginForm.classList.remove('hidden');
  $('inquiries-list').replaceChildren();
  curriculumList.replaceChildren();
  contentForm.reset();
  contentLoaded = false; dirty.clear();
  $('login-error').textContent = message;
}
async function request(path, method = 'GET', data) {
  let res;
  try {
    res = await fetch(path, { method, cache: 'no-store',
      ...(method !== 'GET' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data ?? {}) } : {}) });
  } catch { throw Error('서버에 연결하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해주세요.'); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !$('dashboard-view').classList.contains('hidden')) showLogin('로그인이 만료되었습니다. 다시 로그인해주세요.');
    const error = Error(body.error || '요청을 처리하지 못했습니다. 다시 시도해주세요.');
    error.status = res.status;
    throw error;
  }
  return body;
}
async function action(button, message, task) {
  if (button.disabled) return;
  button.disabled = true;
  message.textContent = '처리 중입니다…';
  try { await task(); }
  catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
}
function updateStats(list) {
  $('stat-total').textContent = list.length;
  for (const status of Object.keys(statusLabels)) $('stat-' + status).textContent = list.filter((item) => item.status === status).length;
}
async function loadInquiries(existing) {
  const current = generation;
  const list = existing || await request('/api/inquiries');
  if (current !== generation) return;
  if (!Array.isArray(list)) throw Error('문의 데이터를 읽을 수 없습니다.');
  updateStats(list);
  const cards = list.map((item) => {
    const card = node('article', undefined, 'inquiry-card');
    const header = node('div', undefined, 'inquiry-header');
    const status = Object.hasOwn(statusLabels, item.status) ? item.status : 'new';
    header.append(node('strong', item.name), node('span', statusLabels[status], 'status-badge status-' + status));
    const footer = node('div', undefined, 'inquiry-footer');
    footer.append(node('span', new Date(item.createdAt).toLocaleString('ko-KR'), 'inquiry-date'));
    const select = node('select', undefined, 'status-select');
    select.setAttribute('aria-label', String(item.name) + ' 문의 상태');
    for (const [value, label] of Object.entries(statusLabels)) {
      const option = node('option', label); option.value = value; select.append(option);
    }
    select.value = status;
    select.addEventListener('change', () => {
      action(select, $('dashboard-status'), async () => {
        try { await request('/api/inquiries', 'PATCH', { id: item.id, status: select.value }); }
        catch (error) { select.value = status; throw error; }
        await loadInquiries();
        $('dashboard-status').textContent = '문의 상태를 저장했습니다.';
      });
    });
    footer.append(select);
    card.append(header, node('div', item.contact, 'inquiry-contact'), node('p', item.message || '(메시지 없음)', 'inquiry-message'), footer);
    return card;
  });
  $('inquiries-list').replaceChildren(...(cards.length ? cards : [node('p', '아직 접수된 문의가 없습니다.', 'empty-text')]));
}
function renderCourse(item) {
  const card = node('div', undefined, 'curriculum-admin-card');
  card.dataset.id = item.id || crypto.randomUUID();
  const header = node('div', undefined, 'curriculum-card-header');
  const remove = node('button', '삭제', 'remove-curriculum-btn'); remove.type = 'button';
  remove.addEventListener('click', () => { card.remove(); dirty.add('curriculum'); });
  header.append(node('span', '커리큘럼 항목'), remove); card.append(header);
  const fields = [
    ['tag', '태그', 50], ['title', '제목', 150], ['level', '난이도', 30], ['hours', '소요시간', 50],
    ['summary', '요약', 1000], ['details', '세부 학습 내용 (한 줄에 하나씩)', 15030],
    ['detailUrl', '상세페이지 링크 (선택)', 500],
  ];
  for (const [key, title, maximum] of fields) {
    const label = node('label', title);
    const input = node(key === 'details' || key === 'summary' ? 'textarea' : 'input');
    input.dataset.field = key; input.maxLength = maximum;
    input.value = key === 'details' ? (Array.isArray(item.details) ? item.details.join('\n') : '') : (item[key] || '');
    label.append(input); card.append(label);
  }
  return card;
}
function renderCurriculum(list) { curriculumList.replaceChildren(...list.map(renderCourse)); }
async function loadContent() {
  const current = generation;
  const content = await request('/api/content');
  if (current !== generation) return;
  if (!Array.isArray(content.curriculum)) throw Error('콘텐츠 데이터를 읽을 수 없습니다.');
  for (const [key, value] of Object.entries(content)) {
    const field = contentForm.elements.namedItem(key);
    if (field && typeof value === 'string') field.value = value;
  }
  renderCurriculum(content.curriculum); contentLoaded = true;
}
async function showDashboard(inquiries) {
  generation++;
  $('login-view').classList.add('hidden');
  $('dashboard-view').classList.remove('hidden');
  $('dashboard-status').textContent = '불러오는 중입니다…';
  const outcomes = await Promise.allSettled([loadInquiries(inquiries), loadContent()]);
  if ($('dashboard-view').classList.contains('hidden')) return;
  $('dashboard-status').textContent = outcomes.filter((r) => r.status === 'rejected').map((r) => r.reason.message).join(' ');
}
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  action(loginForm.querySelector('[type="submit"]'), $('login-error'), async () => {
    await request('/api/login', 'POST', { password: $('password').value });
    $('password').value = ''; $('login-error').textContent = '';
    await showDashboard();
  });
});
$('logout-btn').addEventListener('click', () => {
  action($('logout-btn'), $('dashboard-status'), async () => { await request('/api/logout', 'POST'); showLogin(); });
});
$('show-reset-btn').addEventListener('click', () => {
  loginForm.classList.add('hidden'); $('reset-form').classList.remove('hidden');
  $('reset-error').textContent = ''; $('reset-success').textContent = ''; $('recovery-code').focus();
});
$('back-to-login-btn').addEventListener('click', () => { showLogin(); $('password').focus(); });
$('reset-form').addEventListener('submit', (event) => {
  event.preventDefault();
  action($('reset-form').querySelector('[type="submit"]'), $('reset-error'), async () => {
    await request('/api/reset-password', 'POST', { recoveryCode: $('recovery-code').value, newPassword: $('new-password').value });
    $('reset-form').reset(); $('reset-error').textContent = '';
    $('reset-success').textContent = '비밀번호를 변경했습니다. 로그인으로 돌아가 새 비밀번호를 입력해주세요.';
  });
});
document.querySelectorAll('.tab-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((other) => {
      other.classList.toggle('active', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== 'tab-' + button.dataset.tab));
  });
});
$('add-curriculum-btn').addEventListener('click', () => {
  if (!contentLoaded) { $('curriculum-saved').textContent = '콘텐츠를 먼저 불러와주세요.'; return; }
  curriculumList.append(renderCourse({})); dirty.add('curriculum');
});
curriculumList.addEventListener('input', () => { dirty.add('curriculum'); });
contentForm.addEventListener('input', () => { dirty.add('content'); });
$('save-curriculum-btn').addEventListener('click', () => {
  action($('save-curriculum-btn'), $('curriculum-saved'), async () => {
    if (!contentLoaded) throw Error('콘텐츠를 먼저 불러와주세요.');
    const curriculum = [...curriculumList.children].map((card) => {
      const course = { id: card.dataset.id };
      card.querySelectorAll('[data-field]').forEach((input) => {
        course[input.dataset.field] = input.dataset.field === 'details' ? input.value.split('\n').map((s) => s.trim()).filter(Boolean) : input.value;
      }); return course;
    });
    await request('/api/content', 'PUT', { curriculum });
    dirty.delete('curriculum'); $('curriculum-saved').textContent = '저장했습니다. 홈페이지와 연결된 상세페이지에 반영됩니다.';
  });
});
contentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  action(contentForm.querySelector('[type="submit"]'), $('content-saved'), async () => {
    if (!contentLoaded) throw Error('콘텐츠를 먼저 불러와주세요.');
    await request('/api/content', 'PUT', Object.fromEntries(new FormData(contentForm)));
    dirty.delete('content'); $('content-saved').textContent = '저장했습니다.';
  });
});
$('reload-btn').addEventListener('click', () => {
  if (dirty.size && !confirm('저장하지 않은 변경을 버리고 다시 불러올까요?')) return;
  action($('reload-btn'), $('dashboard-status'), async () => { await showDashboard(); dirty.clear(); });
});
window.addEventListener('beforeunload', (event) => {
  if (dirty.size) { event.preventDefault(); event.returnValue = ''; }
});
(async () => {
  try { await showDashboard(await request('/api/inquiries')); }
  catch (error) { showLogin(error.status === 401 ? '' : error.message); }
})();
