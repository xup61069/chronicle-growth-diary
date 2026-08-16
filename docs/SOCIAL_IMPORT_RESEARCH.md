# 社群草稿匯入格式研究摘要

Chronicle 的社群匯入工作台採用**使用者主動提供的本機檔案**，不要求平台 OAuth、不保存帳號憑證，也不會自動發布內容。第一版 JSON 解析器處理噗浪相容 `plurks` 陣列或通用 `posts` 陣列，僅取用來源 ID、貼文時間與原文，並在瀏覽器端去重。

噗浪官方 API 文件說明 API 回傳 JSON，貼文物件包含 `plurk_id`、`posted`、`content` 與 `content_raw` 等欄位；其中 `content_raw` 是使用者輸入的原始文字，適合作為日記候選草稿的來源。官方 API 也要求 OAuth 權杖才能存取多數帳號資料，因此 Chronicle 不將 OAuth 納入匯入第一版。[1]

公開備份工具 `plurkdl` 顯示可輸出 JSON 與 CSV；因此後續工作將補上 CSV 解析、預覽、去重說明與明確人工確認建立流程。此工具僅作為格式相容性參考，Chronicle 不執行或整合該工具。[2]

## References

[1] [Plurk API 2.0](https://www.plurk.com/API)

[2] [anemology/plurkdl](https://github.com/anemology/plurkdl)
