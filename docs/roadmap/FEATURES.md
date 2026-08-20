# 功能 Roadmap

以下藍圖以「先可安全驗證、再擴大資料與即時性」為原則。它不是已承諾的發佈時程；每項功能在開始前都需完成資料模型、擁有權、分享範圍、刪除路徑與成本評估。

| 優先層級 | 功能 | 第一階段可交付 | 隱私與技術依賴 |
| --- | --- | --- | --- |
| A | 年度回顧產生器 | 指定年份彙整私有事件、人生階段與媒體統計，經明確 AI 同意後產生可編輯回顧並匯出 Markdown。 | 需要 `yearReview` router、AI consent、share scope、frontmatter；不得以 AI 虛構未記錄經歷。 |
| B | 語音日記 | Quick Note 錄製、離線暫存、可插拔 STT 轉寫，結果進入草稿。 | MediaRecorder、IndexedDB、storage、STT provider、明確錄音同意與原音刪除路徑。 |
| C | 成長數據儀表板 | 以 server-side aggregation 產生階段密度、關鍵字與連續書寫天數。 | `stats` router、SQL group-by、最小化統計與可見度範圍；不把私有資料送至前端做全量計算。 |
| D | 印刷級 PDF | 指定時間範圍輸出 A5 年鑑、人生階段章節、頁首頁尾與照片排版。 | Server rendering、隔離 `/print`、媒體授權與 PDF 產物保留策略；先確認部署是否支援 Chromium。 |
| E | 家庭留言與共編 | 先做條目留言，再加入 reaction，最後才以 feature flag 評估 CRDT 共編。 | 留言擁有權、invite scope、內容刪除與稽核；Yjs/WebSocket 需獨立服務、成本與安全設計。 |

## A — 年度回顧產生器

**實作提示詞：** 在 `server/routers/yearReview.ts` 新增指定年份的彙整 procedure，僅讀取已授權日記的 events、life phases 與媒體統計。呼叫現有 AI provider 前，要求使用者對該次處理明確同意，並遵循 `aiPrivacy.test.ts` 的偏好檢查。`client/src/pages/YearReview.tsx` 以時間帶與精選照片排版，提供 Markdown 匯出與沿用 `shareAccess` 的受控分享。新增 unit、router 與 privacy 測試；不得為空年度捏造經歷。

## B — 語音日記

**實作提示詞：** 在 Quick Note 加入 MediaRecorder 錄音控制，輸出 webm/opus，離線時先進 IndexedDB。恢復連線後才上傳至 storage，並透過可插拔 STT provider 轉寫；預設可採 Whisper 相容 API，self-hosting 可設定 faster-whisper endpoint。轉寫文字插入 DiaryEditor 草稿，原音作為可刪除附件。所有錄音必須顯示資料去向、保留與刪除說明，並測試拒絕權限、離線、上傳失敗和刪除。

## C — 成長數據儀表板

**實作提示詞：** 新增 `stats` feature router 與 server/db aggregation helpers，以 SQL group-by 計算 lifePhase 條目密度、phase keyword 頻率和寫作 streak。前端 Dashboard 使用 recharts 呈現貢獻圖式密度、關鍵字與 streak，禁止將原始私有事件全量拉至前端計算。覆蓋擁有權、空資料、時區邊界與分享範圍測試。

## D — 印刷級 PDF

**實作提示詞：** 新增受保護的 `/print` 路由與 A5 排版元件，指定日期範圍後依 lifePhase 分章、提供頁首頁尾與照片全幅版面。server 端以 Puppeteer 產生 PDF；開始前確認部署 runtime 的 Chromium 與資源限制，且所有圖片讀取必須維持現有媒體授權。產物採短效下載或使用者可控保存，並測試無權限、空內容、媒體失敗與字型 fallback。

## E — 家庭留言與共編

**實作提示詞：** 先在既有 FamilyInvite 骨架上做 event-level comments：以 tRPC 建立、列出、刪除，所有操作依 invite／owner scope 驗證。第二階段加入 reaction，避免偽造使用者內容。第三階段才在獨立 feature flag 下評估 Yjs/WebSocket CRDT，先完成 presence、斷線、衝突、資料保留與成本設計。每階段均需權限、刪除、邀請到期與未授權媒體測試。
