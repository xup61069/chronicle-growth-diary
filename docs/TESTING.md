# 測試結構與品質規範

Chronicle 採用「受測模組旁的單元測試優先、跨模組與基礎設施測試依領域分層」的規則。這避免把所有測試堆在 `client/src` 或 `server` 根目錄，同時保留從測試名稱即可辨識責任範圍的能力。

| 範圍 | 位置 | 適用內容 |
| --- | --- | --- |
| 前端模組與頁面 | `client/src/<feature>/*.test.ts(x)` | 元件、頁面、hook、純函式與頁面靜態渲染。新測試預設與受測模組 co-locate。 |
| 前端入口、文件／設定測試 | `client/src/__tests__/entry/`、`client/src/__tests__/document/` | `App.tsx`、登入入口、`index.html`、全域樣式、社群中繼資料與 workspace 設定等跨檔靜態驗證。 |
| 伺服器功能模組 | `server/<feature>/*.test.ts`、`server/routers/*.test.ts`、`server/db/*.test.ts` | 資料庫 helpers、路由合約與功能模組，預設與受測檔 co-locate。 |
| 伺服器跨領域測試 | `server/__tests__/{auth,domain,data,infrastructure}/` | 認證流程、跨模組業務規則、資料存取 harness 與 provider 選擇等需要明確領域邊界的測試。 |
| 瀏覽器回歸 | `e2e/` | 不依賴正式 OAuth 的公開頁或隔離 local-auth 流程。每支腳本必須自行清除暫時資料。 |

## 新測試的選擇原則

首先選擇 co-location：若測試只驗證單一函式、頁面、元件、router 或 db helper，請放在受測模組旁。只有當測試跨越數個功能檔、需要 mock framework runtime，或驗證入口／文件／設定時，才放入 `__tests__` 的相應領域。前端入口契約固定放入 `client/src/__tests__/entry/`，文件與設定固定放入 `client/src/__tests__/document/`；伺服器跨領域契約固定依 `auth`、`domain`、`data`、`infrastructure` 分類於 `server/__tests__/`。不要在 `client/src/` 或 `server/` 根層新增測試檔。

每個公開介面變更至少需執行 `pnpm check`、`pnpm test` 與 `pnpm build`。公開首頁變更還必須執行 `CHRONICLE_E2E_BASE_URL=<https-preview> pnpm test:e2e:mobile-nav`，確認 375px 與減少動態偏好行為。涉及日記、分享、媒體或 AI 的測試須明確覆蓋擁有權、隱私範圍與失敗回復路徑。

## 照片匯入、位置與地圖

照片 EXIF、GPS、地圖或批次時間變更必須同時覆蓋純函式與隔離瀏覽器流程。`client/src/lib/photoExifImport.test.ts` 應涵蓋標準 JPEG 日期與 GPS fixture、缺失日期手動補填、位置成對範圍驗證、重分組、秒級遞增、未選取候選保留，以及靜態地圖投影。`server/routers/photoMap.test.ts` 應確認登入邊界、座標範圍與代理呼叫。

在 `AUTH_DRIVER=local`、`VITE_AUTH_DRIVER=local` 的 HTTPS 隔離服務中，桌面與 375px `test:e2e:isolated` 必須確認：地圖在使用者明確動作前不會載入；點選或拖曳會更新本機 GPS 並使舊圖失效；確認後的 `diary.createEvent` private payload 使用更新座標；批次日期僅影響選取照片；延遲媒體請求期間可見進度。這些測試不能取代正式 OAuth 整合驗證。
