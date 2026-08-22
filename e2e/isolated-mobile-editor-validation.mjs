import { chromium } from '@playwright/test';
import JSZip from 'jszip';

// Usage: AUTH_DRIVER=local must run at an HTTPS origin; provide that origin explicitly.
const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為已啟動 local-auth 服務的 HTTPS 網址。');
const email = `mobile-editor-${Date.now()}@example.test`;
const familyMemberEmail = `family-member-${Date.now()}@example.test`;
const password = 'local-validation-passphrase';
const eventTitle = '375px 工作區驗證事件';
const anniversaryTitle = '兩年前的同日驗證事件';
const lockedAnniversaryTitle = '尚未解鎖的同日膠囊';
const lockedMonthlyTitle = '尚未解鎖的月度膠囊';
const readyFutureLetterTitle = '已解鎖的未來信件';
const today = new Date();
const anniversaryOccurredAt = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate(), 12).getTime();
const viewport = process.env.CHRONICLE_E2E_VIEWPORT === 'desktop' ? { width: 1280, height: 720 } : { width: 375, height: 812 };
const mapPreviewResponse = JSON.stringify([{ result: { data: { json: { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Y6SAAAAAASUVORK5CYII=' } } } }]);

function makeExifJpeg(date = '2026:08:20 09:30:00') {
  const dateBytes = new TextEncoder().encode(`${date}\0`);
  const tiff = new Uint8Array([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x02,
    0x87, 0x69, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x26,
    0x88, 0x25, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x4c,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x90, 0x03, 0x00, 0x02, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x38, 0x00, 0x00, 0x00, 0x00,
    ...dateBytes,
    0x00, 0x04,
    0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x4e, 0x00, 0x00, 0x00,
    0x00, 0x02, 0x00, 0x05, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x82,
    0x00, 0x03, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x45, 0x00, 0x00, 0x00,
    0x00, 0x04, 0x00, 0x05, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x9a,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x19, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x0a,
    0x00, 0x00, 0x00, 0x79, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x21, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00, 0x0a,
  ]);
  const payload = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]);
  const length = payload.length + 2;
  return Buffer.from(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...payload, 0xff, 0xd9]));
}

async function makeJourneyZip() {
  const zip = new JSZip();
  zip.file('entries/e2e-journey.json', JSON.stringify({
    id: 'isolated-journey-entry',
    date_journal: Date.parse('2026-08-22T09:00:00.000Z'),
    text: '<h1>Journey 隔離驗證記事</h1><p>只保留純文字</p>',
    tags: ['遷移'],
    photos: ['private.jpg'],
    lat: 25.03,
    lon: 121.56,
    address: '不得匯入',
  }));
  zip.file('photos/private.jpg', 'raw private bytes');
  return zip.generateAsync({ type: 'nodebuffer' });
}

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

function getTrpcResult(response) {
  return response.body?.[0]?.result?.data?.json;
}

async function seedVoiceDraft(page, eventId) {
  await page.evaluate(async ({ eventId }) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("chronicle-voice-drafts", 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("drafts", "readwrite");
        transaction.objectStore("drafts").put({
          id: `voice-e2e-${eventId}`,
          eventId,
          blob: new Blob(["isolated voice draft"], { type: "audio/webm" }),
          mimeType: "audio/webm",
          fileName: "isolated-voice-draft.webm",
          durationMs: 1_500,
          createdAt: Date.now(),
        });
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  }, { eventId });
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({ viewport });
const page = await context.newPage();
let familyMemberContext;
let familyMemberPage;
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
  const eventId = getTrpcResult(eventCreation)?.id;
  assert(Number.isInteger(eventId), '建立事件回應未提供可用 ID，無法驗證語音本機草稿。');
  await seedVoiceDraft(page, eventId);
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
  const familyInvite = await trpcMutation(page, 'diary.createFamilyInvite', {
    email: familyMemberEmail,
    role: 'commenter',
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
  const familyInviteToken = getTrpcResult(familyInvite)?.token;
  assert(familyInvite.status === 200 && typeof familyInviteToken === 'string', '無法建立隔離家庭邀請。');
  familyMemberContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  familyMemberPage = await familyMemberContext.newPage();
  await familyMemberPage.goto(`${baseUrl}/editor`, { waitUntil: 'domcontentloaded' });
  const familyMemberRegistration = await trpcMutation(familyMemberPage, 'auth.localRegister', {
    name: 'Family Audience Validation',
    email: familyMemberEmail,
    password,
  });
  assert(familyMemberRegistration.status === 200, '無法建立隔離家庭成員帳號。');
  const familyInviteAcceptance = await trpcMutation(familyMemberPage, 'diary.acceptFamilyInvite', { token: familyInviteToken });
  assert(familyInviteAcceptance.status === 200, '隔離家庭成員無法接受邀請。');
  findings.checks.push('accepted isolated family member for audience preview');

  if (viewport.width > 375) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    const desktopBackfillAssistant = page.locator('.backfill-assistant');
    await desktopBackfillAssistant.getByRole('heading', { name: '補回最近的空白' }).waitFor({ timeout: 10_000 });
    assert(await desktopBackfillAssistant.getByText('尚未選取待整理照片').isVisible(), '桌面補記助手在未選照片時應只顯示本機計數狀態。');
    assert(await desktopBackfillAssistant.getByText('僅供 375px 編輯器互動驗證的隔離事件。').count() === 0, '桌面補記助手不應顯示私人事件正文。');
    const highlightAssistant = page.locator('.private-highlight-assistant');
    await highlightAssistant.getByText('AI 精選建議 / PRIVATE REVIEW').waitFor({ timeout: 10_000 });
    const highlightConsent = highlightAssistant.getByRole('checkbox');
    const highlightGenerate = highlightAssistant.getByRole('button', { name: '產生精選候選' });
    assert(await highlightGenerate.isDisabled(), '未逐次同意時不應允許產生 AI 精選候選。');
    await highlightConsent.check();
    assert(!(await highlightGenerate.isDisabled()), '勾選逐次同意後應可手動觸發候選產生。');
    findings.checks.push('desktop owner AI highlight consent gate');
    const fullArchiveDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('full-archive-export').click();
    const fullArchiveDownload = await fullArchiveDownloadPromise;
    assert(fullArchiveDownload.suggestedFilename().endsWith('-full-archive.zip'), '全量封存應下載可攜 ZIP 檔。');
    findings.checks.push('desktop owner full archive ZIP download');
    const photoExifEntry = page.locator('.import-studio').filter({ has: page.getByRole('heading', { name: '從 iPhone 照片資料開始整理' }) });
    await photoExifEntry.getByRole('heading', { name: '從 iPhone 照片資料開始整理' }).waitFor({ timeout: 10_000 });
    await page.locator('input[accept*="image/heic"]').setInputFiles([
      { name: 'without-exif.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: 'captured.jpg', mimeType: 'image/jpeg', buffer: makeExifJpeg() },
      { name: 'captured-nearby.jpg', mimeType: 'image/jpeg', buffer: makeExifJpeg() },
    ]);
    await desktopBackfillAssistant.getByText('目前這批有 3 張照片尚未整理').waitFor({ timeout: 10_000 });
    const photoExifPreview = page.locator('.import-studio').filter({ has: page.getByRole('heading', { name: '確認照片的時間與位置' }) });
    const manualCapturedAt = photoExifPreview.getByLabel('without-exif.jpg 的拍攝日期與時間');
    const exifCapturedAt = photoExifPreview.getByLabel('captured.jpg 的拍攝日期與時間');
    await manualCapturedAt.waitFor({ timeout: 10_000 });
    assert(await manualCapturedAt.inputValue() === '', '缺少 EXIF 的 JPEG 應提供空白的手動日期時間欄位。');
    assert(await photoExifPreview.getByRole('button', { name: '確認建立 1 段私人記錄' }).isDisabled(), '尚未補齊日期時不應允許建立事件。');
    assert(await photoExifPreview.getByLabel('captured.jpg 的緯度').inputValue() === '25.034', '應從標準 JPEG EXIF 本機讀取 GPS 緯度。');
    assert(await photoExifPreview.getByLabel('captured.jpg 的經度').inputValue() === '121.551', '應從標準 JPEG EXIF 本機讀取 GPS 經度。');
    await photoExifPreview.getByLabel('without-exif.jpg 的緯度').fill('25.0478');
    await photoExifPreview.getByLabel('without-exif.jpg 的經度').fill('121.5319');
    await photoExifPreview.getByLabel('選取 without-exif.jpg 以批次套用日期').check();
    await photoExifPreview.getByLabel('選取 captured.jpg 以批次套用日期').check();
    await photoExifPreview.getByLabel('選取 captured-nearby.jpg 以批次套用日期').check();
    await photoExifPreview.getByLabel('批次套用的拍攝日期與時間').fill('2026-08-21T06:30');
    await photoExifPreview.getByLabel('批次套用的遞增秒數').fill('7');
    await photoExifPreview.getByRole('button', { name: '套用至 3 張' }).click();
    assert(await manualCapturedAt.inputValue() === '2026-08-21T06:30', '批次日期套用應填入缺少 EXIF 的照片。');
    assert(await exifCapturedAt.inputValue() === '2026-08-21T06:30:07', '批次日期套用應依指定秒數遞增已選取照片。');
    assert(await photoExifPreview.getByLabel('captured-nearby.jpg 的拍攝日期與時間').inputValue() === '2026-08-21T06:30:14', '第三張照片也應依相同秒數遞增。');
    await photoExifPreview.getByText('2026-08-21', { exact: true }).waitFor({ timeout: 10_000 });
    assert(await photoExifPreview.getByText(/GPS 只在這個瀏覽器讀取.*確認前不會上傳/).isVisible(), '照片 EXIF 匯入預覽未明確說明 GPS 與確認前不上傳的隱私邊界。');
    assert(await photoExifPreview.getByText(/私有座標已帶入/).isVisible(), '手動校正或 EXIF 讀取的 GPS 應標示為 private 事件座標。');
    await page.route('**/api/trpc/photoMap.preview**', (route) => route.fulfill({ contentType: 'application/json', body: mapPreviewResponse }));
    await photoExifPreview.getByRole('button', { name: '確認位置地圖' }).nth(0).click();
    await photoExifPreview.getByRole('img', { name: 'without-exif.jpg 的 GPS 位置地圖預覽' }).waitFor({ timeout: 10_000 });
    const desktopLongitudeBeforeMapDrag = await photoExifPreview.getByLabel('without-exif.jpg 的經度').inputValue();
    await photoExifPreview.getByRole('button', { name: '點選或拖曳 without-exif.jpg 的地圖標記以調整 GPS 位置' }).evaluate((node) => { const bounds = node.getBoundingClientRect(); const point = (type, x) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 23, clientX: bounds.left + bounds.width * x, clientY: bounds.top + bounds.height * .5 })); point('pointerdown', .5); point('pointermove', .75); point('pointerup', .75); });
    assert(await photoExifPreview.getByLabel('without-exif.jpg 的經度').inputValue() !== desktopLongitudeBeforeMapDrag, '桌面地圖拖曳標記應直接更新照片 GPS 經度。');
    assert(await photoExifPreview.getByRole('img', { name: 'without-exif.jpg 的 GPS 位置地圖預覽' }).count() === 0, '桌面地圖拖曳後應使舊位置預覽失效，要求重新確認。');
    await page.unroute('**/api/trpc/photoMap.preview**');
    const desktopDraggedLongitudeE6 = Math.round(Number(await photoExifPreview.getByLabel('without-exif.jpg 的經度').inputValue()) * 1_000_000);
    const desktopDraggedLatitudeE6 = Math.round(Number(await photoExifPreview.getByLabel('without-exif.jpg 的緯度').inputValue()) * 1_000_000);
    let desktopJourneyMapRequestCount = 0;
    await page.route('**/api/trpc/photoMap.preview**', (route) => { desktopJourneyMapRequestCount += 1; return route.fulfill({ contentType: 'application/json', body: mapPreviewResponse }); });
    await photoExifPreview.getByRole('button', { name: '分析這批照片' }).click();
    const desktopJourneyCandidate = photoExifPreview.getByTestId('photo-journey-candidate');
    await desktopJourneyCandidate.waitFor({ timeout: 10_000 });
    assert(desktopJourneyMapRequestCount === 0, '旅程候選分析只能在瀏覽器計算，不應自動請求地圖。');
    await desktopJourneyCandidate.getByLabel(/旅程開始時間/).fill('2026-08-21T06:00');
    await desktopJourneyCandidate.getByLabel(/旅程結束時間/).fill('2026-08-21T08:00');
    await desktopJourneyCandidate.getByLabel(/旅程封面照片/).selectOption({ label: 'captured-nearby.jpg' });
    await desktopJourneyCandidate.getByRole('checkbox').check();
    await desktopJourneyCandidate.getByRole('button', { name: '顯示地圖' }).click();
    await desktopJourneyCandidate.getByRole('img', { name: /旅程候選中心位置地圖預覽/ }).waitFor({ timeout: 10_000 });
    assert(desktopJourneyMapRequestCount === 1, '旅程候選地圖只能在擁有者明確點擊後請求一次。');
    await page.unroute('**/api/trpc/photoMap.preview**');
    const desktopPhotoCreatePayloads = [];
    const desktopJourneyDetailPayloads = [];
    await page.route('**/api/trpc/diary.createEvent**', async (route) => { desktopPhotoCreatePayloads.push(route.request().postData() ?? ''); await route.continue(); });
    await page.route('**/api/trpc/diary.saveJourneyDetails**', async (route) => { desktopJourneyDetailPayloads.push(route.request().postData() ?? ''); await route.continue(); });
    let releaseUpload;
    let noteUploadStarted;
    const uploadStarted = new Promise((resolve) => { noteUploadStarted = resolve; });
    const allowUpload = new Promise((resolve) => { releaseUpload = resolve; });
    await page.route('**/api/trpc/diary.uploadImage**', async (route) => {
      noteUploadStarted();
      await allowUpload;
      await route.continue();
    });
    await photoExifPreview.getByRole('button', { name: '確認建立 1 段私人記錄' }).click();
    await uploadStarted;
    assert(await photoExifPreview.getByRole('progressbar', { name: '照片上傳進度' }).isVisible(), '批次上傳時應顯示可及進度條。');
    assert(await photoExifPreview.getByText('正在上傳 0／3 張', { exact: true }).isVisible(), '批次上傳應顯示目前完成張數。');
    if (process.env.CHRONICLE_E2E_PHOTO_IMPORT_SCREENSHOT_PATH) {
      await photoExifPreview.screenshot({ path: process.env.CHRONICLE_E2E_PHOTO_IMPORT_SCREENSHOT_PATH });
    }
    releaseUpload();
    await page.getByText('已建立 1 段私人照片記錄。', { exact: true }).waitFor({ timeout: 20_000 });
    await page.unroute('**/api/trpc/diary.uploadImage**');
    assert(desktopPhotoCreatePayloads.length === 1 && desktopPhotoCreatePayloads[0].includes('照片旅程候選') && desktopPhotoCreatePayloads[0].includes('private'), '已選旅程候選應只建立一段 private 事件，且不與原日期群組重複。');
    assert(desktopJourneyDetailPayloads.length === 1 && desktopJourneyDetailPayloads[0].includes('2026') === false, '已選旅程候選應在圖片上傳後只保存一次數字化 private 範圍與封面媒體 ID。');
    await page.unroute('**/api/trpc/diary.createEvent**');
    await page.unroute('**/api/trpc/diary.saveJourneyDetails**');
    findings.checks.push('desktop photo EXIF GPS preview, editable local journey range and cover, explicit map request, correction, batch date apply, privacy boundary, upload progress and private event creation');
    const dayOneImport = page.locator('.day-one-import');
    await dayOneImport.getByRole('heading', { name: '先審核，再帶入 Day One 日記' }).waitFor({ timeout: 10_000 });
    let dayOneImportRequestCount = 0;
    await page.route('**/api/trpc/diary.importEvents**', async (route) => { dayOneImportRequestCount += 1; await route.continue(); });
    await dayOneImport.locator('input[type="file"]').setInputFiles({ name: 'Journal.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ entries: [{ uuid: 'e2e-day-one', creationDate: '2026-08-22T09:00:00Z', text: 'Day One 隔離驗證記事', tags: ['遷移'] }] })) });
    await dayOneImport.getByTestId('day-one-import-preview').waitFor({ timeout: 10_000 });
    assert(dayOneImportRequestCount === 0, 'Day One 解析後未確認前不得建立任何事件。');
    await dayOneImport.getByRole('button', { name: '確認建立 1 段 private 記錄' }).click();
    await page.getByText('已建立 1 段 private Day One 記錄。', { exact: true }).waitFor({ timeout: 10_000 });
    assert(dayOneImportRequestCount === 1, 'Day One 只能在明確確認後呼叫一次 private 匯入。');
    await page.unroute('**/api/trpc/diary.importEvents**');
    const journeyImport = page.locator('.journey-import');
    await journeyImport.getByRole('heading', { name: '先審核，再帶入 Journey 日記' }).waitFor({ timeout: 10_000 });
    let journeyImportRequestCount = 0;
    const journeyImportPayloads = [];
    await page.route('**/api/trpc/diary.importEvents**', async (route) => { journeyImportRequestCount += 1; journeyImportPayloads.push(route.request().postData() ?? ''); await route.continue(); });
    await journeyImport.locator('input[type="file"]').setInputFiles({ name: 'journey-e2e.zip', mimeType: 'application/zip', buffer: await makeJourneyZip() });
    await journeyImport.getByTestId('journey-import-preview').waitFor({ timeout: 10_000 });
    assert(journeyImportRequestCount === 0, 'Journey ZIP 解析後未確認前不得建立任何事件。');
    const journeyTitleInput = journeyImport.getByLabel(/Journey 草稿標題/);
    const journeyDateInput = journeyImport.getByLabel(/Journey 草稿日期/);
    assert(await journeyTitleInput.inputValue() === 'Journey 隔離驗證記事', 'Journey 本機預覽應只將已轉為純文字的候選標題帶入可編輯草稿。');
    await journeyTitleInput.fill('暫時標題');
    await journeyImport.getByRole('button', { name: '重設此筆' }).click();
    assert(await journeyTitleInput.inputValue() === 'Journey 隔離驗證記事', 'Journey 草稿重設必須回到 parser 產生的標題，且不能重新讀取 ZIP。');
    await journeyTitleInput.fill('Journey 自訂標題');
    await journeyDateInput.fill('2026-08-23T10:30');
    assert(journeyImportRequestCount === 0, 'Journey 標題或日期微調不得在確認前建立事件。');
    await journeyImport.getByRole('button', { name: '確認建立 1 段 private 記錄' }).click();
    await page.getByText('已建立 1 段 private Journey 記錄。', { exact: true }).waitFor({ timeout: 10_000 });
    assert(journeyImportRequestCount === 1 && journeyImportPayloads[0]?.includes('private') && journeyImportPayloads[0]?.includes('Journey 自訂標題') && !journeyImportPayloads[0]?.includes('不得匯入'), 'Journey 只能在明確確認後建立 private 事件，並只帶入已審核的標題／日期，不可包含地址或來源 metadata。');
    await page.unroute('**/api/trpc/diary.importEvents**');
    await page.reload({ waitUntil: 'domcontentloaded' });
    const familyMilestones = page.locator('.family-milestone-layer');
    await familyMilestones.getByRole('heading', { name: '把要一起記得的事，另寫成家庭大事記' }).waitFor({ timeout: 10_000 });
    await familyMilestones.getByRole('button', { name: '新增大事記' }).click();
    await familyMilestones.getByLabel('家庭大事記日期', { exact: true }).fill('2026-08-22');
    await familyMilestones.getByLabel('家庭大事記標題').fill('家庭旅程摘要');
    await familyMilestones.getByLabel('家庭大事記短摘要').fill('只分享給已接受邀請家人的短摘要。');
    assert(await familyMilestones.getByRole('radio', { name: '指定已接受的家庭成員' }).isChecked(), '新建家庭大事記應預設採指定成員模式。');
    assert(await familyMilestones.getByRole('button', { name: '加入 family-only 圖層' }).isDisabled(), '未選擇成員時不得建立指定成員大事記。');
    if (process.env.CHRONICLE_E2E_FAMILY_AUDIENCE_SCREENSHOT_PATH) {
      await familyMilestones.screenshot({ path: process.env.CHRONICLE_E2E_FAMILY_AUDIENCE_SCREENSHOT_PATH });
    }
    await familyMilestones.getByLabel('選擇 Family Audience Validation').check();
    let familyCreateRequestCount = 0;
    await page.route('**/api/trpc/diary.createFamilyMilestone**', async (route) => { familyCreateRequestCount += 1; await route.continue(); });
    await familyMilestones.getByRole('button', { name: '加入 family-only 圖層' }).click();
    await familyMilestones.getByText('家庭旅程摘要', { exact: true }).waitFor({ timeout: 10_000 });
    assert(familyCreateRequestCount === 1, '新建家庭大事記不需受眾預覽，應直接以 owner 明確選取的成員建立。');
    await page.unroute('**/api/trpc/diary.createFamilyMilestone**');
    assert(await familyMilestones.getByText('只分享給已接受邀請家人的短摘要。', { exact: true }).isVisible(), '家庭大事記應只顯示 owner 明確填寫的摘要。');
    let familyUpdateRequestCount = 0;
    await page.route('**/api/trpc/diary.updateFamilyMilestone**', async (route) => { familyUpdateRequestCount += 1; await route.continue(); });
    await familyMilestones.getByRole('button', { name: '編輯' }).first().click();
    await familyMilestones.getByRole('radio', { name: /所有已接受的家庭成員/ }).check();
    await familyMilestones.getByRole('button', { name: '更新摘要' }).click();
    const audiencePreview = familyMilestones.getByRole('dialog', { name: '家庭大事記受眾變更預覽' });
    await audiencePreview.getByRole('heading', { name: '先確認誰會看到這筆摘要' }).waitFor({ timeout: 10_000 });
    assert(familyUpdateRequestCount === 0, '受眾變更預覽出現前不得送出更新 mutation。');
    assert(await audiencePreview.getByText('Family Audience Validation', { exact: true }).count() >= 2, '受眾預覽必須同時列出目前與提議的有效成員。');
    assert(await audiencePreview.locator('.family-audience-scope-current').count() === 1 && await audiencePreview.locator('.family-audience-scope-proposed').count() === 1, '受眾預覽必須以目前／提議範圍的非僅色彩視覺群組呈現。');
    assert(await audiencePreview.getByText('範圍規則調整', { exact: false }).isVisible(), '有效受眾相同但政策改變時，預覽必須清楚標示未來規則差異。');
    if (process.env.CHRONICLE_E2E_AUDIENCE_PREVIEW_SCREENSHOT_PATH) await audiencePreview.screenshot({ path: process.env.CHRONICLE_E2E_AUDIENCE_PREVIEW_SCREENSHOT_PATH });
    await audiencePreview.getByRole('button', { name: '確認變更' }).click();
    await page.getByText('已更新 family-only 大事記摘要。', { exact: true }).waitFor({ timeout: 10_000 });
    assert(familyUpdateRequestCount === 1, '只有 owner 第二次確認受眾變更後才可更新 family-only 摘要。');
    const audienceAudit = familyMilestones.locator('.family-audience-audit');
    await audienceAudit.locator('summary').click();
    await audienceAudit.getByText('已確認受眾範圍變更', { exact: true }).waitFor({ timeout: 10_000 });
    assert((await audienceAudit.innerText()).includes('大事記 #') && !(await audienceAudit.innerText()).includes('家庭旅程摘要') && !(await audienceAudit.innerText()).includes('Family Audience Validation'), 'owner 受眾稽核檢視只能顯示時間、動作與識別碼，不可投影摘要或成員資料。');
    await page.unroute('**/api/trpc/diary.updateFamilyMilestone**');
    findings.checks.push('desktop Day One and editable Journey local review confirmation, private import, family-only summary, semantic two-step audience preview and minimum owner audit');
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
    const desktopRecallCheck = page.locator('.recall-check-studio');
    await desktopRecallCheck.getByRole('heading', { name: '每日回憶檢查' }).waitFor({ timeout: 10_000 });
    const desktopRecallToggle = desktopRecallCheck.getByRole('checkbox');
    assert(await desktopRecallToggle.isChecked() === false, '桌面每日回憶檢查必須預設關閉。');
    assert(await desktopRecallCheck.getByRole('button', { name: '立即檢查' }).isDisabled(), '未啟用時不應允許手動檢查。');
    assert(await desktopRecallCheck.getByText(/不寄送 Email、不推播、不保存日記內容、標題、照片或地點/).isVisible(), '桌面每日檢查未明確說明無外送內容的隱私邊界。');
    await desktopRecallToggle.click();
    await page.getByText(/每日回憶檢查必須在網站發布後才能開啟/).waitFor({ timeout: 10_000 });
    assert(await desktopRecallToggle.isChecked() === false, '開發預覽不應建立每日排程或變更啟用狀態。');
    findings.checks.push('desktop recall check default-off and unpublished safety boundary');
    await page.locator('.event-list button').filter({ hasText: eventTitle }).click();
    await page.locator('.preview-card h3').getByText(eventTitle, { exact: true }).waitFor({ timeout: 10_000 });
    const desktopVoiceDiary = page.locator('.voice-diary');
    await desktopVoiceDiary.scrollIntoViewIfNeeded();
    await desktopVoiceDiary.getByText('VOICE DIARY / PRIVATE').waitFor({ timeout: 10_000 });
    assert(await desktopVoiceDiary.getByRole('button', { name: '開始錄音' }).isVisible(), '桌面私人事件未提供語音錄製入口。');
    await desktopVoiceDiary.getByText('isolated-voice-draft.webm', { exact: true }).waitFor({ timeout: 10_000 });
    const desktopVoiceConsent = desktopVoiceDiary.getByRole('checkbox');
    const desktopVoiceUpload = desktopVoiceDiary.getByRole('button', { name: '上傳並轉寫' });
    assert(await desktopVoiceConsent.isChecked() === false, '桌面語音草稿的轉寫同意不可預設勾選。');
    assert(await desktopVoiceUpload.isDisabled(), '桌面未同意時不可啟用語音上傳。');
    await desktopVoiceConsent.check();
    assert(await desktopVoiceUpload.isEnabled(), '桌面同意後應啟用語音上傳入口。');
    await desktopVoiceDiary.getByRole('button', { name: '移除本機草稿' }).click();
    await desktopVoiceDiary.getByText('尚未有待上傳的錄音。').waitFor({ timeout: 10_000 });
    assert(await desktopVoiceDiary.getByRole('checkbox').count() === 0, '桌面移除最後一段本機草稿後應收起同意控制項。');
    if (process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH) {
      await desktopVoiceDiary.screenshot({ path: process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH });
    }
    findings.checks.push('desktop private voice diary consent, upload gating, and local draft deletion');

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
  const mobileBackfillAssistant = page.locator('.backfill-assistant');
  await mobileBackfillAssistant.getByRole('heading', { name: '補回最近的空白' }).waitFor({ timeout: 10_000 });
  assert(await mobileBackfillAssistant.getByText('尚未選取待整理照片').isVisible(), '行動版補記助手在未選照片時應只顯示本機計數狀態。');
  assert(await mobileBackfillAssistant.getByText('僅供 375px 編輯器互動驗證的隔離事件。').count() === 0, '行動版補記助手不應顯示私人事件正文。');
  const mobilePhotoExifEntry = page.locator('.import-studio').filter({ has: page.getByRole('heading', { name: '從 iPhone 照片資料開始整理' }) });
  await mobilePhotoExifEntry.getByRole('heading', { name: '從 iPhone 照片資料開始整理' }).waitFor({ timeout: 10_000 });
  await page.locator('input[accept*="image/heic"]').setInputFiles([
    { name: 'without-exif-mobile.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
    { name: 'captured-mobile.jpg', mimeType: 'image/jpeg', buffer: makeExifJpeg() },
  ]);
  await mobileBackfillAssistant.getByText('目前這批有 2 張照片尚未整理').waitFor({ timeout: 10_000 });
  const mobilePhotoExifPreview = page.locator('.import-studio').filter({ has: page.getByRole('heading', { name: '確認照片的時間與位置' }) });
  await mobilePhotoExifPreview.getByText('2026-08-20', { exact: true }).waitFor({ timeout: 10_000 });
  const mobileManualCapturedAt = mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的拍攝日期與時間');
  const mobileCapturedAt = mobilePhotoExifPreview.getByLabel('captured-mobile.jpg 的拍攝日期與時間');
  assert(await mobileManualCapturedAt.inputValue() === '', '行動版缺少 EXIF 的 JPEG 應提供空白手動日期時間欄位。');
  assert(await mobilePhotoExifPreview.getByRole('button', { name: '確認建立 1 段私人記錄' }).isDisabled(), '行動版未補齊日期時不應允許建立事件。');
  assert(await mobilePhotoExifPreview.getByLabel('captured-mobile.jpg 的緯度').inputValue() === '25.034', '行動版應從標準 JPEG EXIF 本機讀取 GPS 緯度。');
  await mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的緯度').fill('25.0478');
  await mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的經度').fill('121.5319');
  await mobilePhotoExifPreview.getByLabel('選取 without-exif-mobile.jpg 以批次套用日期').check();
  await mobilePhotoExifPreview.getByLabel('選取 captured-mobile.jpg 以批次套用日期').check();
  await mobilePhotoExifPreview.getByLabel('批次套用的拍攝日期與時間').fill('2026-08-20T11:30');
  await mobilePhotoExifPreview.getByLabel('批次套用的遞增秒數').fill('5');
  await mobilePhotoExifPreview.getByRole('button', { name: '套用至 2 張' }).click();
  assert(await mobileManualCapturedAt.inputValue() === '2026-08-20T11:30', '行動版批次日期套用應填入缺少 EXIF 的照片。');
  assert(await mobileCapturedAt.inputValue() === '2026-08-20T11:30:05', '行動版批次日期套用應依指定秒數遞增。');
  assert(await mobilePhotoExifPreview.getByText(/GPS 只在這個瀏覽器讀取.*確認前不會上傳/).isVisible(), '行動版照片預覽未明確說明 GPS 與確認前不上傳的隱私邊界。');
  assert(await mobilePhotoExifPreview.getByText(/私有座標已帶入/).isVisible(), '行動版應標示 GPS 僅會帶入 private 事件。');
  await page.route('**/api/trpc/photoMap.preview**', (route) => route.fulfill({ contentType: 'application/json', body: mapPreviewResponse }));
  await mobilePhotoExifPreview.getByRole('button', { name: '確認位置地圖' }).nth(0).click();
  await mobilePhotoExifPreview.getByRole('img', { name: 'without-exif-mobile.jpg 的 GPS 位置地圖預覽' }).waitFor({ timeout: 10_000 });
  const mobileLongitudeBeforeMapDrag = await mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的經度').inputValue();
  await mobilePhotoExifPreview.getByRole('button', { name: '點選或拖曳 without-exif-mobile.jpg 的地圖標記以調整 GPS 位置' }).evaluate((node) => { const bounds = node.getBoundingClientRect(); const point = (type, x) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 31, clientX: bounds.left + bounds.width * x, clientY: bounds.top + bounds.height * .5 })); point('pointerdown', .5); point('pointermove', .72); point('pointerup', .72); });
  assert(await mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的經度').inputValue() !== mobileLongitudeBeforeMapDrag, '行動版地圖拖曳標記應直接更新照片 GPS 經度。');
  assert(await mobilePhotoExifPreview.getByRole('img', { name: 'without-exif-mobile.jpg 的 GPS 位置地圖預覽' }).count() === 0, '行動版地圖拖曳後應使舊位置預覽失效，要求重新確認。');
  await page.unroute('**/api/trpc/photoMap.preview**');
  const mobileDraggedLongitudeE6 = Math.round(Number(await mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的經度').inputValue()) * 1_000_000);
  const mobileDraggedLatitudeE6 = Math.round(Number(await mobilePhotoExifPreview.getByLabel('without-exif-mobile.jpg 的緯度').inputValue()) * 1_000_000);
  const mobilePhotoCreatePayloads = [];
  await page.route('**/api/trpc/diary.createEvent**', async (route) => { mobilePhotoCreatePayloads.push(route.request().postData() ?? ''); await route.continue(); });
  let releaseMobileUpload;
  let noteMobileUploadStarted;
  const mobileUploadStarted = new Promise((resolve) => { noteMobileUploadStarted = resolve; });
  const allowMobileUpload = new Promise((resolve) => { releaseMobileUpload = resolve; });
  await page.route('**/api/trpc/diary.uploadImage**', async (route) => {
    noteMobileUploadStarted();
    await allowMobileUpload;
    await route.continue();
  });
  await mobilePhotoExifPreview.getByRole('button', { name: '確認建立 1 段私人記錄' }).click();
  await mobileUploadStarted;
  assert(await mobilePhotoExifPreview.getByRole('progressbar', { name: '照片上傳進度' }).isVisible(), '行動版批次上傳時應顯示可及進度條。');
  assert(await mobilePhotoExifPreview.getByText('正在上傳 0／2 張', { exact: true }).isVisible(), '行動版批次上傳應顯示目前完成張數。');
  assert(await mobilePhotoExifPreview.getByText('目前處理：without-exif-mobile.jpg', { exact: true }).isVisible(), '行動版批次上傳應顯示目前處理的檔名。');
  releaseMobileUpload();
  await page.getByText('已建立 1 段私人照片記錄。', { exact: true }).waitFor({ timeout: 20_000 });
  await page.unroute('**/api/trpc/diary.uploadImage**');
  assert(mobilePhotoCreatePayloads.some((payload) => payload.includes(String(mobileDraggedLatitudeE6)) && payload.includes(String(mobileDraggedLongitudeE6))), '行動版地圖拖曳後建立的 private 事件應使用更新的 GPS 座標。');
  await page.unroute('**/api/trpc/diary.createEvent**');
  findings.checks.push('375px photo EXIF GPS map preview and correction, incremented batch date apply, privacy boundary, upload progress and private event creation');
  let mobileJourneyMapRequestCount = 0;
  let mobileJourneyCreateRequestCount = 0;
  await page.route('**/api/trpc/photoMap.preview**', (route) => { mobileJourneyMapRequestCount += 1; return route.fulfill({ contentType: 'application/json', body: mapPreviewResponse }); });
  await page.route('**/api/trpc/diary.createEvent**', async (route) => { mobileJourneyCreateRequestCount += 1; await route.continue(); });
  await page.locator('input[accept*="image/heic"]').setInputFiles([
    { name: 'journey-mobile-one.jpg', mimeType: 'image/jpeg', buffer: makeExifJpeg() },
    { name: 'journey-mobile-two.jpg', mimeType: 'image/jpeg', buffer: makeExifJpeg() },
    { name: 'journey-mobile-three.jpg', mimeType: 'image/jpeg', buffer: makeExifJpeg() },
  ]);
  const mobileJourneyPreview = page.locator('.import-studio').filter({ has: page.getByRole('heading', { name: '確認照片的時間與位置' }) });
  await mobileJourneyPreview.getByRole('button', { name: '分析這批照片' }).click();
  await mobileJourneyPreview.getByTestId('photo-journey-candidate').waitFor({ timeout: 10_000 });
  assert(mobileJourneyMapRequestCount === 0 && mobileJourneyCreateRequestCount === 0, '375px 旅程候選分析前不得請求地圖、建立事件或上傳附件。');
  await mobileJourneyPreview.getByRole('button', { name: '取消' }).click();
  await page.unroute('**/api/trpc/photoMap.preview**');
  await page.unroute('**/api/trpc/diary.createEvent**');
  findings.checks.push('375px local journey candidate explicit analysis with no automatic map or event request');
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
  const mobileRecallCheck = page.locator('.recall-check-studio');
  await mobileRecallCheck.getByRole('heading', { name: '每日回憶檢查' }).waitFor({ timeout: 10_000 });
  const mobileRecallToggle = mobileRecallCheck.getByRole('checkbox');
  assert(await mobileRecallToggle.isChecked() === false, '行動版每日回憶檢查必須預設關閉。');
  assert(await mobileRecallCheck.getByRole('button', { name: '立即檢查' }).isDisabled(), '行動版未啟用時不應允許手動檢查。');
  assert(await mobileRecallCheck.getByText(/不寄送 Email、不推播、不保存日記內容、標題、照片或地點/).isVisible(), '行動版每日檢查未明確說明無外送內容的隱私邊界。');
  await mobileRecallToggle.click();
  await page.getByText(/每日回憶檢查必須在網站發布後才能開啟/).waitFor({ timeout: 10_000 });
  assert(await mobileRecallToggle.isChecked() === false, '行動版開發預覽不應建立每日排程或變更啟用狀態。');
  findings.checks.push('375px recall check default-off and unpublished safety boundary');
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
  await voiceDiary.getByText('isolated-voice-draft.webm', { exact: true }).waitFor({ timeout: 10_000 });
  const mobileVoiceConsent = voiceDiary.getByRole('checkbox');
  const mobileVoiceUpload = voiceDiary.getByRole('button', { name: '上傳並轉寫' });
  assert(await mobileVoiceConsent.isChecked() === false, '行動版語音草稿的轉寫同意不可預設勾選。');
  assert(await mobileVoiceUpload.isDisabled(), '行動版未同意時不可啟用語音上傳。');
  await mobileVoiceConsent.check();
  assert(await mobileVoiceUpload.isEnabled(), '行動版同意後應啟用語音上傳入口。');
  await voiceDiary.getByRole('button', { name: '移除本機草稿' }).click();
  await voiceDiary.getByText('尚未有待上傳的錄音。').waitFor({ timeout: 10_000 });
  assert(await voiceDiary.getByRole('checkbox').count() === 0, '行動版移除最後一段本機草稿後應收起同意控制項。');
  if (process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH) {
    await voiceDiary.screenshot({ path: process.env.CHRONICLE_E2E_VOICE_SCREENSHOT_PATH });
  }
  findings.checks.push('375px private voice diary consent, upload gating, and local draft deletion');

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
  const titleInput = page.getByPlaceholder('例如：第一次站上舞台');
  await titleInput.waitFor({ timeout: 10_000 });
  const dateInput = page.locator('.event-form input[type="date"]').first();
  const dateBeforeTemplate = await dateInput.inputValue();
  const milestonePicker = page.locator('.milestone-template-picker');
  await milestonePicker.getByRole('button', { name: '開始一項新練習' }).click();
  assert(await titleInput.inputValue() === '開始練習＿＿＿', '里程碑範本未填入可編輯的建議標題。');
  assert(await dateInput.inputValue() === dateBeforeTemplate, '里程碑範本不應改變使用者已選日期。');
  assert((await page.locator('.event-form textarea').first().inputValue()).includes('為什麼想開始？'), '里程碑範本未加入本機寫作提示。');
  findings.checks.push('375px new event entry');
  findings.checks.push('375px editable growth milestone template');

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
  if (familyMemberPage) {
    try {
      await trpcMutation(familyMemberPage, 'auth.deleteAccount', { confirmation: '刪除我的帳號' });
    } catch {
      // 保留原始失敗原因，但盡力清理隔離家庭成員帳號。
    }
  }
  await familyMemberContext?.close();
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
