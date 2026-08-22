# TODO

> Sprint 指針：見 [CURRENT_SPRINT](./docs/roadmap/CURRENT_SPRINT.md)、[FEATURES](./docs/roadmap/FEATURES.md)、[AI_HANDOFF](./docs/AI_HANDOFF.md)。

- [x] 完成治理、CI 防護與補記 MVP。
- [x] 完成 HEIC／Live Photo 私有匯入。
- [x] 完成 ICS private 草稿匯入。
- [x] 完成私有分享影像去識別化。
- [x] 限制 Live Photo MOV 不做事件主圖。
- [x] 核對已發布版本與 GitHub main。
- [x] 完成 ICS 週期性審核。
- [x] 加入私有分享影像手動遮罩。
- [x] 加入 HEIC 批次匯入容量估算。
- [x] 制定單一功能 PR 與文件治理規則。
- [x] 補強 mock OAuth callback 的瀏覽器端對端防護，並完成依賴與 secret 掃描結果記錄。
- [x] 實作 PWA Web Share Target，將系統分享內容導入既有 private QuickNote 草稿入口，不自動寫入事件。
- [x] 修補 Express 5 wildcard 路由安全回歸。
- [x] 全量封存驗證完成。
- [x] 完成可審核全量 ZIP 還原。
- [x] 全量 ZIP 匯出進度。
- [x] 完成 AI 交接與 GitHub 核對。
- [x] 將 AI 文件治理 PR 合併並核對 GitHub main SHA。
- [x] 保存文件治理 checkpoint。
- [x] 修復 OAuth Chromium CI 冷啟動逾時。
- [x] 完成 secret scan、production audit 與依賴紀錄。
- [x] 更新雙語 README、PR 檢核與還原演練。
- [x] 同步 P0 文件治理與稽核 PR。
- [x] 實作 owner-only AI 精選建議：經逐次同意後只評估 private 事件、產生可審核候選、不自動寫入或公開資料。
- [x] 同步 AI 精選建議的單一功能 PR。
- [x] 建立本機旅程候選檢視：本輪照片在明確分析與審核後才併入既有 private 匯入。
- [x] 私有旅程候選手動日期與封面審核。
- [x] Day One private 審核匯入。
- [x] 可選家庭共用大事記圖層。

## 已確認的非執行限制

使用者已要求跳過帳號建立、登入、OAuth 授權、個資填寫與每日排程啟用；不得代為執行。外部 Manus OAuth／Google 403 僅在外部服務恢復且使用者明確要求後重新驗證。
