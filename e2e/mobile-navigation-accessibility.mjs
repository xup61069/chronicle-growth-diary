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

  const skipLink = page.getByRole("link", { name: "跳至主要內容" });
  await skipLink.focus();
  if (await skipLink.evaluate((element) => document.activeElement === element) !== true) {
    throw new Error("首頁跳至主要內容連結應可由鍵盤取得焦點。");
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

  const allFilter = page.getByRole("button", { name: "全部", exact: true });
  const researchFilter = page.getByRole("button", { name: "研究", exact: true });
  if (await allFilter.getAttribute("aria-pressed") !== "true") {
    throw new Error("時間帶預設篩選應揭露為已選取。");
  }
  await researchFilter.click();
  if (await researchFilter.getAttribute("aria-pressed") !== "true" || await allFilter.getAttribute("aria-pressed") !== "false") {
    throw new Error("變更時間帶篩選後應同步更新 aria-pressed 狀態。");
  }

  const exampleLink = page.getByRole("link", { name: "查看範例" });
  if (await exampleLink.getAttribute("href") !== "#stories") {
    throw new Error("首頁範例入口未指向範例區段。");
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

  const keywordFilter = page.getByLabel("搜尋示範事件內容");
  await keywordFilter.fill("作品");
  const autocomplete = page.getByRole("listbox", { name: "搜尋建議" });
  await autocomplete.waitFor();
  if (await autocomplete.getByRole("option").count() < 2) {
    throw new Error("公開事件內容命中時，搜尋列應列出相關自動完成建議。");
  }
  await keywordFilter.press("Escape");
  await autocomplete.waitFor({ state: "hidden" });

  await keywordFilter.focus();
  await keywordFilter.fill("工作");
  await page.locator("#timeline-autocomplete-options").waitFor();
  if (await autocomplete.getByRole("option").count() !== 1) {
    throw new Error("工作關鍵字應只對應一個公開事件自動完成建議。");
  }
  await keywordFilter.press("ArrowDown");
  await keywordFilter.press("Enter");
  await page.getByText("顯示 1 筆示範事件／關鍵字「搬家後重新整理工作桌」／研究／由舊到新", { exact: true }).waitFor();
  if ((await timelineTitle.textContent())?.trim() !== "搬家後重新整理工作桌") {
    throw new Error("自動完成選取後應以對應的公開事件關鍵字篩選結果。");
  }
  if ((await page.locator(".timeline-detail mark").first().textContent())?.trim() !== "搬家後重新整理工作桌") {
    throw new Error("搜尋結果的事件卡片應以 mark 標記符合關鍵字的文字。");
  }
  const viewportTransition = await timelineViewport.evaluate((element) => getComputedStyle(element).transitionDuration);
  if (!viewportTransition.split(",").every((duration) => Number.parseFloat(duration) <= 0.001)) {
    throw new Error("減少動態偏好下，時間帶結果更新不應保留過渡動畫。");
  }
  await keywordFilter.focus();
  const keywordFocusedTitle = (await timelineTitle.textContent())?.trim();
  await page.keyboard.press("ArrowLeft");
  if ((await timelineTitle.textContent())?.trim() !== keywordFocusedTitle) {
    throw new Error("關鍵字輸入框取得焦點時，方向鍵不應切換時間帶事件。");
  }
  await keywordFilter.fill("");

  const dateFilter = page.getByLabel("依日期篩選示範事件");
  await dateFilter.fill("2024-05-17");
  await page.getByText("顯示 1 筆示範事件／2024-05-17／研究／由舊到新", { exact: true }).waitFor();
  if ((await timelineTitle.textContent())?.trim() !== "搬家後重新整理工作桌") {
    throw new Error("日期與事件類型篩選應交集顯示符合的示範事件。");
  }

  await dateFilter.fill("2030-01-01");
  await page.getByText("沒有符合的示範事件。", { exact: false }).waitFor();
  if (await page.locator(".timeline-detail").count() !== 0) {
    throw new Error("沒有符合篩選的事件時，不應保留過期的事件詳情。");
  }
  const emptyState = page.locator(".timeline-empty");
  if (await emptyState.locator(".timeline-empty-illustration").count() !== 1) {
    throw new Error("零結果狀態應提供輕量的搜尋插圖提示。");
  }
  await emptyState.getByRole("button", { name: /寄出第一封作品集/ }).click();
  await page.getByText("顯示 1 筆示範事件／2024-05-31／由舊到新", { exact: true }).waitFor();
  if ((await timelineTitle.textContent())?.trim() !== "寄出第一封作品集") {
    throw new Error("零結果建議應可快速開啟既有的近期示範事件。");
  }

  await dateFilter.fill("2030-01-01");
  await page.locator(".timeline-empty").getByRole("button", { name: "清除篩選" }).click();
  await page.getByText("顯示 5 筆示範事件／由舊到新", { exact: true }).waitFor();

  const sortFilter = page.getByLabel("事件日期排序");
  await sortFilter.selectOption("newest");
  await page.getByText("顯示 5 筆示範事件／由新到舊", { exact: true }).waitFor();
  if ((await timelineTitle.textContent())?.trim() !== "寄出第一封作品集") {
    throw new Error("由新到舊排序應先顯示日期最新的事件。");
  }
  await sortFilter.selectOption("oldest");
  await page.getByText("顯示 5 筆示範事件／由舊到新", { exact: true }).waitFor();
  if ((await timelineTitle.textContent())?.trim() !== "記下第一次自己回家的路") {
    throw new Error("由舊到新排序應先顯示日期最早的事件。");
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
  await navigation.getByRole("link", { name: "範例", exact: true }).click();
  if (await menuButton.getAttribute("aria-expanded") !== "false") {
    throw new Error("點擊行動導覽連結後未收合選單。");
  }

  const quickNoteLink = page.getByRole("link", { name: "離線紀錄" });
  if (await quickNoteLink.getAttribute("href") !== "/quick-note") {
    throw new Error("首頁應提供不需登入的離線紀錄入口。");
  }
  if (await quickNoteLink.getAttribute("aria-describedby") !== "offline-note-guidance") {
    throw new Error("離線紀錄入口應連結到本機資料處理說明。");
  }
  if ((await page.locator("#offline-note-guidance").textContent())?.trim() !== "離線草稿只保存在目前裝置；準備好後可複製並整理成正式事件。") {
    throw new Error("首頁應清楚說明離線快速記事的本機保存與後續整理方式。");
  }
  await Promise.all([
    page.waitForURL(/\/quick-note$/),
    quickNoteLink.click(),
  ]);

  console.log("公開首頁回歸通過：關鍵字、日期、類型、排序、零結果建議、離線紀錄、跳至主要內容、減少動態偏好、時間帶鍵盤入口與行動選單均正常。");
} finally {
  await browser.close();
}
