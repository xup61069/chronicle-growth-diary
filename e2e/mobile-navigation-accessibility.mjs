import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;

if (!baseUrl) {
  throw new Error("請提供 CHRONICLE_E2E_BASE_URL，例如 https://3000-...manus.computer");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

try {
  await page.goto(`${baseUrl.replace(/\/$/, "")}/`, { waitUntil: "domcontentloaded" });

  const menuButton = page.locator("button.mobile-menu");
  const navigation = page.locator("#primary-navigation");

  if (await menuButton.getAttribute("aria-expanded") !== "false") {
    throw new Error("行動選單初始狀態應為收合。");
  }
  if (await menuButton.getAttribute("aria-controls") !== "primary-navigation") {
    throw new Error("行動選單按鈕缺少與主導覽的關聯。");
  }

  await menuButton.click();
  await navigation.waitFor({ state: "visible" });
  if (await menuButton.getAttribute("aria-expanded") !== "true") {
    throw new Error("行動選單展開後未更新 aria-expanded。");
  }

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector("button.mobile-menu")?.getAttribute("aria-expanded") === "false");
  if (await menuButton.getAttribute("aria-expanded") !== "false") {
    throw new Error("Escape 未收合行動選單。");
  }

  await menuButton.click();
  await page.getByRole("link", { name: "故事案例" }).click();
  if (await menuButton.getAttribute("aria-expanded") !== "false") {
    throw new Error("點擊行動導覽連結後未收合選單。");
  }

  console.log("行動導覽可及性回歸通過：展開、Escape 與連結收合均正常。");
} finally {
  await browser.close();
}
