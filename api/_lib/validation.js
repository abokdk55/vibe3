const crypto = require('crypto');
const { HttpError } = require('./http');

function bad(message) { throw new HttpError(400, message); }
function bodyObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) bad('올바른 요청 데이터를 보내주세요.');
  return value;
}
function text(value, label, max, required = true) {
  if (typeof value !== 'string') bad(`${label} 형식을 확인해주세요.`);
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > max) bad(`${label}은(는) ${required ? '1' : '0'}~${max}자로 입력해주세요.`);
  return trimmed;
}
function email(value) { return /^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(value); }
function phone(value) { return /^[+\d()\s-]+$/.test(value) && value.replace(/\D/g, '').length >= 7; }
function inquiry(body) {
  bodyObject(body);
  const name = text(body.name, '이름', 100);
  const contact = text(body.contact, '연락처', 100);
  if (!email(contact) && !phone(contact)) bad('연락처에 이메일 또는 전화번호를 입력해주세요.');
  return { name, contact, message: text(body.message ?? '', '문의 내용', 2000, false) };
}
function statusChange(body) {
  bodyObject(body);
  const id = text(body.id, '문의 ID', 100);
  if (!['new', 'contacted', 'done'].includes(body.status)) bad('올바른 문의 상태를 선택해주세요.');
  return { id, status: body.status };
}
function link(value) {
  const result = text(value ?? '', '상세페이지 링크', 500, false);
  if (!result) return '';
  if (/[\s\\]/.test(result) || result.startsWith('//')) bad('올바른 상세페이지 링크를 입력해주세요.');
  try {
    const parsed = new URL(result, 'https://local.invalid/');
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) bad('HTTP 또는 HTTPS 링크만 사용할 수 있습니다.');
  } catch { bad('올바른 상세페이지 링크를 입력해주세요.'); }
  return result;
}
function contentPatch(body) {
  bodyObject(body);
  const limits = { heroEyebrow: 200, heroTitle: 500, heroSubtitle: 1000, ctaLabel: 100, contactEmail: 100, contactPhone: 100 };
  const result = {};
  for (const key of Object.keys(body)) {
    if (!Object.hasOwn(limits, key) && key !== 'curriculum') bad('지원하지 않는 콘텐츠 항목입니다.');
    if (key !== 'curriculum') result[key] = text(body[key], key, limits[key]);
  }
  if (!Object.keys(body).length) bad('저장할 내용이 없습니다.');
  if (result.contactEmail && !email(result.contactEmail)) bad('이메일 형식을 확인해주세요.');
  if (result.contactPhone && !phone(result.contactPhone)) bad('전화번호 형식을 확인해주세요.');
  if (Object.hasOwn(body, 'curriculum')) {
    if (!Array.isArray(body.curriculum) || body.curriculum.length > 50) bad('커리큘럼은 최대 50개까지 저장할 수 있습니다.');
    const ids = new Set();
    result.curriculum = body.curriculum.map((item) => {
      bodyObject(item);
      const id = item.id === undefined ? crypto.randomUUID() : text(item.id, '강의 ID', 100);
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) bad('강의 ID가 올바르지 않거나 중복되었습니다.');
      ids.add(id);
      if (!Array.isArray(item.details) || item.details.length > 30) bad('세부 학습 내용은 최대 30개까지 입력해주세요.');
      return { id, tag: text(item.tag, '태그', 50), title: text(item.title, '제목', 150),
        level: text(item.level, '난이도', 30), hours: text(item.hours, '소요시간', 50),
        summary: text(item.summary, '요약', 1000), details: item.details.map((line) => text(line, '학습 내용', 500)),
        detailUrl: link(item.detailUrl) };
    });
  }
  return result;
}
module.exports = { bodyObject, text, inquiry, statusChange, contentPatch };
