import { statSync } from 'node:fs';
import { chromium } from '@playwright/test';

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為已啟動 local-auth 服務的 HTTPS 網址。');

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

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const email = `editor-export-${Date.now()}@example.test`;
let accountCreated = false;

try {
  await page.goto(`${baseUrl}/editor`, { waitUntil: 'domcontentloaded' });
  const registration = await trpcMutation(page, 'auth.localRegister', {
    name: 'Editor Export Validation',
    email,
    password: 'local-validation-passphrase',
  });
  assert(registration.status === 200, '無法建立隔離 local-auth 帳號。');
  accountCreated = true;

  const eventCreation = await trpcMutation(page, 'diary.createEvent', {
    occurredAt: Date.parse('2026-08-20T00:00:00.000Z'),
    datePrecision: 'day',
    eventType: 'achievement',
    title: '文件匯出按鈕驗證事件',
    body: '只用於實際點擊 DiaryEditor 匯出按鈕的隔離瀏覽器回歸。',
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
  assert(eventCreation.status === 200, '無法建立匯出驗證事件。');

  await page.reload({ waitUntil: 'domcontentloaded' });
  const exportActions = page.locator('.export-actions');
  await exportActions.getByRole('button', { name: '匯出 PDF' }).waitFor({ timeout: 10_000 });

  const pdfDownload = page.waitForEvent('download');
  await exportActions.getByRole('button', { name: '匯出 PDF' }).click();
  const pdf = await pdfDownload;
  const pdfPath = await pdf.path();
  assert(pdf.suggestedFilename().endsWith('.pdf') && pdfPath && statSync(pdfPath).size > 512, 'DiaryEditor PDF 匯出按鈕未產生非空檔案。');

  const imageDownload = page.waitForEvent('download');
  await exportActions.getByRole('button', { name: '匯出長圖片' }).click();
  const image = await imageDownload;
  const imagePath = await image.path();
  assert(image.suggestedFilename().endsWith('.png') && imagePath && statSync(imagePath).size > 512, 'DiaryEditor 長圖片匯出按鈕未產生非空檔案。');

  console.log('DiaryEditor 匯出按鈕回歸通過：PDF 與長圖片皆由實際按鈕下載成功。');
} finally {
  if (accountCreated) {
    try {
      await trpcMutation(page, 'auth.deleteAccount', { confirmation: '刪除我的帳號' });
    } catch {
      // 保留原始驗證結果；清理帳號屬盡力而為。
    }
  }
  await browser.close();
}
