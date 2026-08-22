import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl)
  throw new Error("請設定 CHRONICLE_E2E_BASE_URL 為 Chronicle 開發站網址。");
const title = "手機分享的紀錄";
const text = "這段內容應只進入本機快速草稿。";
const sourceUrl = "https://example.test/shared-item";
const shareUrl = new URL("/quick-note", baseUrl);
shareUrl.searchParams.set("title", title);
shareUrl.searchParams.set("text", text);
shareUrl.searchParams.set("url", sourceUrl);

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
});
const page = await context.newPage();

async function waitForSharedDraft() {
  const draftField = page.getByLabel("快速記事草稿");
  const deadline = Date.now() + 3_000;

  while (Date.now() < deadline) {
    const draft = await draftField.inputValue();
    if (
      draft.includes(title) &&
      draft.includes(text) &&
      draft.includes(sourceUrl)
    ) {
      return draft;
    }
    await page.waitForTimeout(50);
  }

  throw new Error("系統分享內容未合併至快速記事草稿。");
}

try {
  await page.goto(shareUrl.toString(), { waitUntil: "networkidle" });
  await page
    .getByRole("status")
    .getByText("系統分享內容已合併到本機草稿")
    .waitFor();
  await waitForSharedDraft();
  const destination = new URL(page.url());
  if (
    destination.searchParams.has("title") ||
    destination.searchParams.has("text") ||
    destination.searchParams.has("url")
  )
    throw new Error("系統分享參數應在合併本機草稿後自網址移除。");
  const stored = await page.evaluate(() =>
    localStorage.getItem("chronicle.quick-note.v1")
  );
  if (!stored?.includes(text))
    throw new Error("系統分享內容沒有留在本機 quick note storage。");
  console.log(
    JSON.stringify({
      status: "passed",
      route: destination.pathname,
      localOnly: true,
    })
  );
} finally {
  await browser.close();
}
