# Current Sprint — Repository Governance

> 歷史工作過程與版本說明不再堆放於本檔；請參閱 [`docs/roadmap/`](./docs/roadmap/README.md)、[GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases) 與 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## Active

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
