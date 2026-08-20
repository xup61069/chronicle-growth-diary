# Server Router 邊界

`server/routers.ts` 不是可刪除的舊版 re-export 檔。它是 Chronicle 的 **頂層 tRPC 組裝層**：建立 `appRouter`、定義 auth procedures，並將系統與功能 routers 掛載為一致的公開 API 合約。

| 區域 | 責任 | 變更規則 |
| --- | --- | --- |
| `server/_core/` | Framework runtime、OAuth callback、tRPC context、SDK、環境與 storage/LLM 基礎介面。 | 僅在擴充基礎設施時修改；一般產品功能不得繞過 router 直接操作 runtime。 |
| `server/routers.ts` | 頂層 router composition 與 auth procedures。 | 保持小而清楚；新增功能 router 時在此掛載，但不要把大型 feature procedure 直接堆入本檔。 |
| `server/routers/` | 依功能拆分的 tRPC contracts，例如 diary、share 與未來 year-review、stats。 | 新功能應建立明確 feature router、使用 `publicProcedure` 或 `protectedProcedure`，再由頂層組裝。 |
| `server/db.ts` 與 `server/db/` | 日記擁有權、資料查詢與儲存協調。 | Router 只負責輸入／輸出合約；資料存取集中於此，所有私有資料必須以擁有者篩選。 |

## 遷移規則

新的產品 feature 應先建立 `server/routers/<feature>.ts`，把輸入 schema 與 procedure 留在同一 feature module；之後在 `server/routers.ts` 掛載。既有 auth 在頂層的原因是它和 session cookie、帳號刪除與 local-auth fallback 緊密耦合，遷移前需要先抽出 shared auth service 與完整回歸，不能只為目錄整齊而刪除頂層組裝。

這個邊界讓 `server/_core`、`server/routers.ts` 與 `server/routers/` 各自有不同且可檢驗的責任，而非混用兩套路由模式。
