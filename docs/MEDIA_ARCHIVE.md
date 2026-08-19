# Chronicle 媒體封存格式

Chronicle 的 JSON 與 Markdown 匯出只保存媒體 URL 與描述，這是為了避免把暫時 URL 或儲存提供者憑證誤認為完整備份。若需要保留事件圖片的實際位元組，請在編輯器使用 **「匯出媒體 ZIP」**；還原時先匯入相同的 JSON 事件，再選擇 **「匯入媒體 ZIP」**。

| 項目 | 規則 |
| --- | --- |
| 封存格式 | ZIP，根目錄包含 `manifest.json` 與 `media/` 圖片檔。 |
| 事件對應 | 每張圖片包含事件索引、事件標題與發生時間；三者必須與目前日記相符。 |
| 可接受圖片 | JPG、PNG、WebP、GIF。 |
| 安全上限 | 最多 40 張；單張最多 4MB；ZIP 檔與解壓後總量最多 25MB。 |
| 不會封存 | 分享 token、密碼雜湊、帳號資料、S3/MinIO 儲存金鑰及公開故事封面。 |

> 匯入前，Chronicle 會檢查 manifest 版本、檔案路徑、MIME 類型、大小與事件指紋。若任一條件不符，封存不會進入確認還原流程。

媒體封存僅用於同一份 Chronicle 事件內容的還原。若 JSON 已被編輯、事件順序改變或標題／發生時間不同，請重新建立與該日記相符的媒體封存，避免圖片寫入錯誤事件。

## English summary

Use **Export media ZIP** after exporting the matching JSON archive. The ZIP contains only verified event image bytes plus a manifest carrying event title and timestamp fingerprints. Restore the matching JSON events first, then choose **Import media ZIP**. Chronicle rejects unexpected paths, media types, oversized files, mismatched event fingerprints, and all credentials or storage keys.
