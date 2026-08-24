import { chromium } from "@playwright/test";

const baseUrl = process.env.CHRONICLE_E2E_BASE_URL;
if (!baseUrl) throw new Error("請設定 CHRONICLE_E2E_BASE_URL 為已啟動 local-auth 服務的 HTTPS 網址。");

const suffix = Date.now();
const password = "local-validation-passphrase";
const owner = { email: `annual-owner-${suffix}@example.test`, name: "Annual Owner" };
const member = { email: `annual-member-${suffix}@example.test`, name: "Annual Member" };
const outsider = { email: `annual-outsider-${suffix}@example.test`, name: "Annual Outsider" };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resultJson(response) {
  return response.body?.[0]?.result?.data?.json;
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

async function trpcQuery(page, path, input) {
  return page.evaluate(async ({ path, input }) => {
    const query = new URLSearchParams({ batch: "1" });
    if (input !== undefined)
      query.set("input", JSON.stringify({ "0": { json: input } }));
    const response = await fetch(`/api/trpc/${path}?${query}`);
    return { status: response.status, body: await response.json() };
  }, { path, input });
}

async function register(page, person, location) {
  await page.goto(`${baseUrl}${location}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "第一次使用？建立本機帳號" }).click();
  await page.getByLabel("顯示名稱").fill(person.name);
  await page.getByLabel("Email").fill(person.email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "建立本機帳號" }).click();
  await page.locator("#annual-survey-heading").waitFor({ timeout: 10_000 });
}

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--disable-gpu", "--disable-software-rasterizer", "--disable-dev-shm-usage"],
});
const ownerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const memberContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const outsiderContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const ownerPage = await ownerContext.newPage();
const memberPage = await memberContext.newPage();
const outsiderPage = await outsiderContext.newPage();
const pages = [ownerPage, memberPage, outsiderPage];
const registeredPages = [];

try {
  await register(ownerPage, owner, "/annual-survey");
  registeredPages.push(ownerPage);
  await ownerPage.getByRole("button", { name: "建立預設十題" }).click();
  await ownerPage.getByRole("heading", { name: /今年最喜歡的一本書、影片或故事是什麼？/ }).waitFor({ timeout: 10_000 });
  const ownerDiary = resultJson(await trpcQuery(ownerPage, "diary.get", undefined));
  assert(ownerDiary?.diary?.id, "無法讀取 owner 年度問卷所屬 diary。 ");
  const surveys = resultJson(await trpcQuery(ownerPage, "diary.getAnnualSurveys", undefined));
  assert(surveys?.[0]?.id && surveys?.[0]?.questions?.[0]?.id, "無法讀取 owner 建立的年度題組。 ");
  const invitation = resultJson(await trpcMutation(ownerPage, "diary.createFamilyInvite", {
    email: member.email,
    role: "commenter",
    expiresAt: Date.now() + 10 * 60 * 1000,
  }));
  assert(invitation?.token, "無法建立隔離家庭邀請。 ");

  await register(memberPage, member, "/annual-survey");
  registeredPages.push(memberPage);
  const accepted = await trpcMutation(memberPage, "diary.acceptFamilyInvite", { token: invitation.token });
  assert(accepted.status === 200, "合成 family member 無法接受邀請。 ");
  await memberPage.goto(`${baseUrl}/annual-survey?diary=${ownerDiary.diary.id}`, { waitUntil: "domcontentloaded" });
  await memberPage.getByRole("heading", { name: /今年最喜歡的一本書、影片或故事是什麼？/ }).waitFor({ timeout: 10_000 });
  assert(await memberPage.getByRole("button", { name: "建立預設十題" }).count() === 0, "member 不應取得建立年度題組控制。 ");
  await memberPage.locator("textarea").first().fill("家庭 member 的 private 年度回答");
  await memberPage.getByRole("button", { name: "儲存回答" }).first().click();
  await memberPage.getByText("年度回答已儲存。", { exact: true }).waitFor({ timeout: 10_000 });

  await register(outsiderPage, outsider, "/annual-survey");
  registeredPages.push(outsiderPage);
  await outsiderPage.goto(`${baseUrl}/annual-survey?diary=${ownerDiary.diary.id}`, { waitUntil: "domcontentloaded" });
  try {
    await outsiderPage.getByRole("alert").waitFor({ timeout: 10_000 });
  } catch (error) {
    console.error("非成員指定 diary 頁面內容：", await outsiderPage.locator("body").innerText());
    throw error;
  }
  assert(!(await outsiderPage.getByText("家庭 member 的 private 年度回答", { exact: true }).count()), "非成員不應讀取家庭年度回答。 ");
  const rejected = await trpcMutation(outsiderPage, "diary.saveAnnualSurveyAnswer", {
    diaryId: ownerDiary.diary.id,
    surveyId: surveys[0].id,
    questionId: surveys[0].questions[0].id,
    year: new Date().getFullYear(),
    body: "非成員不應寫入",
  });
  assert(rejected.status >= 400, "非成員不應能寫入家庭年度回答。 ");
  console.log(JSON.stringify({ status: "passed", checks: ["member diary context", "member answer", "owner-only create", "nonmember rejection"] }));
} finally {
  for (const page of registeredPages) {
    await trpcMutation(page, "auth.deleteAccount", { confirmation: "刪除我的帳號" }).catch(() => undefined);
  }
  await Promise.all(pages.map(page => page.close()));
  await Promise.all([ownerContext.close(), memberContext.close(), outsiderContext.close()]);
  await browser.close();
}
