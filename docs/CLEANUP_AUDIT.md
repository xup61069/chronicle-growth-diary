# 模板清理稽核

本文件記錄 2026-08 的 Phase 0 靜態引用稽核。稽核以 `client`、`server` 與 `shared` 的 TypeScript／TSX 匯入為基礎；刪除後已執行型別檢查、Vitest 和正式建置。

| 類別 | 移除內容 | 理由 |
|---|---|---|
| 範例功能 | `AIChatBox`、`Map`、`ComponentShowcase` | 沒有任何產品頁面匯入，且不屬於成長日記流程。 |
| 平台範例 | `dataApi`、`imageGeneration`、`voiceTranscription`、`heartbeat` | 現有路由與產品功能皆未引用；後續需要時可依整合規格重新加入。 |
| UI 範例 | accordion、alert、badge、calendar、command、drawer、form、pagination、select、tabs 等 36 個未匯入元件 | 靜態引用稽核確認未被 Chronicle 的頁面或共用元件使用。 |
| 資料視覺化與輪播 | chart、carousel、`recharts`、`embla-carousel-react`、`framer-motion` | 僅服務於已移除的模板元件或展示頁。 |
| 表單與互動模板 | 未使用的 Radix primitives、`react-hook-form`、`react-day-picker`、`input-otp`、`cmdk`、`vaul`、`react-resizable-panels` | 專案目前採原生受控欄位與既有 sidebar／dialog 元件，沒有直接引用。 |

下列依賴雖然靜態引用量較少，但仍保留：`mysql2` 為 Drizzle MySQL driver 的執行期相依；AWS SDK 為下一階段 S3/MinIO provider 抽象預留；`dotenv` 為自架啟動組態預留；React、React DOM、tRPC、Drizzle、cookie、jose、Zod、jsPDF、html2canvas、Sonner 及現存 UI primitives 都有產品路徑或框架層依賴。

後續新增 UI 元件或依賴前，應先確認它服務於明確使用者流程，並在 Pull Request 中說明保留原因。此稽核是靜態清理基線，不取代 bundle 分析與執行期測試。
