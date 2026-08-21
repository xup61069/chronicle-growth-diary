# Chronicle AI 交接手冊

> **交接狀態：** 近期已完成預設深色主題，以及照片 EXIF 日期、GPS、受保護地圖、批次秒級時間遞增的私人匯入流程。下一位 AI 應從本檔與根目錄 [`AGENTS.md`](../AGENTS.md) 開始，而不是從 commit history 或舊對話推測狀態。

## 1. 產品定位與不可變更原則

Chronicle 是一個以時間軸管理個人成長史的**私人日記工作台**。它不是社群動態牆；介面應幫助使用者整理自己記下的事件、媒體、生命階段與回顧。

所有 UI 必須遵守 [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) 的 Swiss Editorial Archive／「編集室時間帶」語言：深墨藍、骨白紙材、僅用於關鍵動作的辰砂橘紅 `#EE623B`、DM Serif Display 標題與 IBM Plex Mono 資料微文案。網站目前**預設深色模式**，但使用者可切換並保留偏好；不要讓新功能破壞深色對比、鍵盤焦點或 `prefers-reduced-motion`。

| 原則 | 必須遵守的行為 |
| --- | --- |
| 私有優先 | 事件預設 private。分享頁只能接收明確公開／連結範圍允許的投影資料。 |
| 明確觸發 | AI、語音轉寫、GPS 地圖、媒體上傳與匯出不可在預覽或頁面載入時自動執行。 |
| 最小資料 | 資料庫不存媒體位元組；位置、逐字稿、媒體、密碼與 token 不可漏到公開／連結頁。 |
| 不造假 | 不建立真實家庭資料、兒童資料、使用者評論、範例日記或未經驗證的功能宣稱。 |
| 可回歸 | 改動需要對應單元測試，並依影響範圍覆蓋桌面、375px、私有或公開流程。 |

## 2. 開始任何任務前

在修改前，依序完成下列步驟。若工作樹存在非本任務變更，保留它們，只 stage 自己負責的檔案。

```bash
git status -sb
git log -1 --oneline
corepack pnpm install --frozen-lockfile
```

接著讀取根目錄 [`AGENTS.md`](../AGENTS.md)、本檔、相關頁面／router／測試，以及必要的領域文件：

| 情境 | 先讀取 |
| --- | --- |
| 前端或互動 | [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)、[`TESTING.md`](./TESTING.md) |
| tRPC、授權或資料庫 | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)、[`SECURITY.md`](../SECURITY.md) |
| 本機或隔離驗證 | [`docs/LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md) |
| 產品優先順序 | [`docs/roadmap/FEATURES.md`](./roadmap/FEATURES.md) 與 [`todo.md`](../todo.md) |
| 照片 EXIF／GPS 匯入 | `/home/ubuntu/skills/privacy-first-photo-date-import/SKILL.md` 與 `client/src/lib/photoExifImport.ts` |

## 3. 架構地圖

| 層級 | 主要位置 | 修改責任 |
| --- | --- | --- |
| React 頁面 | `client/src/pages/` | 組裝資料與版面；避免把跨頁邏輯堆進單一頁面。 |
| 共用 UI | `client/src/components/` | 優先重用既有元件；互動必須可鍵盤操作並有可見焦點。 |
| 前端資料與純函式 | `client/src/lib/` | 將分組、驗證、投影與可測試邏輯維持為純函式並 co-locate Vitest。 |
| tRPC 組裝 | `server/routers.ts` | 只掛載 feature router 與共用程序，不把大型功能直接塞進此檔。 |
| 功能 router | `server/routers/` | 用輸入 schema、`publicProcedure`／`protectedProcedure` 定義合約。 |
| 資料與擁有權 | `server/db.ts`、`server/db/` | 私有讀寫必須以 diary owner／member 範圍查詢；router 不直接繞過資料層。 |
| 基礎設施 | `server/_core/` | OAuth、storage、Maps、LLM 的 runtime 邊界；一般產品功能不要直接修改。 |
| Schema | `drizzle/schema.ts`、`drizzle/` | schema 變更須產生、審閱、套用 migration；禁止破壞性清除使用者資料。 |

## 4. 近期照片匯入能力與安全邊界

照片匯入主要集中於 `client/src/lib/photoExifImport.ts`、`client/src/pages/DiaryEditor.tsx`、`server/routers/photoMap.ts` 與 `server/_core/map.ts`。

| 能力 | 現行邊界 | 不可退化的測試要求 |
| --- | --- | --- |
| EXIF 日期 | JPEG 的 `DateTimeOriginal`／`CreateDate` 在瀏覽器本機解析。缺少日期的有效 JPEG 保留為手動候選，不靜默略過。 | 標準 JPEG fixture、手動填入、重新分組。 |
| GPS | 只有匯入預覽明確提供位置功能時才在本機讀取標準 EXIF GPS；緯經度須成對且在合法範圍。 | GPS IFD fixture、人工校正、範圍／成對驗證。 |
| 地圖 | 使用者按下確認位置後才透過受保護 `photoMap.preview`／Maps proxy 請求影像。地圖影像不持久化。 | 未按前沒有請求；點選或拖曳後 GPS 草稿更新、舊圖失效。 |
| 儲存 | 確認前不得上傳或建立事件。確認後只建立 private 事件；位置僅以 `precise`／`private` 寫入。 | 桌面與 375px 攔截 `diary.createEvent`，驗證拖曳後座標出現在最終 private payload。 |
| 批次時間 | 僅套用已勾選照片；第一張使用 base 時間，後續依穩定預覽順序加上 `index × incrementSeconds`。 | 秒級遞增、未選取照片不變、立即重新分組。 |
| 進度 | 確認後逐張更新目前檔名與完成數；使用具名 `role="progressbar"`。 | 延遲附件請求、桌面與 375px 可見進度。 |

**禁止** 將照片 GPS、地圖影像或 precise 位置改為公開分享、連結分享、自動背景讀取或永久快取；若必須擴張範圍，先完成新的同意、資料最小化、刪除路徑與分享隔離設計。

## 5. 驗證流程

一般變更完成後，至少執行：

```bash
pnpm lint
pnpm check
pnpm test
./node_modules/.bin/vite build
pnpm exec esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
git diff --check
```

視影響範圍增加下列驗證：

| 變更 | 額外驗證 |
| --- | --- |
| 公開首頁、主題或導覽 | `pnpm test:e2e:mobile-nav`、`node e2e/dark-mode-home-validation.mjs` 與桌面／375px 視覺檢查。 |
| 私人工作台 | 以 `AUTH_DRIVER=local`、`VITE_AUTH_DRIVER=local` 啟動 HTTPS 隔離服務，執行 `pnpm test:e2e:isolated` 與 `CHRONICLE_E2E_VIEWPORT=desktop pnpm test:e2e:isolated`。 |
| 匯入、GPS、地圖、媒體 | 更新 `photoExifImport.test.ts`、`photoMap.test.ts` 與隔離 desktop／375px 回歸。 |
| 分享、AI、語音、家庭資料 | 覆蓋擁有權、public／link 隔離與刪除／失敗路徑。 |
| Schema | 產生 migration、審閱 SQL、以受控流程套用後再測試。 |

正式 `pnpm build` 在此環境可能被外部 SIGTERM 中止；因此前端以 `./node_modules/.bin/vite build`、伺服器以獨立 esbuild 指令分開驗證。不要將環境終止誤報為程式建置成功或失敗。

## 6. 已知外部阻礙與不可替代的決策

正式 Manus OAuth 的 `https://manus.im/app-auth` 曾於 Chronicle callback **之前**回傳 CloudFront 403。因此主開發站的正式 `diary.get` 成功載入還沒有有效證據。使用者已要求先跳過，並以隔離 local-auth 回歸持續驗證私人流程。

下一位 AI 不得為了清除 TODO 而偽造 OAuth 成功、繞過登入、弱化 ownership，或把 local-auth 結果宣稱為正式 OAuth 成功。外部入口恢復可用後，才依 [`docs/VALIDATION_LOG.md`](./VALIDATION_LOG.md) 的邊界重跑正式登入與 `diary.get` 實證。

## 7. 建議後續優先順序

1. **正式 OAuth 恢復後驗證**：只在外部登入頁能到達時，實證登入、`diary.get`、編輯器載入與 callback；更新 blocker 記錄。
2. **輸出端與回訪機制**：維持目前「讓過去的記錄主動回來找你」方向，優先評估可由使用者主動觸發且不需背景資料外送的輸出能力。
3. **私有匯入完善**：先保持照片流程私有優先；任何支援新格式、地圖或外部來源的擴張都要先寫資料邊界與測試。
4. **協作能力**：家庭留言或即時共編屬較高風險範圍，需先完成成員角色、事件範圍、刪除與審計設計。

不要把建議清單視為已承諾功能。每個新 feature 都要先更新 `todo.md`、建立資料模型與隱私決策，再進行實作。

## 8. GitHub、檢查點與交接規則

1. 每次功能或文件完成先執行完整品質閘門，再建立 WebDev checkpoint。
2. GitHub 使用 `gh`；不強推、不改寫歷史、不以 `git reset --hard` 清除工作樹。
3. 若使用 `/home/ubuntu/chronicle-github-sync` 鏡像，先確認專案與鏡像的 HEAD，避免將舊鏡像覆蓋較新的 checkpoint。
4. 一個提交只做一個可說明主題；release 敘事放 GitHub Releases，長篇決策放 Discussions，而非用 commit 當工作日誌。
5. 交接時必須回報 checkpoint、GitHub SHA、實際通過的指令，以及仍被外部條件阻擋的項目。

## 9. 儲存庫治理基準

測試結構採兩層規則：單一模組的測試與受測檔 co-locate；需要 mock application entry、跨檔文件／設定或跨領域 server 契約時，才置於具名 `__tests__` 領域。`client/src/` 與 `server/` 根層不得新增測試。CI 的 `verify` job 執行 lint、型別、Vitest 與 production build；獨立 `public-homepage-e2e` job 在本機 Vite 服務執行公開首頁、文件匯出、分享語音隔離與深色模式瀏覽器回歸。

根目錄的早期 `template.json` static scaffold 已移除，因為 Chronicle 的真實全端設定以 `package.json`、`vite.config.ts`、`server/_core/` 與部署專案設定為準。設計規格由根目錄 `ideas.md` 移至 [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)。`patches/wouter@3.7.1.patch` 仍是受版本鎖定的相容性修補；移除或升級前必須完成路由回歸。

GitHub Issues 是後續功能 backlog 的公開追蹤來源；`todo.md` 只保留目前衝刺與外部 blocker。功能 Issue 範本要求使用情境、私有資料邊界、排程／通知控制和可測試驗收條件。GitHub secret scanning 與 push protection 已啟用；本任務帳號無法讀取 secret alert API，因此每次交接仍需執行受控工作樹掃描，且不得將「無 alert API 存取」誤報為完整歷史清查成功。

## 10. 最小交接回報格式

下一位 AI 完成一輪後，請以表格交接：

| 項目 | 必填內容 |
| --- | --- |
| 完成內容 | 使用者可見行為與資料範圍。 |
| 變更檔案 | 主要 UI、router、資料層、測試與文件。 |
| 驗證 | 實際執行的 lint／型別／測試／建置／E2E 指令與結果。 |
| 隱私／風險 | 資料何時離開裝置、誰可見、刪除／失敗行為。 |
| GitHub 與 checkpoint | 遠端 SHA、checkpoint URI。 |
| 未完成項目 | 只列真實 blocker 或已排定下一步，不以推測取代證據。 |
