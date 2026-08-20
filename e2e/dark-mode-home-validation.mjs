import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL ?? "https://3000-ikbafizm7ieu1euamj0im-c10d51d6.sg1.manus.computer";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--disable-gpu", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  if (!await page.locator("html").evaluate((node) => node.classList.contains("dark"))) throw new Error("新工作階段首頁未以深色模式啟動。");
  await page.getByRole("button", { name: "切換至明亮模式" }).click();
  if (await page.locator("html").evaluate((node) => node.classList.contains("dark"))) throw new Error("主題切換後 root 仍保留 dark class。");
  await page.reload({ waitUntil: "domcontentloaded" });
  if (await page.locator("html").evaluate((node) => node.classList.contains("dark"))) throw new Error("明亮模式選擇未於重新載入後保留。");
  console.log(JSON.stringify({ checks: ["default dark theme", "theme toggle", "theme persistence"], status: "passed" }));
} finally {
  await browser.close();
}
