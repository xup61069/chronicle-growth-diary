import { chromium } from '@playwright/test';

// Usage: AUTH_DRIVER=local must run at an HTTPS origin; provide that origin explicitly.
const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為已啟動 local-auth 服務的 HTTPS 網址。');
const email = `mobile-editor-${Date.now()}@example.test`;
const password = 'local-validation-passphrase';
const eventTitle = '375px 工作區驗證事件';
const anniversaryTitle = '兩年前的同日驗證事件';
const lockedAnniversaryTitle = '尚未解鎖的同日膠囊';
const lockedMonthlyTitle = '尚未解鎖的月度膠囊';
const readyFutureLetterTitle = '已解鎖的未來信件';
const today = new Date();
const anniversaryOccurredAt = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate(), 12).getTime();
const viewport = process.env.CHRONICLE_E2E_VIEWPORT === 'desktop' ? { width: 1280, height: 720 } : { width: 375, height: 812 };

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
const context = await browser.newContext({ viewport });
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
    phaseKeywords: ['行動驗證', '資料索引'],
    mapLatitudeE6: null,
    mapLongitudeE6: null,
    locationPrivacy: 'none',
    soundtrackTitle: null,
    soundtrackUrl: null,
    shareScope: 'private',
  });
  assert(eventCreation.status === 200, '無法建立隔離驗證事件。');
  findings.checks.push('authenticated diary.createEvent');

  const anniversaryCreation = await trpcMutation(page, 'diary.createEvent', {
    occurredAt: anniversaryOccurredAt,
    datePrecision: 'day',
    eventType: 'memory',
    title: anniversaryTitle,
    body: '僅供同日回憶卡開啟流程驗證的私人事件。',
    ageLabel: null,
    place: null,
    color: '#EE623B',
    tagNames: [],
    skillNames: [],
    track: 'life',
    milestoneType: 'standard',
    milestoneWeight: 1,
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
  assert(anniversaryCreation.status === 200, '無法建立隔離同日回憶事件。');
  const lockedAnniversaryCreation = await trpcMutation(page, 'diary.createEvent', {
    occurredAt: new Date(today.getFullYear() - 3, today.getMonth(), today.getDate(), 12).getTime(),
    datePrecision: 'day',
    eventType: 'memory',
    title: lockedAnniversaryTitle,
    body: '此內容在測試時應維持遮罩。',
    ageLabel: null,
    place: null,
    color: '#EE623B',
    tagNames: [],
    skillNames: [],
    track: 'life',
    milestoneType: 'standard',
    milestoneWeight: 1,
    comparisonGroup: null,
    unlocksAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
    phaseKeywords: [],
    mapLatitudeE6: null,
    mapLongitudeE6: null,
    locationPrivacy: 'none',
    soundtrackTitle: null,
    soundtrackUrl: null,
    shareScope: 'private',
  });
  assert(lockedAnniversaryCreation.status === 200, '無法建立隔離鎖定同日膠囊。');
  const lockedMonthlyCreation = await trpcMutation(page, 'diary.createEvent', {
    occurredAt: Date.parse('2026-08-18T00:00:00.000Z'),
    datePrecision: 'day',
    eventType: 'memory',
    title: lockedMonthlyTitle,
    body: '此內容在月度摘要列印時應維持遮罩。',
    ageLabel: null,
    place: null,
    color: '#EE623B',
    tagNames: [],
    skillNames: [],
    track: 'life',
    milestoneType: 'standard',
    milestoneWeight: 1,
    comparisonGroup: null,
    unlocksAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
    phaseKeywords: [],
    mapLatitudeE6: null,
    mapLongitudeE6: null,
    locationPrivacy: 'none',
    soundtrackTitle: null,
    soundtrackUrl: null,
    shareScope: 'private',
  });
  assert(lockedMonthlyCreation.status === 200, '無法建立隔離鎖定月度膠囊。');
  const readyFutureLetterCreation = await trpcMutation(page, 'diary.createEvent', {
    occurredAt: Date.parse('2026-08-17T00:00:00.000Z'),
    datePrecision: 'day',
    eventType: 'memory',
    title: readyFutureLetterTitle,
    body: '這封信已可在私人工作台重新閱讀。',
    ageLabel: null,
    place: null,
    color: '#EE623B',
    tagNames: [],
    skillNames: [],
    track: 'life',
    milestoneType: 'standard',
    milestoneWeight: 1,
    comparisonGroup: null,
    unlocksAt: Date.now() - 24 * 60 * 60 * 1000,
    phaseKeywords: [],
    mapLatitudeE6: null,
    mapLongitudeE6: null,
    locationPrivacy: 'none',
    soundtrackTitle: null,
    soundtrackUrl: null,
    shareScope: 'private',
  });
  assert(readyFutureLetterCreation.status === 200, '無法建立隔離已解鎖未來信件。');

  if (viewport.width > 375) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    const desktopFutureLetters = page.locator('.future-letters-studio');
    await desktopFutureLetters.getByRole('heading', { name: '寫給以後的自己' }).waitFor({ timeout: 10_000 });
    assert(await desktopFutureLetters.getByText(readyFutureLetterTitle, { exact: true }).isVisible(), '桌面未來信件索引未顯示已解鎖事件。');
    assert(await desktopFutureLetters.getByText(lockedMonthlyTitle, { exact: true }).count() === 0, '桌面未來信件索引不應顯示鎖定膠囊標題。');
    const desktopReadyLetter = desktopFutureLetters.getByText(readyFutureLetterTitle, { exact: true }).locator('..');
    await desktopReadyLetter.getByRole('button', { name: '開啟這封信' }).click();
    await page.locator('.preview-card h3').getByText(readyFutureLetterTitle, { exact: true }).waitFor({ timeout: 10_000 });
    findings.checks.push('desktop private future letters index and capsule masking');
    const desktopMonthlyDigest = page.locator('.monthly-digest-studio');
    await desktopMonthlyDigest.getByRole('heading', { name: '這個月留下了什麼' }).waitFor({ timeout: 10_000 });
    await desktopMonthlyDigest.getByText('未解鎖 1', { exact: true }).waitFor({ timeout: 10_000 });
    const desktopMonthlyPreviewPromise = context.waitForEvent('page');
    await desktopMonthlyDigest.getByRole('button', { name: '列印／另存摘要' }).click();
    const desktopMonthlyPreview = await desktopMonthlyPreviewPromise;
    await desktopMonthlyPreview.getByRole('button', { name: '列印／另存 PDF' }).waitFor({ timeout: 10_000 });
    assert(await desktopMonthlyPreview.getByText(eventTitle, { exact: true }).isVisible(), '桌面月度摘要未編排已解鎖的私人事件。');
    assert(await desktopMonthlyPreview.getByText(lockedMonthlyTitle, { exact: true }).count() === 0, '桌面月度摘要不應顯示未解鎖膠囊標題。');
    await desktopMonthlyPreview.close();
    findings.checks.push('desktop private monthly digest print and capsule masking');
    const desktopOnThisDay = page.locator('.on-this-day-card');
    await desktopOnThisDay.getByRole('heading', { name: 'N 年前的今天' }).waitFor({ timeout: 10_000 });
    await desktopOnThisDay.getByText(anniversaryTitle, { exact: true }).waitFor({ timeout: 10_000 });
    assert(await desktopOnThisDay.getByText(anniversaryTitle, { exact: true }).isVisible(), '桌面同日回憶卡未顯示已解鎖的私人事件。');
    assert(await desktopOnThisDay.getByText(lockedAnniversaryTitle, { exact: true }).count() === 0, '桌面同日回憶卡不應顯示未解鎖膠囊標題。');
    await desktopOnThisDay.getByRole('button', { name: '開啟這筆記錄' }).click();
    await page.locator('.preview-card h3').getByText(anniversaryTitle, { exact: true }).waitFor({ timeout: 10_000 });
    findings.checks.push('desktop on-this-day private card and capsule masking');
    const desktopVoiceDiary = page.locator('.voice-diary');
    await desktopVoiceDiary.scrollIntoViewIfNeeded();
    await desktopVoiceDiary.getByText('VOICE DIARY / PRIVATE').waitFor({ timeout: 10_000 });
    assert(await desktopVoiceDiary.getByRole('button', { name: '開始錄音' }).isVisible(), '桌面私人事件未提供語音錄製入口。');
    assert(await desktopVoiceDiary.getByRole('status').getByText('尚未有待上傳的錄音。').isVisible(), '桌面語音日記未提供未上傳狀態回饋。');
    if (process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH) {
      await desktopVoiceDiary.screenshot({ path: process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH });
    }
    findings.checks.push('desktop private voice diary privacy entry');

    const desktopHeartReaction = page.locator('.event-reaction-options button').filter({ hasText: '心意' });
    await desktopHeartReaction.waitFor({ timeout: 10_000 });
    assert(await desktopHeartReaction.getAttribute('aria-pressed') === 'false', '桌面家庭反應不應預設選取。');
    await desktopHeartReaction.click();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.event-reaction-options button')).some((button) => button.textContent?.includes('心意') && button.getAttribute('aria-pressed') === 'true'), undefined, { timeout: 10_000 });
    findings.checks.push('desktop private family reaction toggle');

    const printPreviewPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'A5 書冊預覽' }).click();
    const printPreview = await printPreviewPromise;
    await printPreview.getByRole('button', { name: '列印／另存 PDF' }).waitFor({ timeout: 10_000 });
    assert(await printPreview.getByText(eventTitle, { exact: true }).isVisible(), 'A5 書冊未編排目前的私有事件。');
    if (process.env.CHRONICLE_E2E_PRINT_SCREENSHOT_PATH) {
      await printPreview.screenshot({ path: process.env.CHRONICLE_E2E_PRINT_SCREENSHOT_PATH, fullPage: true });
    }
    await printPreview.close();
    findings.checks.push('desktop private A5 print book preview');

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: '成長數據索引' }).waitFor({ timeout: 10_000 });
    await page.getByRole('img', { name: '私有事件的每月紀錄密度圖' }).waitFor({ timeout: 10_000 });
    await page.getByText('行動驗證', { exact: true }).waitFor({ timeout: 10_000 });
    assert(await page.getByText('僅計入 private 範圍').isVisible(), '桌面儀表板未明確揭露 private 資料範圍。');
    if (process.env.CHRONICLE_E2E_SCREENSHOT_PATH) {
      await page.screenshot({ path: process.env.CHRONICLE_E2E_SCREENSHOT_PATH, fullPage: true });
    }
    findings.checks.push('desktop private growth dashboard');
  } else {
  await page.reload({ waitUntil: 'domcontentloaded' });
  const mobileFutureLetters = page.locator('.future-letters-studio');
  await mobileFutureLetters.getByRole('heading', { name: '寫給以後的自己' }).waitFor({ timeout: 10_000 });
  assert(await mobileFutureLetters.getByText(readyFutureLetterTitle, { exact: true }).isVisible(), '行動版未來信件索引未顯示已解鎖事件。');
  assert(await mobileFutureLetters.getByText(lockedMonthlyTitle, { exact: true }).count() === 0, '行動版未來信件索引不應顯示鎖定膠囊標題。');
  const mobileReadyLetter = mobileFutureLetters.getByText(readyFutureLetterTitle, { exact: true }).locator('..');
  await mobileReadyLetter.getByRole('button', { name: '開啟這封信' }).click();
  await page.locator('#mobile-workspace-preview').getByRole('heading', { name: readyFutureLetterTitle, exact: true }).waitFor({ timeout: 10_000 });
  findings.checks.push('375px private future letters index and capsule masking');
  const mobileMonthlyDigest = page.locator('.monthly-digest-studio');
  await mobileMonthlyDigest.getByRole('heading', { name: '這個月留下了什麼' }).waitFor({ timeout: 10_000 });
  await mobileMonthlyDigest.getByText('未解鎖 1', { exact: true }).waitFor({ timeout: 10_000 });
  const mobileMonthlyPreviewPromise = context.waitForEvent('page');
  await mobileMonthlyDigest.getByRole('button', { name: '列印／另存摘要' }).click();
  const mobileMonthlyPreview = await mobileMonthlyPreviewPromise;
  await mobileMonthlyPreview.getByRole('button', { name: '列印／另存 PDF' }).waitFor({ timeout: 10_000 });
  assert(await mobileMonthlyPreview.getByText(eventTitle, { exact: true }).isVisible(), '行動版月度摘要未編排已解鎖的私人事件。');
  assert(await mobileMonthlyPreview.getByText(lockedMonthlyTitle, { exact: true }).count() === 0, '行動版月度摘要不應顯示未解鎖膠囊標題。');
  await mobileMonthlyPreview.close();
  findings.checks.push('375px private monthly digest print and capsule masking');
  const mobileOnThisDay = page.locator('.on-this-day-card');
  await mobileOnThisDay.getByRole('heading', { name: 'N 年前的今天' }).waitFor({ timeout: 10_000 });
  await mobileOnThisDay.getByText(anniversaryTitle, { exact: true }).waitFor({ timeout: 10_000 });
  assert(await mobileOnThisDay.getByText(anniversaryTitle, { exact: true }).isVisible(), '行動版同日回憶卡未顯示已解鎖的私人事件。');
  assert(await mobileOnThisDay.getByText(lockedAnniversaryTitle, { exact: true }).count() === 0, '行動版同日回憶卡不應顯示未解鎖膠囊標題。');
  await mobileOnThisDay.getByRole('button', { name: '開啟這筆記錄' }).click();
  await page.locator('#mobile-workspace-preview').getByRole('heading', { name: anniversaryTitle, exact: true }).waitFor({ timeout: 10_000 });
  findings.checks.push('375px on-this-day private card and capsule masking');
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

  const voiceDiary = page.locator('.voice-diary');
  await voiceDiary.scrollIntoViewIfNeeded();
  await voiceDiary.getByText('VOICE DIARY / PRIVATE').waitFor({ timeout: 10_000 });
  assert(await voiceDiary.getByText('錄音會先保存在這台裝置').isVisible(), '語音日記未說明本機優先保存。');
  assert(await voiceDiary.getByRole('button', { name: '開始錄音' }).isVisible(), '私人事件未提供語音錄製入口。');
  assert(await voiceDiary.getByRole('checkbox').count() === 0, '沒有待上傳錄音時不應顯示轉寫同意控制項。');
  assert(await voiceDiary.getByRole('status').getByText('尚未有待上傳的錄音。').isVisible(), '語音日記未提供未上傳狀態回饋。');
  if (process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH) {
    await voiceDiary.screenshot({ path: process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH });
  }
  findings.checks.push('375px private voice diary privacy entry');

  const heartReaction = page.locator('.event-reaction-options button').filter({ hasText: '心意' });
  await heartReaction.waitFor({ timeout: 10_000 });
  assert(await heartReaction.getAttribute('aria-pressed') === 'false', '家庭反應不應在沒有真實使用者動作時預設選取。');
  await heartReaction.click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.event-reaction-options button')).some((button) => button.textContent?.includes('心意') && button.getAttribute('aria-pressed') === 'true'), undefined, { timeout: 10_000 });
  assert(await heartReaction.getAttribute('aria-pressed') === 'true', '私人事件的家庭反應未保存目前帳號的選擇。');
  if (process.env.CHRONICLE_E2E_REACTION_SCREENSHOT_PATH) {
    await page.locator('.event-reactions').screenshot({ path: process.env.CHRONICLE_E2E_REACTION_SCREENSHOT_PATH });
  }
  findings.checks.push('375px private family reaction toggle');

  const mobilePrintPreviewPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'A5 書冊預覽' }).click();
  const mobilePrintPreview = await mobilePrintPreviewPromise;
  await mobilePrintPreview.getByRole('button', { name: '列印／另存 PDF' }).waitFor({ timeout: 10_000 });
  assert(await mobilePrintPreview.getByText(eventTitle, { exact: true }).isVisible(), '行動版 A5 書冊未編排目前的私有事件。');
  await mobilePrintPreview.close();
  findings.checks.push('375px private A5 print book preview');

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

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '成長數據索引' }).waitFor({ timeout: 10_000 });
  await page.getByRole('img', { name: '私有事件的每月紀錄密度圖' }).waitFor({ timeout: 10_000 });
  await page.getByText('行動驗證', { exact: true }).waitFor({ timeout: 10_000 });
  assert(await page.getByText('僅計入 private 範圍').isVisible(), '儀表板未明確揭露 private 資料範圍。');
  if (process.env.CHRONICLE_E2E_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.CHRONICLE_E2E_SCREENSHOT_PATH, fullPage: true });
  }
  await page.getByRole('link', { name: '回到成長史' }).first().click();
  await page.getByRole('tab', { name: '索引' }).waitFor({ timeout: 10_000 });
  findings.checks.push('375px private growth dashboard and return navigation');

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
  }
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
