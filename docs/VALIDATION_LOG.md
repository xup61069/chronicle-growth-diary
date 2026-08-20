# 驗證基準

本文件只保留目前可重現的品質基準與已知限制，不作為逐次提交或開發過程的日誌。版本變更請發布於 [GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases)，長篇設計討論與驗證結論請使用 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## 目前品質基準

| 範圍 | 狀態 | 可重現方法 |
| --- | --- | --- |
| 格式、型別、單元測試與正式建置 | 通過 | `pnpm lint && pnpm check && pnpm test`，再分別執行 `./node_modules/.bin/vite build` 與 `pnpm exec esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`。目前基準為 **56 個測試檔、157 項 Vitest**。 |
| 公開首頁 375px | 通過 | 設定 HTTPS `CHRONICLE_E2E_BASE_URL` 後執行 `pnpm test:e2e:mobile-nav`。覆蓋跳至主要內容、行動導覽、故事案例、時間帶鍵盤探索、篩選狀態、減少動態與離線快速記事入口。 |
| 路由載入邊界 | 通過 | Vite 將資料客戶端、圖表、文件匯出、圖示庫與僅工作台使用的 UI 套件分離為可快取 chunk；公開首頁入口產物由 **151.74 KiB** 降至 **128.53 KiB**（減少 **23.21 KiB／15.00%**）。`RouteLoadingState` 提供 `aria-busy` 與 live status；公開首頁 375px、以及隔離 local-auth 的 375px／桌面 `/editor`、`/dashboard` 與返回導覽回歸均通過。 |
| 按需文件匯出邊界與下載 | 通過 | `diaryExport.ts` 僅以 `import("html2canvas")` 與 `import("jspdf")` 載入大型依賴；`diaryExportCodeSplitting.test.ts` 禁止回歸為靜態 import，`diaryExport.test.ts` 覆蓋多頁 PDF 與長圖片下載的封裝流程。壓縮 Vite 產物確認 `DiaryEditor` 以動態 `import()` 指向 **593.38 KiB** 的 `document-export` chunk，而公開首頁入口沒有此 chunk 參照；`route-preload` 則先於一般 `node_modules` 規則獨立分割。隔離 local-auth 的 `pnpm test:e2e:editor-document-export` 已以真實的「匯出 PDF／匯出長圖片」按鈕確認兩種非空下載；無登入的 `pnpm test:e2e:document-export` 則以小型內容夾具保護動態依賴與下載檔案，並納入 CI。 |
| 隔離 local-auth 編輯器 | 通過 | 設定 HTTPS `CHRONICLE_E2E_BASE_URL` 後執行 `pnpm test:e2e:isolated`。腳本會建立並清除暫時帳號，覆蓋 375px 日記載入、分頁、事件選取、private 語音日記入口與本機優先狀態、家庭反應切換、A5 私人書冊預覽、年度 AI 同意與 private 事件 Markdown 匯出、成長數據儀表板，以及 `diary.get` 逾時／失敗恢復。 |
| 公開故事閱讀版型 | 通過 | `SharedStory` 測試覆蓋 `editorial`、`gallery` 與 `minimal`；隔離 local-auth 已完成三種版型的 375px 視覺回歸。 |
| 社群分享中繼資料 | 通過 | `socialMetadata.test.ts` 驗證 Open Graph 與 Twitter 圖片皆採 Chronicle 品牌時間帶視覺與替代文字。 |
| 離線快速記事 | 通過 | `/quick-note` 使用目前瀏覽器的 localStorage 保存草稿；單元與 375px 回歸覆蓋儲存、還原、清除與複製行為。 |
| 年度回顧隱私 | 通過 | AI 生成必須每次確認，僅處理指定年份的 private 事件；`public`／`link` 事件不會送往 AI。年度 AI 與 Markdown 匯出控制項僅對日記擁有者呈現，未登入 router 呼叫會被拒絕。 |
| 成長數據儀表板隱私 | 通過 | `stats.growth` 為受保護且 owner-only 的程序；SQL 與第二層 helper 均限制為 private、非 public 事件。前端僅接收摘要、月份密度、階段計數與關鍵字頻率，沒有日記正文、媒體或地點。隔離 local-auth 已完成 375px 與 1280px 視覺驗證。 |
| 語音日記隱私 | 通過 | 語音上傳只接受 private 事件、受保護的事件寫入權限與每次 `confirmAiProcessing` 同意。原音先存於本機 IndexedDB，僅在使用者按下上傳後送往 Whisper；資料表僅保存原音 key／URL 與逐字稿，且公開與連結分享回應一律清空 voiceNotes。單元與 375px local-auth 回歸已覆蓋同意、格式、分享遮罩與入口狀態。 |
| 公開分享頁語音隔離 | 通過 | `pnpm test:e2e:shared-story-voice-isolation` 攔截公開分享回應並故意帶入私有原音 URL、檔名與逐字稿；SharedStory 必須仍顯示可分享事件，但不得出現私有文字、URL 或 `<audio>`。此無登入毒化回應回歸已納入 CI，並與資料層清空 `voiceNotes` 的單元測試互補。 |
| A5 私人書冊 | 通過 | 書冊僅由日記擁有者從現有私人工作台資料開啟，使用者在新視窗明確觸發列印／另存 PDF；以生命階段與事件順序編排，未解鎖膠囊的正文、媒體及逐字稿一律遮罩。單元測試覆蓋內容跳脫與膠囊遮罩；隔離 local-auth 已完成 375px 與 1280px 預覽回歸。 |
| 家庭事件反應 | 通過 | 只有日記擁有者與受邀成員可針對 private 事件切換四種反應；資料表以事件、使用者與反應組合唯一索引防止重複。反應只回傳聚合計數與目前使用者選取狀態，並記錄新增／移除稽核動作；分享層明確剔除反應欄位。資料層、路由、375px 與 1280px local-auth 回歸已覆蓋。 |

## 正式 OAuth 驗證邊界

公開預覽的登入按鈕會以既有 nonce、`state`、`appId` 與 callback 契約導向 `https://manus.im/app-auth`。然而，2026-08-20 的檢查顯示：帶參數的導向及不帶參數直接造訪該入口都回傳 CloudFront 403。拒絕在 Chronicle callback 之前發生，因此不是本專案的 state 驗證或 `diary.get` 邏輯所造成。

正式 Manus OAuth 工作階段的 `diary.get` 成功載入仍待外部登入入口恢復後驗證。隔離 local-auth 證據不替代此項正式整合驗證。

## 瀏覽器文件匯出驗證邊界

2026-08-20 進行隔離 local-auth 的完整工作台實際 PDF／長圖片下載整合嘗試時，headless Chromium 曾在不同時點發生 `Target crashed` 或 `Page crashed`；一度在觸發 PDF 下載後中斷。以重建的 local-auth 服務重試後，精簡的 `editor-document-export` 回歸已可建立一筆 private 事件，並直接點擊 DiaryEditor 的「匯出 PDF／匯出長圖片」按鈕，確認兩種下載皆有預期副檔名及非空檔案。無登入的最小化回歸不載入帳號、日記或分享資料，用於 CI 保護動態依賴與下載基本契約。完整工作台的長篇實際內容、跨瀏覽器與使用者裝置驗證仍應在後續釋出前進行。

## 驗證規則

公開介面變更至少需執行 `check`、`test`、`build`，並在桌面與 375px 檢查版面及 `prefers-reduced-motion`。涉及受保護資料、分享、媒體或 AI 的變更，還必須覆蓋擁有權、分享範圍與資料處理邊界。
