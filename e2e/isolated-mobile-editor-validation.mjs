import { chromium } from '@playwright/test';

// Usage: AUTH_DRIVER=local must run at an HTTPS origin; provide that origin explicitly.
const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為已啟動 local-auth 服務的 HTTPS 網址。');
const email = `mobile-editor-${Date.now()}@example.test`;
const password = 'local-validation-passphrase';
const eventTitle = '375px 工作區驗證事件';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function trpcMutation(page, path, input) {
  return page.evaluate(async ({ path, input }) => {
    const response = await fetch(`/api/trpc/${path}?batch=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ '0': { json: input } }),
    });
    return { status: response.status, body: await response.json() };
  }, { path, input });
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await context.newPage();
const findings = { email, checks: [], cleaned: false };

try {
  await page.goto(`${baseUrl}/editor`, { waitUntil: 'domcontentloaded' });
  const registration = await trpcMutation(page, 'auth.localRegister', {
    name: 'Mobile Editor Validation',
    email,
    password,
  });
  assert(registration.status === 200, '無法建立隔離 local-auth 帳號。');
  findings.checks.push('local-auth registration');

  const eventCreation = await trpcMutation(page, 'diary.createEvent', {
    occurredAt: Date.parse('2026-08-19T00:00:00.000Z'),
    datePrecision: 'day',
    eventType: 'achievement',
    title: eventTitle,
    body: '僅供 375px 編輯器互動驗證的隔離事件。',
    ageLabel: null,
    place: null,
    color: '#EE623B',
    tagNames: [],
    skillNames: [],
    track: 'life',
    milestoneType: 'highlight',
    milestoneWeight: 3,
    comparisonGroup: null,
    unlocksAt: null,
    phaseKeywords: [],
    mapLatitudeE6: null,
    mapLongitudeE6: null,
    locationPrivacy: 'none',
    soundtrackTitle: null,
    soundtrackUrl: null,
    shareScope: 'private',
  });
  assert(eventCreation.status === 200, '無法建立隔離驗證事件。');
  findings.checks.push('authenticated diary.createEvent');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: '索引' }).click();
  const indexEventButton = page.locator('.event-list button').filter({ hasText: eventTitle });
  await indexEventButton.waitFor({ timeout: 10_000 });
  assert(await page.getByRole('tab', { name: '索引' }).getAttribute('aria-selected') === 'true', '索引分頁未成為目前作用中分頁。');
  findings.checks.push('375px index tab');

  await indexEventButton.click();
  await page.getByRole('tab', { name: '預覽' }).click();
  await page.locator('#mobile-workspace-preview').getByRole('heading', { name: eventTitle, exact: true }).waitFor({ timeout: 10_000 });
  assert(await page.getByRole('tab', { name: '預覽' }).getAttribute('aria-selected') === 'true', '事件選取後預覽分頁未可用。');
  findings.checks.push('375px event selection and preview');

  await page.getByRole('tab', { name: '索引' }).click();
  await page.getByRole('button', { name: '新增一段記憶' }).click();
  await page.getByRole('tab', { name: '撰寫' }).waitFor({ timeout: 10_000 });
  assert(await page.getByRole('tab', { name: '撰寫' }).getAttribute('aria-selected') === 'true', '新增事件入口未切換至撰寫分頁。');
  await page.getByPlaceholder('例如：第一次站上舞台').waitFor({ timeout: 10_000 });
  findings.checks.push('375px new event entry');

  const annualReview = page.locator('.annual-review-studio');
  await annualReview.scrollIntoViewIfNeeded();
  const annualConsent = annualReview.getByRole('checkbox');
  const generateAnnualReview = annualReview.getByRole('button', { name: '生成 AI 年度回顧' });
  await annualConsent.waitFor({ timeout: 10_000 });
  assert(await annualConsent.isChecked() === false, '年度 AI 回顧同意不應預設勾選。');
  assert(await generateAnnualReview.isDisabled(), '未同意時不應允許生成年度 AI 回顧。');
  await annualConsent.check();
  assert(await generateAnnualReview.isEnabled(), '勾選當次 AI 處理同意後應允許生成年度回顧。');
  const annualDownload = page.waitForEvent('download');
  await annualReview.getByRole('button', { name: '匯出年度 Markdown' }).click();
  assert((await annualDownload).suggestedFilename() === 'year-review-2026.chronicle.md', '年度 Markdown 匯出檔名不符合 Chronicle 格式。');
  findings.checks.push('annual review consent and Markdown export');

  let delayDiaryGet = true;
  await page.route('**/api/trpc/diary.get**', async (route) => {
    if (!delayDiaryGet) return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    await route.abort('failed');
  });
  await page.reload({ waitUntil: 'commit' });
  await page.getByText('讀取時間超過預期，可能是登入工作階段或網路連線已失效。').waitFor({ timeout: 13_000 });
  findings.checks.push('diary.get timeout recovery display');

  delayDiaryGet = false;
  await page.getByRole('button', { name: '重新嘗試' }).click();
  await page.getByRole('tab', { name: '索引' }).waitFor({ timeout: 10_000 });
  findings.checks.push('diary.get retry recovery');

  await page.unroute('**/api/trpc/diary.get**');
  let failDiaryGet = true;
  await page.route('**/api/trpc/diary.get**', async (route) => {
    if (!failDiaryGet) return route.continue();
    await route.abort('failed');
  });
  await page.reload({ waitUntil: 'commit' });
  await page.getByText('暫時無法讀取你的成長檔案。').waitFor({ timeout: 10_000 });
  findings.checks.push('diary.get query failure display');

  failDiaryGet = false;
  await page.getByRole('button', { name: '重新嘗試' }).click();
  await page.getByRole('tab', { name: '索引' }).waitFor({ timeout: 10_000 });
  findings.checks.push('diary.get query failure retry');

  failDiaryGet = true;
  await page.reload({ waitUntil: 'commit' });
  await page.getByText('暫時無法讀取你的成長檔案。').waitFor({ timeout: 10_000 });
  failDiaryGet = false;
  await page.getByRole('button', { name: '重新載入頁面' }).click({ noWaitAfter: true });
  await page.getByRole('tab', { name: '索引' }).waitFor({ timeout: 10_000 });
  findings.checks.push('diary.get page reload recovery');

  await page.unroute('**/api/trpc/diary.get**');
  const deletion = await trpcMutation(page, 'auth.deleteAccount', { confirmation: '刪除我的帳號' });
  assert(deletion.status === 200, '無法清除隔離驗證帳號。');
  findings.cleaned = true;
  findings.status = 'passed';
  console.log(JSON.stringify(findings));
} finally {
  if (!findings.cleaned) {
    try {
      await trpcMutation(page, 'auth.deleteAccount', { confirmation: '刪除我的帳號' });
      findings.cleaned = true;
    } catch {
      // 保留原始失敗原因，但盡力清理隔離帳號。
    }
  }
  await browser.close();
}
