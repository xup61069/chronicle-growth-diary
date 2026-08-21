import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;

if (!baseUrl) {
  throw new Error("請設定 CHRONICLE_E2E_BASE_URL，例如 https://chronotime-w3ztsoiq.manus.space");
}

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--disable-gpu", "--disable-software-rasterizer", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(`${baseUrl.replace(/\/$/, "")}/editor?release=local-auth-smoke`, {
    waitUntil: "domcontentloaded",
  });

  await page.getByLabel("Email").waitFor();
  await page.getByLabel("密碼").waitFor();
  await page.getByRole("button", { name: "登入並開始編輯" }).waitFor();
  await page.getByRole("button", { name: "第一次使用？建立本機帳號" }).waitFor();

  if (await page.getByLabel("Email").getAttribute("type") !== "email") {
    throw new Error("本機帳密面板的 Email 欄位未保有 email input type。");
  }
  if (await page.getByLabel("密碼").getAttribute("type") !== "password") {
    throw new Error("本機帳密面板的密碼欄位未保有 password input type。");
  }

  console.log("375px local-auth panel smoke test passed");
} finally {
  await browser.close();
}
