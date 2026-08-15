# Chronicle 協作規範

## 產品與視覺準則

Chronicle 是個人成長史的敘事時間工作台。所有介面必須遵守 [`ideas.md`](./ideas.md) 的「編集室時間帶」規格：以時間刻度、索引與事件節點組織資訊；使用骨白紙材、深墨藍與僅用於關鍵操作的辰砂橘紅 `#EE623B`；展示字採 DM Serif Display，資料微文案採 IBM Plex Mono。避免通用卡片堆疊、大面積高飽和色與無目的動畫。

## 架構地圖

| 領域 | 位置 | 規則 |
|---|---|---|
| 前端頁面 | `client/src/pages/` | 專屬頁面保持資料讀取、版面組裝；可重用互動移至元件或 hooks。 |
| 共用元件 | `client/src/components/` | 優先使用既有 shadcn 元件；新元件需可存取與可鍵盤操作。 |
| API 合約 | `server/routers.ts` | 僅透過 tRPC；受保護資料使用 `protectedProcedure`。 |
| 資料存取 | `server/db.ts` | 所有日記資料須以使用者／日記擁有權篩選。 |
| 資料庫 | `drizzle/schema.ts`、`drizzle/` | 修改 schema 後必須產生、審閱並套用 migration。 |
| 檔案儲存 | `server/storage.ts` | 資料庫只存 key、URL 與中繼資料，不能存影像位元組。 |
| 規格與追蹤 | `ideas.md`、`todo.md` | 視覺規格不可違反；每項功能完成即更新 TODO。 |

## 開發指令

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm drizzle-kit generate
```

本機 Windows PowerShell 若未設定 `pnpm` 命令，請使用 `corepack.cmd pnpm`。修改資料庫時，先產生 migration、審閱 SQL，再依部署環境套用；不得以破壞性 SQL 清除使用者資料。

## 安全與品質規則

- 不提交 `.env`、金鑰、cookie、JWT、資料庫快照或真實使用者內容。
- 分享頁僅可讀取明確標示公開的事件；密碼、token 與媒體存取需維持現有授權模型。
- 新功能應有 Vitest 覆蓋；每次變更至少執行 `check`、`test` 與 `build`。
- 變更公開介面時，確認桌面與 375px 版面，以及 `prefers-reduced-motion` 行為。
- 未完成的控制項必須提供清楚提示，不能偽裝成已啟用的功能。
