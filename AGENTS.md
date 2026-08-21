# Chronicle 協作規範

> **所有 AI 協作者的第一入口。** 開始前依序讀取本檔、[`docs/AI_HANDOFF.md`](./docs/AI_HANDOFF.md)、[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)，再依任務讀取架構、測試、安全與本機開發文件。交接狀態、已知 blocker 與後續優先順序只以 `docs/AI_HANDOFF.md` 為準，避免從舊對話或 commit history 猜測。

## 產品與視覺準則

Chronicle 是個人成長史的敘事時間工作台。所有介面必須遵守 [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) 的「編集室時間帶」規格：以時間刻度、索引與事件節點組織資訊；使用骨白紙材、深墨藍與僅用於關鍵操作的辰砂橘紅 `#EE623B`；展示字採 DM Serif Display，資料微文案採 IBM Plex Mono。避免通用卡片堆疊、大面積高飽和色與無目的動畫。

## 架構地圖

| 領域 | 位置 | 規則 |
|---|---|---|
| 前端頁面 | `client/src/pages/` | 專屬頁面保持資料讀取、版面組裝；可重用互動移至元件或 hooks。 |
| 共用元件 | `client/src/components/` | 優先使用既有 shadcn 元件；新元件需可存取與可鍵盤操作。 |
| API 合約 | `server/routers.ts` | 僅透過 tRPC；受保護資料使用 `protectedProcedure`。 |
| 資料存取 | `server/db.ts` | 所有日記資料須以使用者／日記擁有權篩選。 |
| 資料庫 | `drizzle/schema.ts`、`drizzle/` | 修改 schema 後必須產生、審閱並套用 migration。 |
| 檔案儲存 | `server/storage.ts` | 資料庫只存 key、URL 與中繼資料，不能存影像位元組。 |
| 規格與追蹤 | `docs/DESIGN_SYSTEM.md`、`todo.md`、GitHub Issues | 視覺規格不可違反；每項功能完成即更新 TODO，後續 backlog 以 GitHub Issues 追蹤。 |

## 開發指令

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm drizzle-kit generate
```

本機 Windows PowerShell 若未設定 `pnpm` 命令，請使用 `corepack.cmd pnpm`。修改資料庫時，先產生 migration、審閱 SQL，再依部署環境套用；不得以破壞性 SQL 清除使用者資料。

## AI 執行順序與 GitHub 交接

1. 先執行 `git status -sb` 與 `git log -1 --oneline`；工作樹若混有非本任務改動，只 stage 自己的檔案，不得用 reset、checkout 或強推清除它們。
2. 每次收到新功能、改動或 bug，都先在 `todo.md` 新增 `[ ]` 項目，建立資料與隱私邊界後再實作；完成後才標為 `[x]`。
3. 私有資料一律最小化：預設 private，媒體不入資料庫，公開／link 範圍不得得到 private 事件、位置、語音、AI 或家庭欄位。AI、語音、GPS 地圖、媒體上傳與匯出需有使用者明確觸發或同意。
4. 修改公開 UI 時，檢查預設深色模式、可切換主題、鍵盤焦點、375px 與 `prefers-reduced-motion`。修改私有 UI 時，另以隔離 local-auth 回歸驗證 owner 與分享隔離。
5. 修改完成後至少執行 `pnpm lint`、`pnpm check`、`pnpm test`、前端 Vite build、伺服器 esbuild 與 `git diff --check`；必要時執行對應 E2E。完整命令與範圍見 [`docs/AI_HANDOFF.md`](./docs/AI_HANDOFF.md)。
6. 交付前建立 checkpoint，使用 `gh` 同步 GitHub，確認遠端 SHA；回報實際通過項目與真實 blocker。不得把外部 OAuth／服務問題以 mock、local-auth 或推測誤報為正式整合成功。

## 安全與品質規則

- 不提交 `.env`、金鑰、cookie、JWT、資料庫快照或真實使用者內容。
- 分享頁僅可讀取明確標示公開的事件；密碼、token 與媒體存取需維持現有授權模型。
- 新功能應有 Vitest 覆蓋；每次變更至少執行 `check`、`test` 與 `build`。
- 變更公開介面時，確認桌面與 375px 版面，以及 `prefers-reduced-motion` 行為。
- 未完成的控制項必須提供清楚提示，不能偽裝成已啟用的功能。
- 不得提交 `.env`、金鑰、cookie、JWT、真實家庭／兒童資料、私人媒體、地圖影像或測試帳號；也不得創造虛構評論、評分或使用者內容。
- 照片 EXIF 與 GPS 匯入需遵守本機預覽、確認後才上傳的模型；GPS／地圖只能在使用者明確要求位置工具時讀取或請求，且只可保存為 `private precise` 位置。詳見 [`docs/AI_HANDOFF.md`](./docs/AI_HANDOFF.md)。
- 測試採「單一模組預設 co-locate、跨檔入口／文件／基礎設施契約置於具名 `__tests__` 領域」的兩層規則；不得在 `client/src/` 或 `server/` 根層新增測試。完整位置與最低驗證見 [`docs/TESTING.md`](./docs/TESTING.md)。
