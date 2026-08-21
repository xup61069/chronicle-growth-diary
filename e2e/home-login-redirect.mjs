import { chromium } from '@playwright/test';

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為 Chronicle 開發站的 HTTPS 網址。');

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '登入', exact: true }).click({ noWaitAfter: true });
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 15_000, waitUntil: 'commit' });

  const destination = new URL(page.url());
  if (!destination.searchParams.get('app_id')) throw new Error('登入導向缺少 app_id。');
  if (!destination.searchParams.get('redirect_url')?.endsWith('/api/oauth/callback')) throw new Error('登入導向缺少正確 callback。');
  if (destination.searchParams.has('appId') || destination.searchParams.has('redirectUri')) throw new Error('登入導向不應使用非標準 camelCase 參數。');
  if (!destination.searchParams.get('state')) throw new Error('登入導向缺少 OAuth state。');

  console.log(JSON.stringify({ status: 'passed', destination: `${destination.origin}${destination.pathname}` }));
} finally {
  await browser.close();
}
