const { put, get } = require('@vercel/blob');

const DEFAULT_CONTENT = {
  heroEyebrow: '관세청 38년 경력 관세사 · AI 콘텐츠 · 교육 전문가',
  heroTitle: '38년의 실무가 만든 신뢰,<br>AI 시대의 언어로 전합니다',
  heroSubtitle: '복잡한 AI와 디지털 기술도, 시니어와 초보자의 눈높이에 맞추면<br>누구나 자신감을 갖고 따라올 수 있습니다.',
  ctaLabel: '무료 강의 상담 신청하기',
  contactEmail: 'abokdk55@gmail.com',
  contactPhone: '010-6500-3751',
  curriculum: [
    {
      id: 'ai-practice',
      tag: 'AI 실무',
      title: 'AI 실무 활용',
      level: '입문',
      hours: '2시간',
      summary: '업무 생산성을 끌어올리는 생성형 AI 도구 활용법을 처음부터 실습으로 익힙니다.',
      details: [
        'ChatGPT·Gemini 등 생성형 AI 도구 기본 활용',
        '반복 업무 자동화 프롬프트 작성',
        '실무 문서·보고서 초안 자동 생성',
      ],
      detailUrl: 'curriculum/ai-실무-활용.html',
    },
    {
      id: 'gpts',
      tag: '콘텐츠',
      title: 'GPTs 콘텐츠 기획',
      level: '중급',
      hours: '3시간',
      summary: '나만의 GPTs를 기획하고 만드는 과정을 단계별로 따라 하며 완성합니다.',
      details: [
        '목적에 맞는 GPTs 기획 및 페르소나 설정',
        '지식 파일 연동 및 커스텀 지침 작성',
        '배포 방법과 실제 활용 사례',
      ],
      detailUrl: 'curriculum/gpts-콘텐츠-기획.html',
    },
    {
      id: 'prompt-eng',
      tag: '엔지니어링',
      title: '프롬프트 엔지니어링',
      level: '중급',
      hours: '3시간',
      summary: '구글 공인 교육전문가 인증 기반, 원하는 결과를 얻는 프롬프트 작성법을 배웁니다.',
      details: [
        '프롬프트 구조화 원칙과 핵심 요소',
        '목적별(요약·기획·번역 등) 템플릿 실습',
        '결과물 품질을 높이는 반복 개선법',
      ],
      detailUrl: 'curriculum/프롬프트-엔지니어링.html',
    },
    {
      id: 'shortform',
      tag: '영상 제작',
      title: '숏폼 영상 제작',
      level: '입문',
      hours: '4시간',
      summary: '기획부터 편집까지, AI 도구로 누구나 숏폼 콘텐츠를 제작할 수 있도록 안내합니다.',
      details: [
        '숏폼 기획 및 스토리보드 작성',
        'AI 영상·이미지 생성 도구 활용',
        '편집, 자막, 채널별 배포 전략',
      ],
      detailUrl: 'curriculum/숏폼-영상-제작.html',
    },
    {
      id: 'customs',
      tag: '실무',
      title: '관세·무역 실무',
      level: '실무',
      hours: '4시간',
      summary: '38년 관세청 실무 경험을 바탕으로 한 통관·무역 실무 노하우를 전수합니다.',
      details: [
        '수출입 통관 절차와 필수 서류',
        'FTA 협정 활용 전략',
        '현장에서 자주 겪는 실무 트러블슈팅',
      ],
      detailUrl: 'curriculum/관세-무역-실무.html',
    },
    {
      id: 'vibecoding',
      tag: '바이브코딩',
      title: '바이브코딩 활용',
      level: '입문',
      hours: '2시간',
      summary: '코딩을 몰라도 AI와 대화하듯 요청만으로 나만의 웹페이지·서비스를 직접 만들어보는 실습을 진행합니다.',
      details: [
        '자연어로 웹페이지 구조·디자인 요청하기',
        'AI와 대화하며 내용·디자인 다듬기',
        '실제 인터넷 주소로 배포까지 완성',
      ],
      detailUrl: 'curriculum/바이브코딩-활용.html',
    },
  ],
};

async function fetchJsonBlob(pathname, fallback) {
  try {
    const result = await get(pathname, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result) return fallback;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

async function putJsonBlob(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

async function getContent() {
  const stored = await fetchJsonBlob('data/content.json', null);
  return { ...DEFAULT_CONTENT, ...(stored || {}) };
}

async function saveContent(content) {
  await putJsonBlob('data/content.json', content);
}

async function getInquiries() {
  return fetchJsonBlob('data/inquiries.json', []);
}

async function addInquiry(entry) {
  const list = await getInquiries();
  list.unshift(entry);
  await putJsonBlob('data/inquiries.json', list);
  return list;
}

async function getAuthConfig() {
  return fetchJsonBlob('data/admin-auth.json', null);
}

async function saveAuthConfig(config) {
  await putJsonBlob('data/admin-auth.json', config);
}

module.exports = {
  DEFAULT_CONTENT,
  getContent,
  saveContent,
  getInquiries,
  addInquiry,
  putJsonBlob,
  getAuthConfig,
  saveAuthConfig,
};
