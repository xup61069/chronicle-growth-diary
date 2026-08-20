import { chromium } from '@playwright/test';
import { statSync } from 'node:fs';

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為正在執行的 HTTPS 網址。');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const exports = await import('/src/lib/diaryExport.ts');
    const article = document.createElement('article');
    article.id = 'document-export-browser-fixture';
    article.style.cssText = 'box-sizing:border-box;width:640px;min-height:420px;padding:48px;background:#f7f4ec;color:#10243a;font:18px serif';
    article.innerHTML = '<h1>Chronicle 匯出驗證</h1><p>此節點只用於實際瀏覽器 PDF 與長圖片下載回歸，不包含帳號、日記或分享資料。</p>';
    document.body.append(article);
    window.__chronicleDocumentExport = { exports, article };
  });

  const pdfDownload = page.waitForEvent('download');
  await page.evaluate(() => window.__chronicleDocumentExport.exports.exportDiaryAsPdf(window.__chronicleDocumentExport.article, 'chronicle-browser-export'));
  const pdf = await pdfDownload;
  assert(pdf.suggestedFilename() === 'chronicle-browser-export.pdf', 'PDF 匯出未產生預期檔名。');
  assert((await pdf.failure()) === null, 'PDF 下載未成功完成。');
  const pdfPath = await pdf.path();
  assert(pdfPath && statSync(pdfPath).size > 512, 'PDF 匯出檔案不存在或內容過小。');

  const imageDownload = page.waitForEvent('download');
  await page.evaluate(() => window.__chronicleDocumentExport.exports.exportDiaryAsLongImage(window.__chronicleDocumentExport.article, 'chronicle-browser-export'));
  const image = await imageDownload;
  assert(image.suggestedFilename() === 'chronicle-browser-export.png', '長圖片匯出未產生預期檔名。');
  assert((await image.failure()) === null, '長圖片下載未成功完成。');
  const imagePath = await image.path();
  assert(imagePath && statSync(imagePath).size > 512, '長圖片匯出檔案不存在或內容過小。');

  console.log('文件匯出瀏覽器回歸通過：動態載入的 PDF 與長圖片皆已產生下載。');
} finally {
  await browser.close();
}
