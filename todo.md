# Project TODO

> 本檔只作為目前指針；**禁止**記錄歷史執行過程、驗證逐筆結果或長期 backlog。現行工程工作見 [docs/roadmap/CURRENT_SPRINT.md](./docs/roadmap/CURRENT_SPRINT.md)，功能規劃見 [docs/roadmap/FEATURES.md](./docs/roadmap/FEATURES.md)，外部 OAuth 狀態見 [docs/AI_HANDOFF.md](./docs/AI_HANDOFF.md)。

- [x] 完成本輪治理、CI 防護與補記助手的 private-first MVP。
- [x] 建立 HEIC／Live Photo 的本機 metadata 預覽、確認後 private 匯入與 EXIF 日期保留流程。
- [x] 建立 ICS 日曆本機解析、審核與 private 時間軸草稿建立流程。
- [x] 建立分享照片的瀏覽器端人臉模糊副本流程，確保原圖不進入公開分享投影。
- [x] 將所有事件主圖來源限制為靜態 image 媒體，避免 Live Photo MOV 排序後被圖片預覽、Bento、比較或匯出誤用。
- [x] 核對最新已發布版本與 GitHub main，必要時以 CI 合併請求完成同步。
- [x] 為 ICS 週期性行程提供本機提示、審核與可選處理方式，避免自動展開或隱性建立事件。
- [x] 為瀏覽器端照片去識別化加入手動遮罩補正，並維持確認前不外送影像與臉部座標。
- [x] 為 HEIC／HEIF 批次匯入提供確認前容量估算，說明原檔與本機 JPEG 副本的預計儲存量。

## 已確認的非執行限制

使用者已要求跳過帳號建立、登入、OAuth 授權、個資填寫與每日排程啟用；不得代為執行。外部 Manus OAuth／Google 403 僅在外部服務恢復且使用者明確要求後重新驗證。
