# 安全性、隱私與弱點回報

Chronicle 處理私人日記、影像、受控分享與可能涉及家庭成員的內容。安全問題、真實使用者內容與任何憑證都不應出現在公開 Issue、Pull Request、Discussion、測試 fixture、截圖或 commit 訊息。

## 私密弱點回報

請優先使用 GitHub 儲存庫的 **Security** 頁面建立 private vulnerability report，並提供受影響版本、最小可重現步驟、預期與實際行為、潛在影響，以及任何可安全分享的修正建議。若該入口不可用，請聯絡儲存庫擁有者，且不要先公開技術細節。維護者會確認收到回報、評估影響、安排修正，並在風險排除後以 Release 或安全公告說明。

> 絕不公開 session cookie、OAuth `state`、分享 token、密碼、資料庫連線字串、S3／私有媒體 URL、LLM API key 或真實日記內容。

## 安全邊界

| 領域 | 必要控制 | 變更時的驗證 |
| --- | --- | --- |
| OAuth 與 session | 登入 callback 必須驗證一次性 `state`／nonce。`app_session_id` 為 HttpOnly、Secure、Path `/`、`SameSite=Lax`；僅短效 OAuth state nonce 使用 `SameSite=None; Secure` 以支援跨站授權回呼。 | `server/__tests__/auth/auth.local.test.ts`、`oauth.callback.test.ts`、`auth.logout.test.ts` 與 `server/routers/localAuthDriver.test.ts`；不在測試或文件中放入真實 token。 |
| 日記與媒體 | 所有私有讀寫均以擁有者篩選；資料庫只保存媒體 key、URL 與中繼資料，不保存影像位元組。 | 跨帳號、刪除、媒體與分享範圍回歸。 |
| 分享與家庭協作 | 僅明確標記可分享的事件可離開私有邊界；密碼、invite 與 link token 不得以明文保存。 | public／link／private 範圍、到期、密碼和邀請 token 測試。 |
| AI | AI 回顧必須有日記層級的明確啟用狀態；本機 writing guide 不傳送日記內容。 | AI 偏好、輸入最小化、失敗與刪除行為測試。 |
| 精確位置與地圖 | EXIF GPS 僅在使用者明確開啟位置工具時於本機讀取；地圖只可由已登入使用者明確觸發並經受保護代理取得，影像不得持久化。 | 座標成對與範圍驗證、未觸發前無地圖請求、private precise 寫入、public／link 隔離與拖曳後 payload 一致性回歸。 |
| 匯入／匯出 | 匯出不得包含 session、憑證、密碼雜湊、分享 token、存取紀錄或私有 storage key。全量 ZIP 還原必須先在瀏覽器驗證 manifest／payload／附件 checksum，再由 owner-only staging 重新核對大小與 SHA-256；僅 typed confirmation 的單一交易可覆寫日記，且結果強制 private。 | portable、frontmatter、media archive、`fullDiaryArchive.test.ts`、`archiveRestore.test.ts`、全量封存 security contract 與 owner-only E2E。 |

## 家庭與兒童資料

Chronicle 的資料模型可以記錄家庭成長故事，但這不代表可任意收集或公開兒童資料。帳號擁有者應只上傳自己有權處理的內容，並先取得必要的家長、監護人或其他權利人同意。任何分享預設必須維持私有；公開連結、封面、地點、影像與 AI 摘要應由擁有者逐項判斷是否適合揭露。

產品不應以兒童為直接註冊對象，也不應將年齡、學校、精確地點、健康、財務、可辨識影像或聯絡方式作為不必要的必填資料。若未來要面向兒童提供帳號、跨境資料處理或商業化服務，必須在上線前取得合格的法律與隱私審查；本文件不是特定司法管轄區的合規保證。

## 支援範圍

請回報跨帳號存取、分享繞過、invite／token 重複使用、未授權媒體讀取、意外外傳至 AI 提供者、敏感資料洩漏、匯入／匯出越權、session 固定或 callback 驗證問題。一般使用、功能與設計建議請依 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 提出。
