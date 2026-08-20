# 貢獻 Chronicle

感謝你協助讓個人成長史的記錄工具更可靠、更可攜。開始前請閱讀 [`AGENTS.md`](./AGENTS.md)、[`ideas.md`](./ideas.md)、[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)、[`docs/TESTING.md`](./docs/TESTING.md) 與 [`SECURITY.md`](./SECURITY.md)。

## 開發環境與品質閘門

使用 Node.js 22 與 Corepack，將 `.env.example` 複製為未追蹤的 `.env`，只填入本機環境所需值。不得提交 `.env`、token、cookie、真實日記、資料庫快照或私有媒體。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

若修改公開首頁，另以 HTTPS 預覽設定 `CHRONICLE_E2E_BASE_URL` 並執行 `corepack pnpm test:e2e:mobile-nav`。本機 auth 互動可使用隔離的 `test:e2e:isolated`；它建立並清除測試帳號，不能取代正式 OAuth 的整合驗證。

## Pull Request 準則

每個 Pull Request 應聚焦單一問題，清楚說明使用者影響、資料模型或 migration、隱私影響、測試結果與桌面／375px 檢視。請避免把格式化、重命名與功能改動混在同一個 PR。變更公開 API、分享、媒體、AI 或匯入／匯出時，必須明確說明誰可讀寫資料、哪些內容會離開裝置或伺服器、如何失敗及如何復原。

| 變更類型 | 最低要求 |
| --- | --- |
| Schema 或 migration | 產生、審閱並套用 migration；不得以破壞性 SQL 清除使用者資料。 |
| tRPC router | 使用正確的 `publicProcedure`／`protectedProcedure`；私有資料查詢必須有擁有權篩選。 |
| UI／互動 | 使用現有元件與「編集室時間帶」視覺規格；可鍵盤操作、保留焦點可見性，並尊重減少動態偏好。 |
| 測試 | 遵循 [`docs/TESTING.md`](./docs/TESTING.md)；新單元測試預設 co-locate，跨領域測試放在正確的 `__tests__` 領域。 |
| 文件 | 更新 README、roadmap 或安全文件的可重現事實；版本敘事放 Releases，長篇討論放 Discussions。 |

## 家庭與兒童資料

貢獻者不得建立含真實兒童、家庭成員或日記資料的 fixture、截圖與 demo。使用合成資料並假定所有日記預設私有。任何會擴大家庭協作、公開分享、AI 處理或兒童帳號範圍的 PR，必須在描述中寫出同意、資料最小化、保留期限與刪除路徑；若涉及法規判斷，先取得適當的法律／隱私審查。

## 社群與安全

請遵守 [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)。安全漏洞依 [`SECURITY.md`](./SECURITY.md) 的私密流程回報，勿公開附上可利用細節或任何敏感資料。
