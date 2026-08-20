import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;

if (!baseUrl) {
  throw new Error("請提供 CHRONICLE_E2E_BASE_URL，例如 https://3000-...manus.computer");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

try {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl.replace(/\/$/, "")}/`, { waitUntil: "domcontentloaded" });

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "跳至主要內容" });
  if (await skipLink.evaluate((element) => document.activeElement === element) !== true) {
    throw new Error("首頁鍵盤導覽的第一個焦點應為跳至主要內容連結。");
  }
  await skipLink.press("Enter");
  await page.waitForFunction(() => document.activeElement?.id === "main-content");

  const heroTransitionDuration = await page.locator(".hero-workbench").evaluate((element) => getComputedStyle(element).transitionDuration);
  if (!heroTransitionDuration.split(",").every((duration) => Number.parseFloat(duration) <= 0.001)) {
    throw new Error("減少動態偏好下，首頁工作台的過場應縮短至近乎立即。 ");
  }
  const storyImage = page.locator(".story-card img").first();
  await storyImage.hover();
  if (await storyImage.evaluate((element) => getComputedStyle(element).transform) !== "none") {
    throw new Error("減少動態偏好下，故事圖片 hover 不應產生縮放移動。");
  }

  const exampleLink = page.getByRole("link", { name: "觀看範例" });
  if (await exampleLink.getAttribute("href") !== "#stories") {
    throw new Error("首頁範例入口未指向故事案例區段。");
  }

  const timelineTitle = page.locator(".timeline-detail h3");
  const initialTimelineTitle = (await timelineTitle.textContent())?.trim();
  await exampleLink.focus();
  await page.keyboard.press("ArrowRight");
  if ((await timelineTitle.textContent())?.trim() !== initialTimelineTitle) {
    throw new Error("連結取得焦點時，方向鍵不應切換時間帶事件。");
  }
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.keyboard.press("ArrowRight");
  if ((await timelineTitle.textContent())?.trim() === initialTimelineTitle) {
    throw new Error("沒有互動控制項取得焦點時，方向鍵應可切換時間帶事件。");
  }

  const timelineViewport = page.locator(".timeline-viewport");
  if (await timelineViewport.getAttribute("tabindex") !== "0") {
    throw new Error("互動時間帶應提供可聚焦的鍵盤入口。");
  }
  await timelineViewport.focus();
  const focusedTimelineTitle = (await timelineTitle.textContent())?.trim();
  await page.keyboard.press("ArrowLeft");
  if ((await timelineTitle.textContent())?.trim() === focusedTimelineTitle) {
    throw new Error("聚焦時間帶後，左方向鍵應可切換事件。");
  }

  const nextEventButton = page.getByRole("button", { name: "下一個事件" });
  await nextEventButton.focus();
  const buttonFocusedTimelineTitle = (await timelineTitle.textContent())?.trim();
  await page.keyboard.press("ArrowRight");
  if ((await timelineTitle.textContent())?.trim() !== buttonFocusedTimelineTitle) {
    throw new Error("時間帶內按鈕取得焦點時，方向鍵不應重複切換事件。");
  }

  await Promise.all([
    page.waitForURL(/#stories$/),
    exampleLink.click(),
  ]);

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

  console.log("公開首頁回歸通過：跳至主要內容、減少動態偏好、範例入口、時間帶鍵盤入口與焦點保護、行動選單展開、Escape 與連結收合均正常。");
} finally {
  await browser.close();
}
