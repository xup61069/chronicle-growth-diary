# Server Router 邊界

`server/routers.ts` 不是可刪除的舊版 re-export 檔。它是 Chronicle 的 **頂層 tRPC 組裝層**：建立 `appRouter`、定義 auth procedures，並將系統與功能 routers 掛載為一致的公開 API 合約。

| 區域 | 責任 | 變更規則 |
| --- | --- | --- |
| `server/_core/` | Framework runtime、OAuth callback、tRPC context、SDK、環境與 storage/LLM 基礎介面。 | 僅在擴充基礎設施時修改；一般產品功能不得繞過 router 直接操作 runtime。 |
| `server/routers.ts` | 頂層 router composition 與 auth procedures。 | 保持小而清楚；新增功能 router 時在此掛載，但不要把大型 feature procedure 直接堆入本檔。 |
| `server/routers/` | 依功能拆分的 tRPC contracts，例如 diary、share、year-review、stats 與 `photoMap`。 | 新功能應建立明確 feature router、使用 `publicProcedure` 或 `protectedProcedure`，再由頂層組裝。 |
| `server/db.ts` 與 `server/db/` | 日記擁有權、資料查詢與儲存協調。 | Router 只負責輸入／輸出合約；資料存取集中於此，所有私有資料必須以擁有者篩選。 |

## 遷移規則

新的產品 feature 應先建立 `server/routers/<feature>.ts`，把輸入 schema 與 procedure 留在同一 feature module；之後在 `server/routers.ts` 掛載。既有 auth 在頂層的原因是它和 session cookie、帳號刪除與 local-auth fallback 緊密耦合，遷移前需要先抽出 shared auth service 與完整回歸，不能只為目錄整齊而刪除頂層組裝。

這個邊界讓 `server/_core`、`server/routers.ts` 與 `server/routers/` 各自有不同且可檢驗的責任，而非混用兩套路由模式。

## 資料庫 migration 唯一來源

Drizzle 的唯一事實來源是根目錄 [`drizzle/`](../drizzle/)：`schema.ts` 定義目前 schema、`0000_*.sql` 至 `0020_*.sql` 是依序套用的 migration、`meta/` 保存 Drizzle snapshot 與 journal。`drizzle.config.ts` 的 `out` 固定為 `./drizzle`，因此**不得**在 `drizzle/migrations/` 或另一個平行目錄新增 SQL。

變更 schema 時，先修改 `drizzle/schema.ts`，再由 `pnpm drizzle-kit generate` 產生下一個 SQL 及 meta snapshot；審閱 SQL 後使用受控 migration 流程套用。若工具輸出位置或既有檔案結構不同，先停止並修正設定，不要複製 SQL 至兩個目錄。`server/__tests__/infrastructure/migrationLayout.test.ts` 會守護這個單一來源契約。

## 全量封存與還原

全量封存的讀取投影在 `server/db/fullDiaryArchive.ts`，ZIP 產生、manifest、瀏覽器端 SHA-256 驗證與下載在 `client/src/lib/fullDiaryArchive.ts`，而 owner-only 工作台入口位於 `client/src/pages/DiaryEditor.tsx`。封存 payload 僅保留可攜內容；它不含 session、token、密碼雜湊、分享憑證、來源 URL、storage key、存取紀錄、邀請或稽核資料。

還原不是一般 JSON 匯入。`server/routers/archiveRestore.ts` 只暴露 `protectedProcedure`，再由 `server/db/archiveRestore.ts` 透過 owner-only wrapper 執行。瀏覽器先讀取並驗證 `manifest.json`、固定資料 payload 和每一個附件的 SHA-256；`prepare` 將嚴格白名單 metadata 寫入 `growth_archive_restore_sessions` 與 `growth_archive_restore_assets`。`stageAsset` 對每項位元組重新核對 archive 宣告的大小與 SHA-256，成功後才寫入 private storage。只有全部附件就緒、使用者輸入固定確認字串、`commit` 在單一 transaction 完成時，才取代事件、標籤、回顧、修訂與附件，並把分享狀態強制重設為 `private`。

| 規則 | 實作與不可退化的邊界 |
| --- | --- |
| 格式與容量 | `chronicle-growth-diary-full` v1；最多 120 個附件、總 ZIP 100MB、單一附件 16MB。16MB 上限與 25MB tRPC body budget 的 base64 staging 相容。 |
| 失敗與取消 | staging、驗證、取消或 transaction 失敗時不得變更現有日記 rows；不得下載或建立部分 archive。 |
| 分享與機密 | 還原永遠不帶回 token、密碼、來源 URL、storage key、存取／邀請／稽核資料；commit 後分享強制為 private。 |
| 暫存維護 | session 30 分鐘失效。現階段取消或失效只改變 session 狀態，尚未刪除 private storage 的 orphan staging object；未來若做清理，先讀排程規範並保留「不碰日記 rows」契約。 |

還原流程或 schema 有任何變動時，需更新 `client/src/lib/fullDiaryArchive.test.ts`、`server/db/archiveRestore.test.ts`、`server/__tests__/infrastructure/fullArchiveSecurity.test.ts`，並以隔離 local-auth 桌面與 375px E2E 驗證 owner-only 工作台。

## 受保護的照片位置地圖

`server/routers/photoMap.ts` 是照片匯入的使用者觸發地圖合約。它使用 `protectedProcedure` 驗證範圍合法的緯度與經度，再透過 `server/_core/map.ts` 的既有 Maps proxy 取得短生命週期的預覽資料。它不是事件位置資料庫，也不得在頁面載入、EXIF 解析或背景工作時自動呼叫。

前端只在確認前的私有照片候選保留座標與地圖影像；使用者可點選或拖曳地圖標記更新本機座標。確認建立後，資料層只從群組中最早的有效候選推導 `precise`／`private` 事件位置。公開與 link 讀取模型不得加入任何 GPS、地圖影像或位置精度欄位。
