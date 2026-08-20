# PWA 與離線快速記事驗證基準

`/quick-note` 是不需登入的裝置本機草稿工具，不是雲端同步保證。草稿會以瀏覽器 localStorage 保存；使用者準備好後可複製內容至完整編輯器建立正式事件。

| 檢查項目 | 狀態 | 驗證方式 |
| --- | --- | --- |
| 草稿儲存、還原、清除與複製 | 通過 | `quickNote` 單元測試覆蓋序列化與還原；公開首頁 375px E2E 覆蓋入口與說明。 |
| PWA 產物 | 通過 | `pnpm build` 會產生 `manifest.webmanifest`、`registerSW.js` 與 `sw.js`。 |
| 實體斷網／恢復連線的狀態訊息 | 待驗證 | 需在實際瀏覽器 DevTools 的離線／恢復連線條件下確認提示文字的完整轉換。 |

每次 PWA 行為有實質變動時，請更新此基準的結果與重現方法；逐次開發過程請留在 Pull Request、Release 或 Discussion。
