import { chromium } from '@playwright/test';

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error('請設定 CHRONICLE_E2E_BASE_URL 為 Chronicle 開發站的 HTTPS 網址。');

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '登入', exact: true }).click({ noWaitAfter: true });
  await page.waitForURL((url) => url.pathname === '/app-auth', { timeout: 15_000, waitUntil: 'commit' });

  const destination = new URL(page.url());
  if (destination.searchParams.get('type') !== 'signIn') throw new Error('登入導向缺少 signIn 類型。');
  if (!destination.searchParams.get('appId')) throw new Error('登入導向缺少 appId。');
  if (!destination.searchParams.get('redirectUri')?.endsWith('/api/oauth/callback')) throw new Error('登入導向缺少正確 callback。');
  if (!destination.searchParams.get('state')) throw new Error('登入導向缺少 OAuth state。');

  console.log(JSON.stringify({ status: 'passed', destination: `${destination.origin}${destination.pathname}` }));
} finally {
  await browser.close();
}
