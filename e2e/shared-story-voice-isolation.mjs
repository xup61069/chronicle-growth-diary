import { chromium } from '@playwright/test';

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為正在執行的 HTTPS 網址。');

const privateTranscript = '這段逐字稿只屬於私有日記。';
const privateAudioUrl = 'https://storage.example.test/private-voice-note.webm';
const sharedStory = {
  status: 'available',
  diary: {
    title: '公開成長故事',
    subtitle: null,
    publicCoverTitle: null,
    publicCoverUrl: null,
    publicStoryLayout: 'editorial',
    shareMode: 'public',
  },
  lifePhases: [],
  events: [{
    id: 1,
    occurredAt: Date.UTC(2026, 7, 20),
    datePrecision: 'day',
    eventType: 'achievement',
    color: '#EE623B',
    title: '公開事件',
    body: '這段內容可以分享。',
    ageLabel: null,
    place: null,
    tags: [],
    media: [],
    unlocksAt: null,
    isTimeCapsuleLocked: false,
    voiceNotes: [{ id: 9, fileName: 'private-voice-note.webm', url: privateAudioUrl, transcript: privateTranscript }],
  }],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

try {
  await page.route('**/api/trpc/share.get**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ result: { data: { json: sharedStory } } }]),
    });
  });
  await page.goto(`${baseUrl}/story/story-voice-isolation`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '公開成長故事' }).waitFor({ timeout: 10_000 });

  const html = await page.content();
  assert(html.includes('公開事件'), '公開分享頁未呈現可分享事件。');
  assert(!html.includes(privateTranscript), '公開分享頁呈現了私有語音逐字稿。');
  assert(!html.includes(privateAudioUrl), '公開分享頁呈現了私有原音 URL。');
  assert((await page.locator('audio').count()) === 0, '公開分享頁不應渲染語音播放器。');

  console.log('公開分享頁語音隔離回歸通過：毒化回應中的原音與逐字稿均未被渲染。');
} finally {
  await browser.close();
}
