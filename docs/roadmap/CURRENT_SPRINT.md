# Current Sprint — Repository Governance

## 目標

收斂協作資訊源、將認證與分包防護納入 CI，並以 EXIF 匯入和每日回憶既有資料建立不外送內容的補記助手 MVP。任何需使用者登入、授權、填寫資料或啟用排程的流程維持跳過。

## 本 sprint 交付

- 將根 `todo.md` 縮為指針，建立文件目錄頁，並在協作者規範禁止回填歷史工作日誌。
- 讓 CI 明確執行 lazy route chunk verifier，並以本地 mock provider 驗證 OAuth callback／session 邊界，不依賴正式登入。
- 建立補記助手：僅在私人工作台讀取最小空窗與未整理照片計數，不建立通知、排程或內容外送。

## 本輪狀態

| 範圍 | 狀態 | 可驗證結果 |
| --- | --- | --- |
| 協作治理 | 已完成 | `todo.md` 已縮為指針；`docs/README.md` 與文件治理契約防止歷史日誌回填。 |
| CI 防護 | 已完成 | workflow 明確執行 mock OAuth callback smoke 與 lazy route verifier；測試不連線正式 OAuth。 |
| 補記助手 MVP | 已完成 | 只顯示 private 事件日期空窗與當前瀏覽器 EXIF 預覽數量；不讀取正文、GPS 或檔案內容，不建立通知或排程。 |

## 完成定義

每項變更都需具備可讀文件、必要的自動化覆蓋，且 `pnpm lint`、`pnpm check`、`pnpm test`、`pnpm build` 均通過。私有工作台變更另需完成隔離 local-auth 的桌面與 375px 回歸；公開首頁變更需完成 375px 與減少動態檢查。

## 外部阻礙

正式 Manus OAuth 入口目前回傳外部 CloudFront 403。因此，正式 OAuth `diary.get` 成功載入的驗證保留為 blocked，待外部入口恢復後再執行，不以隔離 local-auth 結果取代。

## 下一批私有匯入與分享交付

| 交付 | 資料與隱私邊界 | 驗收 |
| --- | --- | --- |
| HEIC／Live Photo 匯入 | 檔案選取後只在瀏覽器解析 capture time；確認前不建立事件、不上傳。Live Photo 的影像與對應影片個別列為候選，沒有配對時不得臆測關聯。 | 讀取可支援 HEIC 的 metadata；無日期保留手動候選；確認後只建立 private 事件。 |
| ICS 日曆草稿匯入 | `.ics` 只在瀏覽器解析為可編輯草稿；預覽不得寫入資料庫；匯入結果預設 private，忽略 alarm、attendee、organizer 與 URL 欄位。 | 支援 `VEVENT`、全日與 UTC／有時區事件；可排除項目、修訂日期與標題，確認後才批次建立 private 事件。 |
| 分享照片去識別化 | 人臉偵測、模糊與輸出在瀏覽器進行；原圖不可因公開分享而上傳或出現在分享投影。只有使用者確認的模糊副本可被作為分享媒體。 | 無人臉／有臉／偵測失敗均有明確結果；輸出副本不包含 EXIF；分享頁僅使用確認的副本 URL。 |

### 完成狀態

三項私有媒體交付已完成。HEIC／HEIF 只在擁有者確認匯入時於瀏覽器轉為 JPEG，並可將同名 MOV 作為明確可審核的 Live Photo companion 保存至同一 private 事件。ICS 僅在瀏覽器解析為可勾選、可修改的 private 草稿，且不帶入受邀者、提醒、外部 URL、附件或重複展開結果。分享去識別化使用瀏覽器內的人臉偵測與 Canvas 模糊；若副本被移除，分享頁會隱藏該媒體，絕不回退顯示私人原圖。

後續強化已完成：週期性 ICS 預設保留起始事件，擁有者可在本機審核時選擇有限的 4 次或 12 次展開，超過 250 段確認上限即停止寫入。照片去識別化可加入、修改或移除手動遮罩並調整模糊強度；每次修改都必須重建本機預覽後才可上傳副本。HEIC／HEIF 審核區會依檔案大小顯示原始來源、預估 JPEG 轉檔與 Live Photo MOV 的容量，原始 HEIC 不會因估算而被讀取或上傳。

最新治理與輸入入口已完成：PR 僅能包含單一功能或不可分割修復，私人元件依 diary、import、sharing 領域分層，既有 `docs/README.md` 維持文件入口。CI 新增真實瀏覽器的 mock OAuth callback 回歸與不輸出內容的 Git 歷史 secret scan；Axios、Drizzle ORM、Nanoid 與 Express 已更新，Express wildcard 亦已遷移至命名 splat，production dependency audit 回報為零漏洞。PWA manifest 已宣告 Web Share Target，系統分享的標題、文字與 HTTPS／HTTP 來源連結只會合併至裝置本機 QuickNote 草稿，隨即移除網址參數，不會建立事件或上傳內容。

## 目前交付：可攜全量封存

| 範圍 | 私有資料邊界 | 驗收 |
| --- | --- | --- |
| 全量資料封存 | 僅日記擁有者以明確按鈕取得完整私人事件、標籤／技能、階段與年度回顧、事件修訂、媒體與語音的可攜描述；未解鎖時空膠囊在此 owner archive 中保留原始內容。分享 token、密碼雜湊、session、storage key、分享存取紀錄、邀請與協作稽核資料一律排除。 | 產生版本化 ZIP，內含固定資料 payload、asset manifest 與 SHA-256 完整性摘要；每項媒體／語音只在明確匯出時下載，失敗或超出上限時不產生局部下載。 |
| 可攜附件 | 封存內的媒體與語音以安全檔名存放，資料 payload 只引用封存內路徑，不保留來源 URL 或 private storage key。 | 讀回驗證器拒絕不安全路徑、格式不符、過大檔案與 checksum 不一致的 archive。 |

已完成：擁有者可在私人工作台建立 `chronicle-full-archive` 第 1 版 ZIP。伺服器僅聚合其自身日記的內容資料與短暫附件來源，瀏覽器封存前先拒絕敏感欄位，並為 JSON payload 與每一個附件寫入 SHA-256 manifest。單一附件上限為 16MB、總封存上限為 100MB、最多 120 個附件；任一附件讀取失敗或超限時不下載部分封存。隔離 local-auth 的 375px 與桌面回歸均會建立後清理測試帳號，桌面流程另驗證 owner 可下載 data-only 全量 ZIP。

### 還原與進度強化

| 範圍 | 資料與安全邊界 | 驗收 |
| --- | --- | --- |
| ZIP 還原精靈 | 僅擁有者可選擇已通過 checksum 驗證的 Chronicle ZIP。選檔與預覽只在瀏覽器處理；實際寫入前必須明確確認取代目前私人成長史。分享設定、token、密碼、存取紀錄、邀請與稽核資料不會從封存恢復。 | 還原前顯示事件、回顧與附件數量；不安全路徑、manifest／payload checksum 不符、過大或未宣告附件皆拒絕。附件先分段暫存，所有附件就緒後才以單一資料庫交易取代日記內容；失敗或取消時不改動既有日記。 |
| 還原附件 | 圖片、Live Photo MOV 與語音只由 owner 明確確認後分段上傳至受控 private storage。還原語音僅保存已封存的 transcript，不重新送交轉寫或 AI。暫存附件未被提交時沒有日記引用。 | 每個附件顯示階段與完成數；任一項失敗時顯示可理解錯誤並保留原日記。 |
| 匯出進度 | ZIP 匯出維持明確使用者觸發，僅在瀏覽器讀取附件。 | 顯示準備、附件讀取、封裝與完成狀態，以及完成事件／附件數量；支援 reduced motion，沒有假進度或背景匯出。 |

已完成：還原精靈先在瀏覽器驗證 ZIP 的 manifest、payload 與附件 checksum，僅把已驗證的 metadata 送往 owner-only staging session。每一項附件在 private storage 暫存時由伺服器再次核對原封存宣告的大小與 SHA-256；全部就緒後，使用者必須輸入「還原我的成長史」才會以一次資料庫交易取代事件、標籤、回顧、修訂與附件。交易失敗、附件失敗或取消不變更目前日記；還原後分享設定一律關閉為 private，且不會恢復憑證、存取、邀請或稽核資料。匯出顯示準備、逐項附件讀取、封裝與完成狀態；還原顯示驗證、附件備妥與提交階段。
