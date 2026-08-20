# Chronicle — 個人成長史時間軸

[繁體中文](./README.md) · [English](./README.en.md) · [本機開發](./docs/LOCAL_DEVELOPMENT.md) · [自架指南](./docs/SELF_HOSTING.md) · [媒體封存格式](./docs/MEDIA_ARCHIVE.md) · [Roadmap](./docs/roadmap/README.md) · [貢獻方式](./CONTRIBUTING.md) · [安全性](./SECURITY.md)

Chronicle 是一個以時間軸呈現的私人數位日記。它幫助使用者把童年記憶、學習歷程、人生轉折與個人成就，整理成可持續編輯的成長檔案。

## 核心功能

| 功能 | 說明 |
|---|---|
| 私人時間軸 | 每位使用者擁有自己的成長史與事件索引。 |
| 成長事件編輯 | 可建立、修改與刪除回憶、學習、成就或人生章節。 |
| 時間精度 | 支援以日、月或年記錄事件。 |
| 全文與日期篩選 | 可搜尋事件標題、內文、地點與標籤，並以開始／結束日期限縮日記索引。 |
| 珍藏影像工作區 | 支援一次加入多張 JPG、PNG、WebP 或 GIF 圖片；可拖曳排序、為每張圖片撰寫說明並移除個別圖片。 |
| 私人資料保護 | 編輯器操作以登入身分保護，伺服器會確認資料擁有權。 |
| 人生階段總覽 | 依事件時間、年齡標記與可選的成長錨點，自動分群為童年、求學與職涯。 |
| 受控分享 | 可選擇完全私密、公開閱讀或私密連結；只有明確允許的事件會顯示在分享頁。 |
| 可攜備份 | 可在瀏覽器端將完整成長史輸出為分頁 PDF、長圖片、版本化 JSON、Markdown，或含事件圖片位元組的受限媒體 ZIP 封存。 |
| AI 階段回顧 | 僅根據選定人生階段內的事件產生回顧與開放式反思；使用者可重新生成、手動編輯並保存最終文字。 |
| 可調整時間工作台 | 可拖曳各人生階段的起訖年份，並以手動順序拖曳重排事件；調整會持久化保存。 |
| 進階分享連結 | 分享可設為密碼保護與到期日；擁有者可查看成功開啟故事的累積次數與最近存取時間，系統不記錄閱覽者身分或 IP 位址。 |
| 年度回顧模板 | 依指定年度的實際日記事件產生年度敘事、里程碑索引或回望提問，絕不虛構未記錄的經歷。 |
| 公開故事編排 | 可上傳公開故事封面、設定封面標題，並選擇編輯式長文、影像畫廊或極簡時間帶版型；分享頁完整保留公開事件的排序圖片與說明。 |
| 公開首頁體驗 | 提供可聚焦的互動時間帶、分類篩選狀態、鍵盤跳至主要內容、行動導覽、減少動態偏好、品牌化社群分享預覽，以及案例與編輯器入口。 |
| 離線快速記事 | `/quick-note` 會將草稿保存在目前裝置的瀏覽器；使用者可離線記錄，準備好後複製內容至完整編輯器整理成正式事件。 |
| 成長數據儀表板 | 日記擁有者可在 `/dashboard` 查看僅由 private 事件彙整的月度紀錄密度、人生階段、關鍵字與連續紀錄；不回傳事件正文、媒體或位置。 |
| 語音日記 | 可在 private 事件錄音並先保存到目前裝置。每次上傳前都須重新同意將音檔送往轉寫；原音與逐字稿可個別移除，公開與連結故事不會輸出任何語音欄位。 |
| A5 私人書冊 | 日記擁有者可從匯出區開啟依生命階段編排的 A5 預覽，再自行列印或另存 PDF；未解鎖的時空膠囊內容會遮罩。 |
| 家庭事件反應 | 日記擁有者與受邀成員可在 private 事件留下心意、共鳴、慶祝或支持等真實反應。畫面只顯示彙整計數與本人狀態，公開／連結故事一律隔離。 |
| 路由載入邊界 | 公開首頁不預先載入工作台的圖表、文件匯出與協作介面；非首頁路由讀取時提供可宣告的載入狀態。 |

## 目前公開驗證狀態

公開首頁與 `/quick-note` 可在未登入狀態使用。首頁的 375px 瀏覽器回歸覆蓋鍵盤跳至主要內容、減少動態偏好、時間帶鍵盤探索、分類篩選狀態、行動選單、故事案例與離線快速記事入口。Open Graph 與 Twitter 分享預覽使用 Chronicle 的時間帶視覺，而非僅使用標誌。

> 正式 Manus OAuth 目前受外部登入入口影響：公開預覽導向的 `https://manus.im/app-auth` 與不含參數的同一入口都曾回傳 CloudFront 403，因此主開發站的正式 `diary.get` 成功載入實證仍延後。此問題發生在 Chronicle callback 之前；完整診斷邊界與未登入／隔離 local-auth 證據記錄於 [`docs/VALIDATION_LOG.md`](./docs/VALIDATION_LOG.md)。

## 私有功能的資料處理邊界

| 功能 | 何時處理資料 | 可見範圍與刪除方式 |
|---|---|---|
| 年度 AI 回顧 | 擁有者每次勾選當次同意後，伺服器只取指定年份的 private 事件。 | public／link 事件不會進入提示文字；回顧與 Markdown 匯出僅由擁有者操作。 |
| 語音日記 | 使用者每次勾選同意並手動上傳後才送往轉寫；離線錄音不會自動背景上傳。 | 原音存於受保護物件儲存，資料表只保存位置與中繼資料；可刪除原音與逐字稿，分享頁不輸出。 |
| 家庭事件反應 | 成員明確點擊時建立或移除反應。 | 僅 private 事件與日記成員可讀寫；系統不提供預設或合成反應，分享回應會移除欄位。 |
| A5 私人書冊 | 擁有者從工作台按下預覽按鈕時才在瀏覽器編排。 | 列印與另存 PDF 由使用者的瀏覽器處理；未解鎖膠囊會遮罩正文、媒體與逐字稿。 |

可重現的資料範圍、分享遮罩與跨尺寸瀏覽器驗證記錄於 [`docs/VALIDATION_LOG.md`](./docs/VALIDATION_LOG.md)。

## 本機開發

請使用 Node.js 22 與 Corepack。先將 `.env.example` 複製為 `.env`，再依使用的開發環境填入資料庫和整合設定。`.env` 僅供本機使用，絕不可提交。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Windows PowerShell 若未找到 `pnpm`，可直接改用 `corepack.cmd pnpm`。目前的登入、檔案儲存與 AI 呼叫仍使用既有整合服務；完整的本機認證、S3/MinIO 儲存和可替換 LLM 提供者會在後續自架化里程碑完成。請參閱 [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md) 了解目前可用的本機流程、環境變數與遷移路線。

常用驗證指令如下。

```bash
corepack pnpm test
corepack pnpm check
corepack pnpm build
```

如需對公開首頁進行 375px 瀏覽器回歸，可先啟動 HTTPS 開發預覽並設定其網址：

```bash
CHRONICLE_E2E_BASE_URL=https://your-preview.example corepack pnpm test:e2e:mobile-nav
```

私有工作台的隔離回歸使用 local-auth。請先以 `AUTH_DRIVER=local` 與 `VITE_AUTH_DRIVER=local` 啟動 HTTPS 開發服務，再執行：

```bash
CHRONICLE_E2E_BASE_URL=https://your-local-auth-preview.example corepack pnpm test:e2e:isolated
CHRONICLE_E2E_BASE_URL=https://your-local-auth-preview.example CHRONICLE_E2E_VIEWPORT=desktop corepack pnpm test:e2e:isolated
```

## 貢獻與持續整合

[`AGENTS.md`](./AGENTS.md) 定義架構、資料安全、資料庫 migration 與「編集室時間帶」視覺規範；貢獻流程請見 [`CONTRIBUTING.md`](./CONTRIBUTING.md)，測試分層請見 [`docs/TESTING.md`](./docs/TESTING.md)，router 組裝邊界請見 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)，後續功能方向請見 [`docs/roadmap/`](./docs/roadmap/README.md)。每次推送與 Pull Request 都會執行格式 lint、型別檢查、Vitest 與正式建置；公開首頁 E2E 由 CI 的獨立工作執行。

版本說明請使用 [GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases)；長篇設計討論、驗證結論與提案請使用 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)，而非把提交紀錄當成工作日誌。

## 資料模型

主要資料實體包含 `growth_diaries`、`growth_events`、`growth_tags`、`growth_event_tags` 與 `growth_event_media`。事件資料存於資料庫；圖片位元組存於檔案儲存服務，資料庫僅保留存取位置與中繼資料。

## 專案結構

```text
client/src/pages/DiaryEditor.tsx  個人成長史編輯器
drizzle/schema.ts                成長日記資料模型
server/routers.ts                受保護的事件與媒體 API
server/db.ts                     資料存取與檔案儲存協調
server/diaryHelpers.ts           標籤與圖片驗證輔助
server/lifePhases.ts             人生階段自動分群規則
client/src/pages/SharedStory.tsx 不需登入的受控分享閱讀頁
client/src/lib/diaryExport.ts    PDF 與長圖片瀏覽器端匯出
client/src/lib/annualReview.ts   年度回顧模板與事件彙整工具
client/src/lib/printBook.ts      A5 私人書冊編排與膠囊遮罩
client/src/lib/voiceDrafts.ts    瀏覽器端離線語音草稿佇列
server/db/voiceNotes.ts          私有語音檔與逐字稿協調
server/db/familyCollaboration.ts 成員、註解與事件反應授權
server/shareAccess.ts            私密連結、密碼雜湊與到期判斷
server/_core/llm.ts              內建模型呼叫與 AI 階段回顧整合
```

## 授權

本專案採用 [MIT License](./LICENSE)。

## 致謝

匯出功能使用 [jsPDF](https://github.com/parallax/jsPDF)、[html2canvas](https://github.com/niklasvh/html2canvas) 與 [JSZip](https://github.com/Stuk/jszip) 建立；若它們對你的專案有幫助，請考慮支持原始維護者。
