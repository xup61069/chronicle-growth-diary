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
