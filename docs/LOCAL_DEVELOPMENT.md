# 本機開發與設定

Chronicle 目前可在本機完成前端、型別、測試與正式建置工作；現行登入、檔案儲存與 AI 呼叫仍依賴既有整合服務。下一個提供者抽象里程碑會補上本機帳密、S3/MinIO 與 OpenAI-compatible 替代實作。

請以 `.env` 保存本機設定，且永遠不要提交該檔案。環境變數名稱與用途如下。

| 類別 | 變數 | 用途 |
|---|---|---|
| 核心 | `NODE_ENV`、`PORT` | 執行模式與服務埠。 |
| 資料庫 | `DATABASE_URL` | MySQL/TiDB 相容連線字串。 |
| 工作階段 | `JWT_SECRET` | 簽發登入 cookie 的長隨機密鑰。 |
| OAuth | `VITE_APP_ID`、`OAUTH_SERVER_URL`、`VITE_OAUTH_PORTAL_URL` | 目前整合登入流程。 |
| 專案擁有者 | `OWNER_OPEN_ID`、`OWNER_NAME` | 擁有者識別與初始管理權限。 |
| 儲存與 AI | `BUILT_IN_FORGE_API_URL`、`BUILT_IN_FORGE_API_KEY` | 目前媒體儲存與 AI 閘道。 |
| 前端整合 | `VITE_FRONTEND_FORGE_API_URL`、`VITE_FRONTEND_FORGE_API_KEY` | 需要前端代理時使用。 |
| 可觀測性 | `VITE_ANALYTICS_ENDPOINT`、`VITE_ANALYTICS_WEBSITE_ID` | 可選的匿名網站分析。 |

未來可自架設定會引入 `STORAGE_DRIVER`、`STORAGE_S3_BUCKET`、`STORAGE_S3_ENDPOINT`、`LLM_DRIVER`、`LLM_BASE_URL` 和 `LLM_API_KEY`；在提供者抽象落地前，請勿假設這些變數已生效。
