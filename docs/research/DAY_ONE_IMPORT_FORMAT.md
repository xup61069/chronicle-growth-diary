# Day One JSON 匯入格式研究

> 本文件只記錄 Day One 官方公開匯出資訊與官方示範檔的被動檢視結果；不含真實使用者日記。

## 來源與已確認事實

| 來源 | 觀察 | 實作決策 |
| --- | --- | --- |
| [Day One：Exporting entries](https://dayoneapp.com/guides/tips-and-tutorials/exporting-entries/) | Day One 2.x JSON 匯出為 ZIP；包含 JSON，媒體可選擇放在 `photos`、`videos`、`audios`、`pdfs` 資料夾。 | 第一版只接受 JSON 或 ZIP，並只處理 JSON 草稿；媒體不自動上傳。 |
| [Day One：Importing Data from JSON files](https://dayoneapp.com/guides/import-export/importing-data-from-json-files/) | 官方建議 Web／Windows 從含 JSON 的 ZIP 匯入，並提供官方範例 ZIP。 | ZIP 必須先本機驗證路徑、大小與唯一 JSON，再顯示預覽。 |
| [Day One 官方範例 ZIP](https://dayoneapp.com/wp-content/uploads/2023/02/2023-2-2-Journal.zip) | 根 JSON 名為 `Journal.json`，含 `metadata` 與 `entries`。範例 entry 使用 `uuid`、`creationDate`、`modifiedDate`、`text`／`richText`、`tags`、`photos`；也帶有裝置、天氣與完整位置名稱／座標等不必要資料。 | 使用 `uuid`、`creationDate`、`text` 與受限 tags 建草稿；剝除 `richText`、裝置、天氣、地點名稱、座標、UUID 以外的來源 metadata、來源 URL 與媒體描述。 |

## 支援契約

解析器只接受大小受限的本機 JSON 或 ZIP，從 `entries` 建立暫態草稿。每筆必須有可解析日期與文字；標題由第一個非空文字行裁切而得。匯入前，使用者可選取或取消草稿；確認後才透過既有 `diary.importEvents` 建立 `private` 事件。

媒體資料夾、`photos`、位置、天氣、裝置與豐富文字欄位**不在第一版匯入範圍**。這避免第三方格式中的精確位置、相機／裝置資訊、原始媒體與無法完整驗證的路徑進入 Chronicle。後續若加入受控附件，必須另有檔案路徑白名單、大小／MIME 檢查、逐檔核對與使用者逐項同意。
