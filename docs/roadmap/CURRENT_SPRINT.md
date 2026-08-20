# Current Sprint — Repository Governance

## 目標

讓文件、測試、路由與 CI 的責任可辨識且可維護，並在不宣稱尚未驗證的 OAuth 行為已可用的前提下，改善 Chronicle 的開源協作品質。

## 本 sprint 交付

- 合併為中文主 README 與單一英文 README，提供雙向語言連結。
- 將工作追蹤縮為 current sprint，將功能規劃移至本目錄。
- 建立測試位置、路由組裝與 CI 的可維護規範。
- 補足 OAuth、AI、家庭日記與兒童資料的安全及貢獻準則。

## 完成定義

每項變更都需具備可讀文件、必要的自動化覆蓋，且 `pnpm check`、`pnpm test`、`pnpm build` 均通過。公開首頁變更另需完成 375px 與減少動態檢查。

## 外部阻礙

正式 Manus OAuth 入口目前回傳外部 CloudFront 403。因此，正式 OAuth `diary.get` 成功載入的驗證保留為 blocked，待外部入口恢復後再執行，不以隔離 local-auth 結果取代。
