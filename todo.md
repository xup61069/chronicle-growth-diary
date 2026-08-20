# Current Sprint — Repository Governance

> 歷史工作過程與版本說明不再堆放於本檔；請參閱 [`docs/roadmap/`](./docs/roadmap/README.md)、[GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases) 與 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## Active

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
