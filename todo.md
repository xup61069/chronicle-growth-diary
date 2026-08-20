# Current Sprint — Repository Governance

> 歷史工作過程與版本說明不再堆放於本檔；請參閱 [`docs/roadmap/`](./docs/roadmap/README.md)、[GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases) 與 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## Active

- [x] 新增公開分享頁的語音日記隔離瀏覽器回歸，確認原音、逐字稿與私有語音欄位不會呈現在 shared story。

- [x] 更新 docs/roadmap/FEATURES.md，反映已完成的私有語音日記、成長儀表板、A5 書冊、家庭事件反應與按需文件匯出驗證。

- [x] 在可用的真實瀏覽器工作階段補驗 PDF／長圖片下載，確認使用者觸發匯出後的檔案下載與基本輸出正常；以最小化私人內容節點避開完整工作台的環境中斷，驗證 PDF／PNG 檔名與非空輸出，並納入 CI。

- [x] 將 jsPDF 與 html2canvas 維持為使用者觸發匯出時才載入，並以靜態回歸、壓縮 Vite 產物與首頁無參照檢查驗證文件匯出 chunk 邊界。

- [x] 更新開源文件，整理近期私有儀表板、語音日記、A5 書冊、家庭反應與路由載入效能的使用方式、資料邊界與驗證連結。

- [x] 重跑隔離 local-auth 的 `/editor` 與 `/dashboard` 瀏覽器回歸，明確驗證路由延遲載入後私有工作台、成長儀表板與返回導覽仍正常，並補入驗證基準。

- [x] 改善路由層級載入效能：延後載入私人工作台與大型依賴，保留公開首頁初始體驗、可及載入狀態與既有路由回歸。

- [x] 實作家庭事件反應 MVP：只允許真實日記成員為私有事件建立或移除反應，公開／連結分享一律隔離，並提供無障礙與行動版回歸。

- [x] 實作私有 A5 印刷準備書冊：以生命階段編排成長事件，提供使用者觸發的列印／另存 PDF 入口與桌面、行動版回歸。

- [x] 修正桌面寬度下工作台索引與預覽面板被 mobile 顯示規則隱藏的回歸，並重新驗證語音日記與三欄工作區。

- [x] 實作語音日記 MVP：每次轉寫前明確同意，將私人事件音檔與逐字稿安全保存，離線錄音先留在裝置並提供上傳、刪除與行動版回歸。

- [x] 依具體場景優先原則重寫公開首頁核心文案與行動入口，保留既有可及性語意、行動導覽與回歸測試。

- [x] 實作 owner-only 成長數據儀表板 MVP：以私有日記事件聚合年度寫作密度、關鍵字與連續紀錄，提供行動版可及性視覺化與完整隱私回歸。

- [x] 將年度回顧的 private 範圍、每次 AI 同意、owner-only 控制項與 Markdown 匯出改善同步至 GitHub `main`。

- [x] 完成年度回顧 MVP 的私有資料範圍：以明確 AI 同意為前提，僅彙整擁有者指定年份的 private 日記事件生成回顧，並提供 Chronicle frontmatter Markdown 匯出與隱私回歸測試。

- [x] 完成 P0/P1/P2 儲存庫治理基準：README 整併、文件治理、測試分層、CI、安全貢獻文件與功能 roadmap。

- [x] 完成年度回顧 MVP 的路由、介面、匯出與資料擁有權驗證。

- [x] 新增年度 AI 回顧隱私回歸：驗證 public/link 事件不會送往 AI，且非擁有者無法生成或匯出他人年度回顧。
- [x] 整併 README 為中文主版與單一英文版，刪除分叉的 README_EN.md，並加入雙向語言切換連結。
- [x] 移除不必要的根目錄 .gitkeep，將驗證文件重整為可重現基準。
- [x] 建立測試檔案的 co-location 與分層規範，整理 client/src 與 server 根層測試的可維護結構。
- [x] 文件化 server/_core、server/routers.ts 與 server/routers 的路由邊界與遷移規範。
- [x] 擴充 GitHub Actions，執行型別檢查、Vitest、正式建置與不需登入的公開首頁 E2E。
- [x] 擴充 SECURITY.md、CONTRIBUTING.md 的 OAuth、AI、家庭與兒童資料處理、漏洞回報及測試規範。
- [x] 建立分階段功能 roadmap，收錄年度回顧、語音日記、成長儀表板、印刷 PDF 與家庭互動功能，標示隱私與技術依賴。

## Blocked — external OAuth

- [ ] 在正式 Manus OAuth 工作階段確認 `diary.get` 實際送出並成功載入日記內容；隔離 local-auth 驗證另行記錄。
- [ ] 在主開發站或正式工作階段實證 `diary.get` 成功送出並載入內容，並記錄可追溯驗證結果。
- [ ] 延後執行需有效登入工作階段的瀏覽器互動驗證：主開發站或正式 OAuth 工作階段的 `diary.get` 成功載入仍待實證。
- [ ] 診斷並修正公開預覽的 OAuth 登入頁面 403；目前證據顯示拒絕發生於外部入口、尚未抵達 Chronicle callback。
