# Current Sprint — Repository Governance

## 目標

收斂協作資訊源、將認證與分包防護納入 CI，並以 EXIF 匯入和每日回憶既有資料建立不外送內容的補記助手 MVP。任何需使用者登入、授權、填寫資料或啟用排程的流程維持跳過。

## 本 sprint 交付

- 將根 `todo.md` 縮為指針，建立文件目錄頁，並在協作者規範禁止回填歷史工作日誌。
- 讓 CI 明確執行 lazy route chunk verifier，並以本地 mock provider 驗證 OAuth callback／session 邊界，不依賴正式登入。
- 建立補記助手：僅在私人工作台讀取最小空窗與未整理照片計數，不建立通知、排程或內容外送。

## 本輪狀態

| 範圍 | 狀態 | 可驗證結果 |
| --- | --- | --- |
| 協作治理 | 已完成 | `todo.md` 已縮為指針；`docs/README.md` 與文件治理契約防止歷史日誌回填。 |
| CI 防護 | 已完成 | workflow 明確執行 mock OAuth callback smoke 與 lazy route verifier；測試不連線正式 OAuth。 |
| 補記助手 MVP | 已完成 | 只顯示 private 事件日期空窗與當前瀏覽器 EXIF 預覽數量；不讀取正文、GPS 或檔案內容，不建立通知或排程。 |

## 完成定義

每項變更都需具備可讀文件、必要的自動化覆蓋，且 `pnpm lint`、`pnpm check`、`pnpm test`、`pnpm build` 均通過。私有工作台變更另需完成隔離 local-auth 的桌面與 375px 回歸；公開首頁變更需完成 375px 與減少動態檢查。

## 外部阻礙

正式 Manus OAuth 入口目前回傳外部 CloudFront 403。因此，正式 OAuth `diary.get` 成功載入的驗證保留為 blocked，待外部入口恢復後再執行，不以隔離 local-auth 結果取代。

## 下一批私有匯入與分享交付

| 交付 | 資料與隱私邊界 | 驗收 |
| --- | --- | --- |
| HEIC／Live Photo 匯入 | 檔案選取後只在瀏覽器解析 capture time；確認前不建立事件、不上傳。Live Photo 的影像與對應影片個別列為候選，沒有配對時不得臆測關聯。 | 讀取可支援 HEIC 的 metadata；無日期保留手動候選；確認後只建立 private 事件。 |
| ICS 日曆草稿匯入 | `.ics` 只在瀏覽器解析為可編輯草稿；預覽不得寫入資料庫；匯入結果預設 private，忽略 alarm、attendee、organizer 與 URL 欄位。 | 支援 `VEVENT`、全日與 UTC／有時區事件；可排除項目、修訂日期與標題，確認後才批次建立 private 事件。 |
| 分享照片去識別化 | 人臉偵測、模糊與輸出在瀏覽器進行；原圖不可因公開分享而上傳或出現在分享投影。只有使用者確認的模糊副本可被作為分享媒體。 | 無人臉／有臉／偵測失敗均有明確結果；輸出副本不包含 EXIF；分享頁僅使用確認的副本 URL。 |

### 完成狀態

三項私有媒體交付已完成。HEIC／HEIF 只在擁有者確認匯入時於瀏覽器轉為 JPEG，並可將同名 MOV 作為明確可審核的 Live Photo companion 保存至同一 private 事件。ICS 僅在瀏覽器解析為可勾選、可修改的 private 草稿，且不帶入受邀者、提醒、外部 URL、附件或重複展開結果。分享去識別化使用瀏覽器內的人臉偵測與 Canvas 模糊；若副本被移除，分享頁會隱藏該媒體，絕不回退顯示私人原圖。
