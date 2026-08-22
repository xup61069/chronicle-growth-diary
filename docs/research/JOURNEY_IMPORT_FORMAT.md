# Journey 本機匯入格式研究

## 已確認的官方事實

Journey 官方支援將單筆或批次日記匯出成 ZIP；Android、iOS、桌面與 Web 的入口不同，Web 的備份受同步服務限制。[1] Day One 的官方 Android 指引指出可直接選擇 Journey `.zip` 匯入，並說明該流程會帶入 entries 與 photos；它同時警告非 Android 環境需要轉為 Day One 相容 JSON。[2]

| 決策 | 本輪採用範圍 | 原因 |
| --- | --- | --- |
| 使用者輸入 | 只接受使用者明確選擇的 Journey ZIP。 | 官方文件確認 ZIP 是 Journey 的匯出／備份形式。 |
| 內部布局 | 只支援經實際檢查並可辨識的 JSON entry collection；未知 ZIP 根目錄、無法辨識條目、路徑穿越或重複歧義一律拒絕。 | 官方公開頁未保證內部檔案名稱與 JSON 欄位，不能猜測或寬鬆解析。 |
| 保留欄位 | 只建立本機審核草稿所需的日期、純文字與受限標籤。 | 避免把匯出中可能含有的裝置、天氣、位置、人名、來源或附件 metadata 帶入 Chronicle。 |
| 媒體與位置 | 本輪忽略照片、音訊、影片、GPS、地點與附件。 | 第三方匯入流程不應繞過既有私有媒體審核與 GPS 明確同意鏈路。 |
| 寫入 | 僅在使用者選取並確認後，以既有 `diary.importEvents` 建立 `private` 事件。 | 保持 Day One 匯入的 private-first、無部分寫入與可取消行為。 |

## 待實作前驗證的布局來源

公開的 `journey2dayone` 轉換器會逐一讀取 Journey 匯出目錄中的 JSON，並使用 `date_journal`（毫秒時間戳）、`text` 與 `tags` 建立目標日記條目；其同時讀取 `lat`、`lon`、`timezone`、`address`、`weather`、`photos` 與音訊欄位。[3] 本輪 parser 只接受每一 JSON root 具有有效 `date_journal` 的 entries，並保留經淨化的 `text` 與受限 `tags`；上述位置、天氣、媒體、音訊、時區與地址欄位一律丟棄。未知 JSON shape 不採用寬鬆欄位猜測。

不得執行第三方程式、不得將使用者樣本或原始內容提交至版本控制，也不得因公開轉換器存在而擴大欄位保留範圍。

## 參考資料

[1] [Journey：Export Journal Entries to Zip Format](https://support.journey.cloud/en/categories/import-export-publish/articles/export-journal-entries-to-zip-format)

[2] [Day One：Importing Data From Journey](https://dayoneapp.com/guides/day-one-for-android/importing-data-from-journey/)

[3] [miloshimself/journey2dayone：公開 Journey JSON 轉換器](https://github.com/miloshimself/journey2dayone)
