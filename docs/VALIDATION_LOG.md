# 驗證基準

本文件只保留目前可重現的品質基準與已知限制，不作為逐次提交或開發過程的日誌。版本變更請發布於 [GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases)，長篇設計討論與驗證結論請使用 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## 目前品質基準

| 範圍 | 狀態 | 可重現方法 |
| --- | --- | --- |
| 型別、單元測試與正式建置 | 通過 | `pnpm check && pnpm test && pnpm build`。目前基準為 **48 個測試檔、133 項 Vitest**。 |
| 公開首頁 375px | 通過 | 設定 HTTPS `CHRONICLE_E2E_BASE_URL` 後執行 `pnpm test:e2e:mobile-nav`。覆蓋跳至主要內容、行動導覽、故事案例、時間帶鍵盤探索、篩選狀態、減少動態與離線快速記事入口。 |
| 隔離 local-auth 編輯器 | 通過 | 設定 HTTPS `CHRONICLE_E2E_BASE_URL` 後執行 `pnpm test:e2e:isolated`。腳本會建立並清除暫時帳號，覆蓋 375px 日記載入、分頁、事件選取及 `diary.get` 逾時／失敗恢復。 |
| 公開故事閱讀版型 | 通過 | `SharedStory` 測試覆蓋 `editorial`、`gallery` 與 `minimal`；隔離 local-auth 已完成三種版型的 375px 視覺回歸。 |
| 社群分享中繼資料 | 通過 | `socialMetadata.test.ts` 驗證 Open Graph 與 Twitter 圖片皆採 Chronicle 品牌時間帶視覺與替代文字。 |
| 離線快速記事 | 通過 | `/quick-note` 使用目前瀏覽器的 localStorage 保存草稿；單元與 375px 回歸覆蓋儲存、還原、清除與複製行為。 |

## 正式 OAuth 驗證邊界

公開預覽的登入按鈕會以既有 nonce、`state`、`appId` 與 callback 契約導向 `https://manus.im/app-auth`。然而，2026-08-20 的檢查顯示：帶參數的導向及不帶參數直接造訪該入口都回傳 CloudFront 403。拒絕在 Chronicle callback 之前發生，因此不是本專案的 state 驗證或 `diary.get` 邏輯所造成。

正式 Manus OAuth 工作階段的 `diary.get` 成功載入仍待外部登入入口恢復後驗證。隔離 local-auth 證據不替代此項正式整合驗證。

## 驗證規則

公開介面變更至少需執行 `check`、`test`、`build`，並在桌面與 375px 檢查版面及 `prefers-reduced-motion`。涉及受保護資料、分享、媒體或 AI 的變更，還必須覆蓋擁有權、分享範圍與資料處理邊界。
