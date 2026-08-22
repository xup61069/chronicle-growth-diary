# Project TODO

> 本檔只保留 sprint 指針，不記錄執行歷程或 backlog。現行工作見 [CURRENT_SPRINT](./docs/roadmap/CURRENT_SPRINT.md)，規劃見 [FEATURES](./docs/roadmap/FEATURES.md)，OAuth 狀態見 [AI_HANDOFF](./docs/AI_HANDOFF.md)。

- [x] 完成本輪治理、CI 防護與補記助手的 private-first MVP。
- [x] 建立 HEIC／Live Photo 的本機 metadata 預覽、確認後 private 匯入與 EXIF 日期保留流程。
- [x] 建立 ICS 日曆本機解析、審核與 private 時間軸草稿建立流程。
- [x] 建立分享照片的瀏覽器端人臉模糊副本流程，確保原圖不進入公開分享投影。
- [x] 將所有事件主圖來源限制為靜態 image 媒體，避免 Live Photo MOV 排序後被圖片預覽、Bento、比較或匯出誤用。
- [x] 核對最新已發布版本與 GitHub main，必要時以 CI 合併請求完成同步。
- [x] 為 ICS 週期性行程提供本機提示、審核與可選處理方式，避免自動展開或隱性建立事件。
- [x] 為瀏覽器端照片去識別化加入手動遮罩補正，並維持確認前不外送影像與臉部座標。
- [x] 為 HEIC／HEIF 批次匯入提供確認前容量估算，說明原檔與本機 JPEG 副本的預計儲存量。
- [x] 收斂單一功能單一 PR 規則、文件入口與元件領域結構，避免例行紀錄單獨洗 PR。
- [x] 補強 mock OAuth callback 的瀏覽器端對端防護，並完成依賴與 secret 掃描結果記錄。
- [x] 實作 PWA Web Share Target，將系統分享內容導入既有 private QuickNote 草稿入口，不自動寫入事件。
- [x] 修補 Express 傳遞 `path-to-regexp` 的 production 高風險依賴，或記錄經驗證的升級 blocker、風險範圍與後續處置。
- [x] 完成 owner 全量封存下載與完整性驗證。
- [x] 建立全量封存 ZIP 的可審核還原精靈，包含完整性驗證、衝突處理、資料覆寫保護與附件還原進度。
- [x] 提供全量 ZIP 匯出進度與完成摘要。
- [x] 核對發布與 GitHub main，補齊 AI 交接、架構、安全、驗證與協作指引。
- [ ] 將 AI 交接、架構、安全與文件索引更新以單一文件治理 PR 同步 GitHub，CI 通過後合併並核對 main SHA。
- [ ] 保存文件治理 checkpoint，保留可回復的交接版本。

## 已確認的非執行限制

使用者已要求跳過帳號建立、登入、OAuth 授權、個資填寫與每日排程啟用；不得代為執行。外部 Manus OAuth／Google 403 僅在外部服務恢復且使用者明確要求後重新驗證。
