# Chronicle — 個人成長史時間軸

Chronicle 是一個以時間軸呈現的私人數位日記。它幫助使用者把童年記憶、學習歷程、人生轉折與個人成就，整理成可持續編輯的成長檔案。

## 核心功能

| 功能 | 說明 |
|---|---|
| 私人時間軸 | 每位使用者擁有自己的成長史與事件索引。 |
| 成長事件編輯 | 可建立、修改與刪除回憶、學習、成就或人生章節。 |
| 時間精度 | 支援以日、月或年記錄事件。 |
| 標籤與篩選 | 可為事件加入多個標籤，依類型、標籤與時間方向回顧。 |
| 珍藏影像 | 支援附加 JPG、PNG、WebP 或 GIF 圖片，原始檔案存放於專案檔案儲存服務。 |
| 私人資料保護 | 編輯器操作以登入身分保護，伺服器會確認資料擁有權。 |
| 人生階段總覽 | 依事件時間、年齡標記與可選的成長錨點，自動分群為童年、求學與職涯。 |
| 受控分享 | 可選擇完全私密、公開閱讀或私密連結；只有明確允許的事件會顯示在分享頁。 |
| 可攜備份 | 可在瀏覽器端將完整成長史輸出為分頁 PDF 或一張長圖片。 |

## 本機開發

```bash
pnpm install
pnpm dev
```

常用驗證指令如下。

```bash
pnpm test
pnpm check
pnpm build
```

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
```

## 授權

本專案採用 [MIT License](./LICENSE)。

## 致謝

匯出功能使用 [jsPDF](https://github.com/parallax/jsPDF) 與 [html2canvas](https://github.com/niklasvh/html2canvas) 建立；若它們對你的專案有幫助，請考慮支持原始維護者。
