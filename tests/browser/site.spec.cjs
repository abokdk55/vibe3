const { test, expect } = require('@playwright/test');
const { DEFAULT_CONTENT } = require('../../api/_lib/data');

async function setup(page, { loggedIn = false, failSave = false } = {}) {
  let content = structuredClone(DEFAULT_CONTENT);
  const inquiries = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    const data = method === 'GET' ? {} : request.postDataJSON();
    let body = { ok: true }; let status = 200;
    if (pathname === '/api/content') {
      if (method !== 'GET') {
        if (failSave) { status = 503; body = { error: '저장소 연결 실패' }; }
        else { content = { ...content, ...data }; body = content; }
      } else body = content;
    } else if (pathname === '/api/login') loggedIn = true;
    else if (pathname === '/api/logout') loggedIn = false;
    else if (pathname === '/api/inquiries') {
      if (method === 'POST') { inquiries.push({ ...data, id: 'test', status: 'new', createdAt: new Date().toISOString() }); status = 201; }
      else if (!loggedIn) { status = 401; body = { error: '로그인이 필요합니다.' }; }
      else body = inquiries;
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { errors, inquiries, getContent: () => content };
}

test('home loads courses, anchors and submits an inquiry without overflow', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.locator('.curriculum-card')).toHaveCount(6);
  for (const id of ['curriculum', 'career', 'awards', 'contact']) await expect(page.locator('#' + id)).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('이름', { exact: true }).fill('테스트 사용자');
  await page.getByLabel('연락처 (이메일 또는 전화번호)').fill('test@example.com');
  await page.getByLabel('문의 내용', { exact: true }).fill('테스트 강의 문의');
  await page.getByRole('button', { name: '상담 신청 보내기' }).click();
  await expect(page.locator('#inquiry-status')).toContainText('접수되었습니다');
  expect(state.inquiries).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test('admin preserves quotes and IDs; edited data reaches detail pages', async ({ page }) => {
  const state = await setup(page, { loggedIn: true });
  await page.goto('/admin');
  await page.getByRole('button', { name: '📚 커리큘럼 관리' }).click();
  const card = page.locator('.curriculum-admin-card').first();
  await expect(card).toBeVisible();
  const malicious = '" autofocus onfocus="window.injected=1';
  await card.getByLabel('제목', { exact: true }).fill(malicious);
  await page.getByRole('button', { name: '전체 저장하기' }).click();
  await expect(page.locator('#curriculum-saved')).toContainText('저장했습니다');
  expect(state.getContent().curriculum[0].id).toBe('ai-practice');
  await page.getByRole('button', { name: '다시 불러오기' }).click();
  await expect(card.getByLabel('제목', { exact: true })).toHaveValue(malicious);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/curriculum/ai-실무-활용');
  await expect(page.locator('h1')).toHaveText(malicious);
  expect(state.errors).toEqual([]);
});

test('save failures retain input and session expiry returns to login', async ({ page }) => {
  await setup(page, { loggedIn: true, failSave: true });
  await page.goto('/admin');
  await page.getByRole('button', { name: '✏️ 콘텐츠 수정' }).click();
  await expect(page.locator('[name="heroEyebrow"]')).not.toHaveValue('');
  await page.locator('[name="heroEyebrow"]').fill('보존할 내용');
  await page.getByRole('button', { name: '저장하기', exact: true }).click();
  await expect(page.locator('#content-saved')).toContainText('저장소 연결 실패');
  await expect(page.locator('[name="heroEyebrow"]')).toHaveValue('보존할 내용');
  await page.route('**/api/content', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: '로그인이 필요합니다.' }) }));
  await page.getByRole('button', { name: '저장하기', exact: true }).click();
  await expect(page.locator('#login-view')).toBeVisible();
  await expect(page.locator('#inquiries-list')).toBeEmpty();
});

test('network failure keeps home usable and reduced motion is respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/content', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#content-status')).toContainText('최신 정보를 불러오지 못했습니다');
  await expect(page.locator('.course-fallback')).toHaveCount(6);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.goto('/admin');
  expect(await page.locator('.login-card').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
