# 本機開發與設定

Chronicle 可在本機完成前端、型別、測試與正式建置工作。預設仍使用受管理的 Manus OAuth、Forge 儲存與 Forge AI；伺服器端現在也支援以設定切換 S3／MinIO 與 OpenAI-compatible 服務，且不改變既有媒體 URL 與 session cookie 合約。

請以 `.env` 保存本機設定，且永遠不要提交該檔案。環境變數名稱與用途如下。

| 類別       | 變數                                                         | 用途                            |
| ---------- | ------------------------------------------------------------ | ------------------------------- |
| 核心       | `NODE_ENV`、`PORT`                                           | 執行模式與服務埠。              |
| 資料庫     | `DATABASE_URL`                                               | MySQL/TiDB 相容連線字串。       |
| 工作階段   | `JWT_SECRET`                                                 | 簽發登入 cookie 的長隨機密鑰。  |
| OAuth      | `VITE_APP_ID`、`OAUTH_SERVER_URL`、`VITE_OAUTH_PORTAL_URL`   | 目前整合登入流程。              |
| 專案擁有者 | `OWNER_OPEN_ID`、`OWNER_NAME`                                | 擁有者識別與初始管理權限。      |
| 儲存與 AI  | `BUILT_IN_FORGE_API_URL`、`BUILT_IN_FORGE_API_KEY`           | 預設 Forge 媒體儲存與 AI 閘道。 |
| 前端整合   | `VITE_FRONTEND_FORGE_API_URL`、`VITE_FRONTEND_FORGE_API_KEY` | 需要前端代理時使用。            |
| 可觀測性   | `VITE_ANALYTICS_ENDPOINT`、`VITE_ANALYTICS_WEBSITE_ID`       | 可選的匿名網站分析。            |

## 提供者設定

| 領域     | 預設                   | 可選設定                                      | 說明                                                                                                                                                                                                                          |
| -------- | ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 認證     | `AUTH_DRIVER=manus`    | `AUTH_DRIVER=local`、`VITE_AUTH_DRIVER=local` | `local` 會顯示本機 email／密碼註冊與登入介面；前後端兩個變數必須同時設為 `local`。所有模式皆使用相同的簽章 session cookie，因此切換前請先規劃帳號遷移。                                                                       |
| 媒體儲存 | `STORAGE_DRIVER=forge` | `STORAGE_DRIVER=s3`                           | S3 模式需要 `STORAGE_S3_BUCKET`、`STORAGE_S3_REGION`、`STORAGE_S3_ACCESS_KEY_ID`、`STORAGE_S3_SECRET_ACCESS_KEY`；MinIO 另加 `STORAGE_S3_ENDPOINT`。所有媒體仍經 `/manus-storage/:key` 短效簽章代理，避免將 bucket 設為公開。 |
| AI       | `LLM_DRIVER=forge`     | `LLM_DRIVER=openai-compatible`                | OpenAI-compatible 模式需要 `LLM_BASE_URL`（應包含版本路徑，例如 `http://localhost:11434/v1`）及 `LLM_API_KEY`。模型名稱沿用呼叫端指定值。                                                                                     |

> 所有秘密都只能留在本機 `.env` 或部署環境的秘密設定中，不能提交至 Git。設定切換會在伺服器啟動時讀取；變更後請重新啟動開發服務。

### 本機帳密模式

本機帳密模式須先套用資料庫 migration，接著在 `.env` 設定 `AUTH_DRIVER=local` 與 `VITE_AUTH_DRIVER=local`，並確保 `JWT_SECRET` 是至少 32 位元組的隨機值。Email 會正規化並以唯一索引保護；密碼最少 12 字元，伺服器只會保存 scrypt 雜湊，不會保存或回傳原始密碼。此模式目前不寄送驗證信或密碼重設信，因此只適合受信任的自架環境；公開服務應先完成 email 驗證與重設流程。
