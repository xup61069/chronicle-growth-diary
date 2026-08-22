# 跨匯入去重引擎研究

> **狀態：** 照片 EXIF／HEIC 預覽已交付 source key、手動 SHA-256 與手動 Canvas dHash 的**同批檔案候選**；它不是跨來源或歷史日記去重。pHash、文字／日期候選、ICS／Journey／Day One 接線與任何持久化仍未實作。

## 目標與非目標

Chronicle 已有 EXIF 照片、HEIC／Live Photo、ICS、Web Share 與外部日記匯入。下一個資料品質功能應在**使用者明確開始匯入預覽後**，於目前瀏覽器建立「可能重複」候選；它不是背景掃描、遠端比對、自動刪除或自動合併系統。

候選比較不得上傳原圖、縮圖、感知雜湊、GPS、來源帳號 ID、正文或標題給第三方。任何日後要保存的去重指紋也必須先有 owner 同意、刪除路徑、分享隔離與 data-retention 設計。

## 已研究的開源基礎

| 候選 | 觀察 | 決策 |
| --- | --- | --- |
| [`imagehash-web`](https://github.com/simon987/imagehash-web) | 可在瀏覽器使用 `phash`、`dhash`、`ahash`、`whash` 與 crop-resistant hash，並以 Hamming distance 比較；最近提交為 2025-01，但社群規模小。 | 可作原型參考，不在未完成 browser bundle／授權／效能審查前直接加入生產依賴。 |
| [`phash-js`](https://github.com/freearhey/phash-js) | MIT，但其 README 表示需要下載超過 4MB 的 ImageMagick WASM；儲存庫社群規模小。原始 [`pHash`](https://www.phash.org/) C++ 函式庫為 GPLv3。 | 不加入 pHash 依賴。第一輪以 9×8 Canvas dHash、64-bit Hamming distance ≤8 產生候選，避免額外 bundle；pHash 留待有獨立的效能、相容性與授權審查後再評估。 |
| [`jsdiff`](https://github.com/kpdecker/jsdiff) | 成熟 TypeScript JavaScript diff 函式庫，活躍且社群規模大；功能是文字差異呈現，並非以日記去重為目的。 | 不把完整日記內容交給通用比較器；文字候選第一版採本機正規化標題與日期容忍度，必要時才評估受限短字串比較。 |

## 建議的候選分層

| 層級 | 訊號 | 範圍 | 行為 |
| --- | --- | --- | --- |
| 1 | 同一匯入工作階段的 stable source key | 僅目前草稿 | 沿用既有 parser 去重，不新增持久化。 |
| 2 | 可用時的瀏覽器本機檔案 byte checksum | 僅使用者本次選取檔案 | 顯示「完全相同檔案」候選；由使用者保留或略過。 |
| 3 | Canvas 本機 dHash + Hamming threshold | 僅使用者明確選取且主動按下的照片預覽 | 9×8 灰階 dHash 只在記憶體比較，距離 ≤8 才標示「視覺近似」；無法解碼的檔案只略過此訊號，絕不遠端 fallback。不得認定為同一張、不得自動刪除。 |
| 4 | 正規化短標題 + UTC 日期容忍窗口 | 僅已最小化的文字匯入草稿 | 只用於日記／ICS 候選排序；正文不參與第一版比較。 |

## 安全與互動契約

1. 先預覽、再明確按下「檢查可能重複」，不得在檔案選取或頁面載入時自動執行。
2. 結果採可展開的候選清單，顯示比較理由與信心，不顯示未選取來源的私有內容。
3. 使用者必須逐組選擇保留、略過或分別匯入；取消不建立事件、不更新既有事件。
4. 首版不得跨瀏覽器、跨裝置或跨帳號保存去重圖譜；已上傳私人媒體不做背景重算。
5. 公開／link 分享、家庭成員讀取與 AI 輸入一律不得包含去重候選或指紋。

## 最低驗收

- 相同 source key、相同 checksum 與 dHash 近似圖片已有純函式回歸；相似標題日期候選仍未交付。
- 近似圖片的閾值誤判必須保持「候選」而非自動刪除。
- 取消、未確認、失敗與未選候選均為零寫入。
- 桌面與 375px 隔離回歸攔截 event mutation，確認只在 owner 明確確認後產生 private payload。
- 不新增感知雜湊依賴；若未來重啟 pHash 評估，必須先完成 bundle、記憶體、裝置相容性與授權審查。
