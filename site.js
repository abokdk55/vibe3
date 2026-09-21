(() => {
  'use strict';
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function textWithBreaks(node, text) {
    node.replaceChildren();
    String(text).split(/<br\s*\/?\s*>/i).forEach((line, index) => {
      if (index) node.append(document.createElement('br'));
      node.append(document.createTextNode(line));
    });
  }
  function safeLink(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, location.origin + '/');
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function renderCourses(list) {
    const container = document.getElementById('curriculum-list');
    if (!container) return;
    const cards = list.map((course) => {
      const card = element('article', undefined, 'curriculum-card in-view');
      card.append(element('span', course.tag, 'tag'), element('h3', course.title), element('p', course.summary, 'card-summary'));
      const meta = element('div', undefined, 'meta-row');
      meta.append(element('span', course.level), element('span', course.hours));
      const details = element('ul', undefined, 'detail-list');
      (course.details || []).forEach((line) => details.append(element('li', line)));
      card.append(meta, details);
      const href = safeLink(course.detailUrl);
      if (href) { const link = element('a', '더 알아보기 →', 'detail-link'); link.href = href; card.append(link); }
      return card;
    });
    container.replaceChildren(...(cards.length ? cards : [element('p', '준비 중인 강의입니다. 맞춤 교육은 아래로 문의해주세요.')]));
  }
  function renderContacts(content) {
    if (typeof content.contactEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.contactEmail)) {
      document.querySelectorAll('[data-contact-email]').forEach((link) => { link.href = 'mailto:' + content.contactEmail; });
      document.querySelectorAll('[data-contact-email-text]').forEach((node) => { node.textContent = content.contactEmail; });
    }
    if (typeof content.contactPhone === 'string' && /^[+\d()\s-]+$/.test(content.contactPhone)) {
      document.querySelectorAll('[data-contact-phone]').forEach((link) => {
        link.textContent = content.contactPhone; link.href = 'tel:' + content.contactPhone.replace(/[^+\d]/g, '');
      });
    }
  }
  async function loadContent() {
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (!res.ok) throw Error();
      const content = await res.json();
      if (!Array.isArray(content.curriculum)) throw Error();
      document.querySelectorAll('[data-content]').forEach((node) => {
        const value = content[node.dataset.content];
        if (typeof value === 'string') textWithBreaks(node, value);
      });
      renderCourses(content.curriculum);
      renderContacts(content);
      renderDetail(content.curriculum);
    } catch {
      const status = document.getElementById('content-status');
      if (status) status.textContent = '최신 정보를 불러오지 못했습니다. 기본 안내를 확인하거나 이메일로 문의해주세요.';
    }
  }
  function renderDetail(list) {
    const id = document.body.dataset.course;
    if (!id) return;
    const course = list.find((item) => item.id === id || safeLink(item.detailUrl)?.replace(/\.html$/, '') === location.href.split(/[?#]/)[0].replace(/\.html$/, ''));
    const status = document.getElementById('content-status');
    if (!course) { if (status) status.textContent = '현재 강의 목록에 없는 과정입니다. 개설 여부는 문의해주세요.'; return; }
    document.querySelector('.detail-hero h1').textContent = course.title;
    document.querySelector('.detail-hero .tag').textContent = course.tag;
    document.querySelector('.detail-hero .meta-row').replaceChildren(element('span', '난이도: ' + course.level), element('span', '소요시간: ' + course.hours));
    document.querySelector('.detail-body > p').textContent = course.summary;
    document.querySelector('.detail-body .detail-list').replaceChildren(...course.details.map((line) => element('li', line)));
    document.title = course.title + ' | 안병옥';
    document.querySelector('meta[name="description"]')?.setAttribute('content', course.summary);
  }
  const form = document.getElementById('inquiry-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;
    const status = document.getElementById('inquiry-status');
    button.disabled = true; status.textContent = '보내는 중입니다…';
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || '접수하지 못했습니다. 다시 시도해주세요.');
      form.reset(); status.textContent = '상담 신청이 접수되었습니다. 남겨주신 연락처로 안내드리겠습니다.';
    } catch (error) { status.textContent = error instanceof TypeError ? '연결하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해주세요.' : error.message; }
    finally { button.disabled = false; }
  });
  loadContent();
})();
