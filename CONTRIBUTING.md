# 貢獻 Chronicle

感謝你協助讓個人成長史的記錄工具更可靠、更可攜。開始前請閱讀 [`AGENTS.md`](./AGENTS.md)、[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)、[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)、[`docs/TESTING.md`](./docs/TESTING.md) 與 [`SECURITY.md`](./SECURITY.md)。

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

每個 Pull Request 應聚焦單一問題，清楚說明使用者影響、資料模型或 migration、隱私影響、測試結果與桌面／375px 檢視。請避免把格式化、重命名與功能改動混在同一個 PR；不能安全拆分時，請在描述中說明相依原因。例行同步檢查、逐筆驗證與 checkpoint 敘事不是獨立 PR 主題，應隨相關功能合併，或移至 CI artifact／Release。變更公開 API、分享、媒體、AI 或匯入／匯出時，必須明確說明誰可讀寫資料、哪些內容會離開裝置或伺服器、如何失敗及如何復原。

| 變更類型 | 最低要求 |
| --- | --- |
| Schema 或 migration | 產生、審閱並套用 migration；不得以破壞性 SQL 清除使用者資料。 |
| tRPC router | 使用正確的 `publicProcedure`／`protectedProcedure`；私有資料查詢必須有擁有權篩選。 |
| UI／互動 | 使用現有元件與「編集室時間帶」視覺規格；可鍵盤操作、保留焦點可見性，並尊重減少動態偏好。 |
| 測試 | 遵循 [`docs/TESTING.md`](./docs/TESTING.md)；新單元測試預設 co-locate，跨領域測試放在正確的 `__tests__` 領域。 |
| 文件 | 更新 README、roadmap 或安全文件的可重現事實；版本敘事放 Releases，長篇討論放 Discussions。 |

若修改 `README.md` 的功能、隱私、驗證命令或專案地圖，必須在同一 Pull Request 同步審閱與更新 `README.en.md`。兩份 README 僅保留入口、已驗證能力與資料邊界；較長的技術說明應移至 `docs/`，並從 README 連結。

`template.json` 是早期 static scaffold 快照，並非此全端 Chronicle 部署所使用的設定來源，請勿以它的舊依賴或指令修改產品。`patches/wouter@3.7.1.patch` 則是仍生效的 pnpm 修補：它在 `wouter@3.7.1` 的 `Switch` 收集 route path，供 Manus runtime／測試工具取得路由資訊。只有在升級 Wouter 後確認標準套件已有等效 route 觀測能力，並完成路由、公開首頁與工作台回歸後，才能移除該修補與 `package.json`／lockfile 對應設定。

新增或升級重量級依賴時，請在 PR 說明用途、瀏覽器／伺服器載入策略、移除條件與替代方案；並執行 `pnpm audit --prod`。提交前執行專案指定的 secret scan，不得將其結果、掃描輸出或任何疑似金鑰寫入版本庫。

| 依賴 | 引入理由與載入策略 | 移除條件 |
| --- | --- | --- |
| `heic-to` | 只在擁有者確認 HEIC／HEIF 匯入時動態載入並於瀏覽器轉成 JPEG；不納入 PWA 初始預快取。 | 瀏覽器原生 HEIC 解碼可穩定涵蓋目標裝置，或改用有等效本機處理能力的較小工具。 |
| `@tensorflow-models/face-detection` 與 `@tensorflow/tfjs-*` | 只在擁有者要求建立分享用去識別化副本時載入；使用裝置內 WebGL，失敗時回退 CPU，不上傳影像或座標。 | 有較小、同樣完全離線且可輸出可審核臉部區域的替代方案。 |
| `ical.js` | 僅在選取 `.ics` 後於瀏覽器解析、限制週期展開並產生 private 草稿。 | 瀏覽器提供可用且相容 RFC 5545 的原生 parser，或維護成本明顯較低的同等本機 parser。 |

## 家庭與兒童資料

貢獻者不得建立含真實兒童、家庭成員或日記資料的 fixture、截圖與 demo。使用合成資料並假定所有日記預設私有。任何會擴大家庭協作、公開分享、AI 處理或兒童帳號範圍的 PR，必須在描述中寫出同意、資料最小化、保留期限與刪除路徑；若涉及法規判斷，先取得適當的法律／隱私審查。

## 社群與安全

請遵守 [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)。安全漏洞依 [`SECURITY.md`](./SECURITY.md) 的私密流程回報，勿公開附上可利用細節或任何敏感資料。
