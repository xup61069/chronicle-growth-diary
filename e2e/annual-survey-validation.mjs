import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error("請設定 CHRONICLE_E2E_BASE_URL 為已啟動 local-auth 服務的 HTTPS 網址。");

const email = `annual-survey-${Date.now()}@example.test`;
const password = "local-validation-passphrase";
const currentYear = new Date().getFullYear();
const currentAnswer = "年度問卷隔離驗證：今年的回答";
const previousAnswer = "年度問卷隔離驗證：前一年的回答";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function trpcMutation(page, path, input) {
  return page.evaluate(async ({ path, input }) => {
    const response = await fetch(`/api/trpc/${path}?batch=1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ "0": { json: input } }),
    });
    return { status: response.status, body: await response.json() };
  }, { path, input });
}

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--disable-gpu", "--disable-software-rasterizer", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
let registered = false;

try {
  await page.goto(`${baseUrl}/annual-survey`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "第一次使用？建立本機帳號" }).click();
  await page.getByLabel("顯示名稱").fill("Annual Survey Validation");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "建立本機帳號" }).click();
  await page.locator("#annual-survey-heading").waitFor({ timeout: 10_000 });
  registered = true;

  await page.getByRole("button", { name: "建立預設十題" }).click();
  try {
    await page
      .getByRole("heading", { name: /今年最喜歡的一本書、影片或故事是什麼？/ })
      .waitFor({ timeout: 10_000 });
  } catch (error) {
    console.error("年度題組建立後的可見頁面內容：", await page.locator("body").innerText());
    throw error;
  }

  const yearSelect = page.locator("select").first();
  const answerBox = page.locator("textarea").first();
  const saveButton = page.getByRole("button", { name: "儲存回答" }).first();
  await answerBox.fill(currentAnswer);
  await saveButton.click();
  await page.getByText("年度回答已儲存。", { exact: true }).waitFor({ timeout: 10_000 });

  await yearSelect.selectOption(String(currentYear - 1));
  await answerBox.fill(previousAnswer);
  await saveButton.click();
  await page.getByText("年度回答已儲存。", { exact: true }).waitFor({ timeout: 10_000 });

  await yearSelect.selectOption(String(currentYear));
  await page.getByText(currentAnswer, { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText(previousAnswer, { exact: true }).waitFor({ timeout: 10_000 });
  assert(await page.getByText("提醒：題組預設關閉", { exact: false }).isVisible(), "年度問卷未揭露提醒預設關閉邊界。");
  console.log(JSON.stringify({ status: "passed", checks: ["create default survey", "save two years", "cross-year comparison", "default-off reminder"] }));
} finally {
  if (registered) await trpcMutation(page, "auth.deleteAccount", { confirmation: "刪除我的帳號" }).catch(() => undefined);
  await context.close();
  await browser.close();
}
