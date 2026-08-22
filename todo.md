# TODO

> Sprint 指針：見 [CURRENT_SPRINT](./docs/roadmap/CURRENT_SPRINT.md)、[FEATURES](./docs/roadmap/FEATURES.md)、[AI_HANDOFF](./docs/AI_HANDOFF.md)。

- [x] 完成治理、CI 防護與補記 MVP。
- [x] 完成 HEIC／Live Photo 私有匯入。
- [x] 完成 ICS private 草稿匯入。
- [x] 完成私有分享影像去識別化。
- [x] 限制 Live Photo MOV 不做事件主圖。
- [x] 核對最新已發布版本與 GitHub main，必要時以 CI 合併請求完成同步。
- [x] 為 ICS 週期性行程提供本機提示、審核與可選處理方式，避免自動展開或隱性建立事件。
- [x] 為瀏覽器端照片去識別化加入手動遮罩補正，並維持確認前不外送影像與臉部座標。
- [x] 為 HEIC／HEIF 批次匯入提供確認前容量估算，說明原檔與本機 JPEG 副本的預計儲存量。
- [x] 收斂單一功能單一 PR 規則、文件入口與元件領域結構，避免例行紀錄單獨洗 PR。
- [x] 補強 mock OAuth callback 的瀏覽器端對端防護，並完成依賴與 secret 掃描結果記錄。
- [x] 實作 PWA Web Share Target，將系統分享內容導入既有 private QuickNote 草稿入口，不自動寫入事件。
- [x] 修補 Express 5 wildcard 路由安全回歸。
- [x] 全量封存驗證完成。
- [x] 建立全量封存 ZIP 的可審核還原精靈，包含完整性驗證、衝突處理、資料覆寫保護與附件還原進度。
- [x] 全量 ZIP 匯出進度。
- [x] 核對發布與 GitHub main，補齊 AI 交接、架構、安全、驗證與協作指引。
- [x] 將 AI 文件治理 PR 合併並核對 GitHub main SHA。
- [x] 保存文件治理 checkpoint。
- [x] 修復 GitHub Chromium mock OAuth callback 的冷啟動逾時，讓文件治理 PR 的必要 CI 可穩定通過。
- [x] 完成 secret scan、production audit 與依賴紀錄。
- [x] 更新雙語 README、PR 檢核與還原演練。
- [ ] 同步 P0 文件治理與稽核 PR。

## 已確認的非執行限制

使用者已要求跳過帳號建立、登入、OAuth 授權、個資填寫與每日排程啟用；不得代為執行。外部 Manus OAuth／Google 403 僅在外部服務恢復且使用者明確要求後重新驗證。
