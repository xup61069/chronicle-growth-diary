# Current Sprint — Private Journey Editing, Day One Import, and Family Milestones

## 目標

在既有 private-only 照片工作台補足旅程候選手動範圍與封面審核；加入只在瀏覽器解析、選取、確認後寫入的 Day One JSON／ZIP 文字匯入；建立不等同公開分享的家庭共用大事記圖層。任何需使用者登入、授權、填寫資料或啟用排程的流程維持跳過。

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

## 本輪交付：本機旅程候選檢視

| 範圍 | 資料與隱私邊界 | 驗收 |
| --- | --- | --- |
| 旅程候選分析 | 只在使用者於目前照片匯入預覽明確按下分析後，在瀏覽器處理已解析的候選 ID、拍攝時間與成對 GPS。無效或缺少時間／GPS 的照片不進入候選，亦不會被刪除或自動補值。 | 不觸發事件建立、附件上傳、地圖請求或外部資料查詢；結果採穩定排序與可解釋的時間／距離分段。 |
| 候選審核 | 候選僅存在當前預覽；擁有者可檢視照片數、起訖時間、中心座標與分段原因，修改中性日期式標題、選取或清除候選。候選至少含三張照片。 | 不進行逆地理編碼、不推測住家、家庭成員或目的地，不保存候選、路線或地圖圖像。 |
| 地圖按需預覽 | 只有擁有者按下單一候選的「顯示地圖」後，才呼叫既有受保護 preview；預覽離開或候選變更後不保留地圖。 | 點選前沒有 `photoMap.preview` 請求；座標不進 public／link 分享。 |
| 確認匯入 | 已選候選在既有確認步驟轉為 private 事件草稿，並從普通日期群組排除相同 photo ID，避免重複建立。未選候選及不含 GPS 的照片維持原日期分組。 | 最終仍只寫入 private 事件與既有受控附件；取消、分析失敗或未選候選時不建立旅程事件。 |

### 本輪完成定義

新增的純函式需涵蓋時間／距離切分、缺失資料、最小照片數、穩定 ID 與合法中心座標。私人工作台需以 local-auth 在 375px 與桌面驗證：未明確分析前無網路或寫入、地圖只按需取得、已選候選不與日期群組重複送出，以及確認後事件仍為 private。完成後再更新交接文件、`FEATURES.md`、品質閘門與單一功能 GitHub PR。

### 本輪狀態

**已完成。** `photoJourneyCandidates.ts` 在瀏覽器以可解釋的 30 小時／80 公里相鄰門檻建立至少三張照片的候選，並以球面中心計算候選座標。候選不讀取影像、不可自動分析、不做地名推測、不持久化；任何照片時間或位置異動都會清除舊候選。已選候選透過去重群組合併層取代其中照片的普通日期群組，最終仍只寫入 private 事件與現有附件。90 個測試檔／249 項、375px 與桌面隔離 local-auth E2E、PWA build、lazy-route、server bundle、secret scan、production audit 與 diff check 均通過。

## 本輪交付：可編輯旅程、Day One 與家庭大事記

| 功能 | 最小資料模型 | 權限與隱私邊界 | 不做的事 |
| --- | --- | --- | --- |
| 旅程候選手動編輯 | 在現有瀏覽器候選增加本地 `startAt`、`endAt`、`coverPhotoId`；確認後將範圍存入只屬於該 event 的 `growth_journey_details`，封面只可指向該 event 已上傳的 image media。 | 僅 owner 可在明確分析後編輯；封面與範圍變更都必須驗證仍屬候選。候選不持久化，任何來源／選取／時間／GPS 改變即失效。 | 不讀影像、不地名推測、不加背景掃描、不另建媒體上傳或公開封面。 |
| Day One 匯入 | 瀏覽器本機解析大小受限的 JSON 或 ZIP `Journal.json`，只從 `entries[]` 取受限日期、文字與可選 tags，建立暫態草稿；確認後以既有 `diary.importEvents` 建立 private 事件。格式研究見 [`DAY_ONE_IMPORT_FORMAT.md`](../research/DAY_ONE_IMPORT_FORMAT.md)。 | 使用者選檔與按下分析前不讀取內容；不把 ZIP、草稿或來源 UUID 持久化。拒絕不安全 archive path、未知 JSON、無效日期與超限項目。位置、裝置、天氣、richText、媒體與來源 URL 一律捨棄。 | 不自動上傳匯出媒體、不掃描既有日記、不跨匯入比對、不支援 Journey 或非 Day One 格式。 |
| 家庭共用大事記 | 獨立 `growth_family_milestones`：diary、可選 source event、owner 明確輸入的標題／短摘要／日期與時間精度；不複製 event body、GPS、原圖、語音或 AI 輸出。 | 建立、編輯、刪除僅 owner；讀取限已接受的 `growth_diary_members`。公開／link share、邀請 token、已移除成員皆無法讀取。家庭項目顯示為 family-only，無附件。 | 不公開、不寄信、不通知、不加留言／reaction、不讓 editor/commenter 擴張範圍。 |

### Migration 與測試順序

先新增 `growth_journey_details` 與 `growth_family_milestones`，再增加必要 audit enum、資料層、tRPC 與 UI。資料庫 migration 必須先由 Drizzle 產生、審閱 SQL，再以單一非破壞性執行套用。測試至少涵蓋候選日期範圍與封面隸屬驗證、Day One archive path／欄位剝除／取消 no-op、以及 owner、accepted member、removed member、public/link 四種家庭大事記存取情境。

### 本輪完成狀態

**已完成。** `0021_huge_caretaker.sql` 已審閱並以非破壞性 migration 套用；旅程詳細資料只接受 owner 的有序日期範圍與同一 private event 已保存 image 封面。Day One JSON／ZIP 只在瀏覽器產生暫態草稿，確認後才批次建立 private 記錄。家庭大事記只保存 owner 手動寫下的短摘要，成員 read model 不含 `sourceEventId`、事件正文、附件或位置。91 個測試檔／256 項、桌面與 375px 隔離 local-auth E2E、直接 Vite PWA build、lazy-route、server bundle、secret scan、production audit 與 diff check 均通過；組合 `pnpm build` 在 Vite 成功產物後遭環境 SIGTERM，因此以分離 Vite、lazy-route 與 esbuild 結果為準。

## 下一輪交付：家庭大事記選擇性可見範圍

| 範圍 | 資料與權限邊界 | 驗收 |
| --- | --- | --- |
| 受眾模式 | 每筆 family-only 大事記為 `all_accepted` 或 `selected_members`。既有資料維持 `all_accepted`；新建項目預設指定成員且至少選一位 accepted member。 | 只新增非破壞 schema／migration；不把 family-only 轉為 public、link 或 token 分享。 |
| 指定成員 | 受眾只引用目前 diary membership，不複製名字、email、原事件、媒體或摘要到新資料表。 | owner 可管理；accepted member 只能讀自己獲選的摘要；未選成員不取得名稱、數量或存在性。 |
| 成員生命週期 | 移除家庭成員時清除其指定受眾關聯；重新接受邀請不自動還原歷史指定權限。 | owner、已選、未選、已移除、重新接受與 legacy all-accepted 都有資料層、router 與隔離 E2E 回歸。 |
| 稽核與分享 | scope／對象變更只留下不含摘要或收件者內容的 audit action；公開／link 投影永遠排除大事記與受眾。 | 不新增通知、Email、附件、GPS、AI、留言、reaction 或背景工作。 |

### 下一輪完成狀態

**已完成。** `0022_minor_george_stacy.sql` 已審閱並套用，為舊項目加入向後相容的 `all_accepted` 預設，並建立可 cascade 撤銷的 milestone-to-membership audience 關聯。新項目預設選擇成員，未選人員時不能儲存；owner 可切換所有已接受成員或指定成員。資料層將 non-owner 查詢過濾到自身授權項目，且 projection 不含 source event、受眾資訊或私人媒體欄位。91 個測試檔／256 項、桌面與 375px local-auth E2E、直接 Vite PWA build、lazy-route、server bundle、secret scan、production audit 與 diff check 均通過。

## 本輪交付：Journey 本機審核與家庭受眾變更前預覽

| 範圍 | 資料與權限邊界 | 驗收 |
| --- | --- | --- |
| Journey ZIP 草稿 | owner 選檔後才在瀏覽器處理所有安全 ZIP path 的 JSON entry；只取有效 `date_journal`、HTML 轉純文字的 `text` 與受限標籤。provider ID 僅供本機優先去重；缺少時退回日期加淨化文字。 | 拒絕不安全 path、超限 archive／entry／檔案數與無效資料；不保存 ZIP、來源 ID、檔名、媒體、音訊、GPS、地址、天氣、時區、裝置或未知欄位。確認前沒有 mutation；確認後只由既有 batch import 建立 private 事件。 |
| 家庭受眾預覽 | 新建項目維持直接建立；只有編輯既有項目且有效受眾集合或 `all_accepted`／`selected_members` 政策變更時，owner 才會先看到目前／提議、加入／移除的本機差異。 | 預覽前 update mutation 為零；只有第二次「確認變更」才送出。若 family member 名冊或選擇變動，預覽立即失效並要求重選；無效 membership ID 不會進入 update payload。 |

### 本輪完成狀態

**已完成。** `journeyImport.ts`、`PrivateJourneyImport.tsx` 與既有 `diary.importEvents` 接線已交付；`journeyImport.test.ts` 覆蓋巢狀安全 JSON path、HTML 欄位最小化、provider ID 優先及 fallback 去重。`FamilyMilestoneLayer` 以 `familyAudiencePreview.ts` 計算有效對象、政策切換和名冊 signature，並在更新前建立可取消的本機差異預覽。隔離桌面 local-auth 回歸新增 Journey 確認前零寫入／確認後 private payload，及 family preview 前零 update／二次確認後單次 update；375px 私人工作台回歸亦通過。實際通過 `pnpm lint`、`pnpm check`、93 個測試檔／262 項、桌面與 375px 隔離 E2E、受限 heap 的 Vite PWA build、lazy route verifier、server bundle、178 revisions secret scan、production audit 與 diff check。

## 下一輪：私有審核可讀性與 Journey 草稿微調

| 交付 | 資料與隱私邊界 | 驗收 |
| --- | --- | --- |
| 受眾差異可讀性 | 現有本機 preview 只增進加入、移除與政策變更的視覺層次；不新增受眾資料、不把名冊或摘要送往公開／link 分享，也不減少第二次確認。 | 加入與移除有清楚、非僅色彩的狀態；鍵盤與 reduced motion 使用者仍可理解變更，preview 前不得 update。 |
| owner 稽核檢視 | 僅 owner 可讀取既有不含摘要、收件者、正文、媒體、位置或 AI 的 audience audit metadata。檢視不得建立追蹤或通知。 | UI 只呈現時間、動作、目標 milestone ID 與 actor 自身可見的最小欄位；非 owner／public／link 不可讀取。 |
| Journey 草稿微調 | 僅在瀏覽器記憶體中允許 owner 編輯已解析候選的標題與 UTC 日期；確認前不 mutation、不保存 provider ID 或 raw export。 | 標題與日期必須受限、可取消、重置原候選；確認後一律 private，payload 不可含剝除欄位。 |

> 視覺驗證紀錄：隔離 desktop 的受眾預覽截圖確認「目前／提議」scope、加入／移除狀態及規則調整均以文字、符號與色彩共同呈現；scope 成員標籤已調整為高對比前景色。此檢查不使用真實帳號或家庭資料。

## 下一輪：私有審核效率與回饋

| 交付 | 資料與隱私邊界 | 驗收 |
| --- | --- | --- |
| owner 稽核日期區間 | 日期控制只存在 owner 工作台；選擇後以可選 UTC 毫秒界線呼叫既有 owner-only 最小 audit read model。回應仍只能有時間、固定 action 與 milestone ID；不因篩選而回傳摘要、成員、actor、metadata、來源事件、媒體或位置。 | 拒絕無效／反轉範圍；owner 只能得到範圍內結果；清除篩選與空結果不產生 audit、通知或背景輪詢。 |
| Journey 批次日期時間 | 只對 owner 明確勾選、目前瀏覽器記憶體中的草稿套用一組日期時間；不重新讀 ZIP、不改未選草稿、不保存批次規則。 | 以純函式驗證本地輸入與 UTC 轉換；無效值不改草稿；每筆可重設；確認前零 mutation，確認 payload 仍不含被剝除來源欄位。 |
| Journey 成功回饋 | 只有既有 private batch-import 成功後顯示具 reduced-motion 支援的短 Toast 與過渡；文案僅包含建立數量。 | mutation 前、失敗或取消時不出現成功 Toast；Toast 不含標題、正文、日期、標籤、來源、位置或 provider ID，也不觸發額外寫入、上傳或通知。 |

> 視覺檢查：隔離 desktop 已確認 owner 稽核日期範圍的深色面板、清除控制與空結果只呈現時間範圍的狀態，未顯示家庭內容。Journey 批次工具提高紙色面前景對比後，已確認標題、輔助文字、日期欄與逐項草稿均可辨識；兩項檢查皆不使用真實帳號或家庭資料。

**已完成。** owner 稽核可用最多 366 天的本機日期區間查詢既有最小投影，反轉、無效與過長範圍在送出前拒絕。Journey 草稿可把一組合法日期時間只套用至已選項目，未選項與來源 ZIP 保持不變；private batch import 成功後才以 reduced-motion-safe Toast 顯示建立數量。完整 lint、型別、95 個測試檔／270 項、桌面與 375px 隔離 E2E、Vite PWA build、lazy route verifier、server bundle、secret scan、production audit 與 diff check 均通過。

## 下一輪：治理補強與跨匯入資料品質

| 交付 | 資料與隱私邊界 | 驗收 |
| --- | --- | --- |
| 秘密與依賴基準 | 使用既有不輸出內容的 Git 歷史掃描與 production-only audit；不把掃描文字、環境值或真實憑證寫入測試、Issue 或文件。 | 記錄實際 revision 數與 audit 結果；若失敗只回報類型與安全處置，不回顯候選秘密。 |
| 元件測試補強 | `PrivateHighlightAssistant` 與 `FamilyMilestoneLayer` 使用匿名、暫態 fixture，覆蓋同意／採用、受眾預覽、最小稽核、日期範圍與無內容狀態。 | co-locate Vitest；不得建立真實家庭、兒童、日記或評論資料；測試不呼叫模型、地圖、儲存或正式 OAuth。 |
| Issue 與依賴紀律 | 每輪先核對 open Issue 與既有依賴決策，將未實作的跨匯入去重列入可追蹤條目。 | 不以例行驗證另開 PR；新功能先有 Issue 或明確判定與既有 Issue 的關聯。 |
| 去重引擎預研 | 只規畫瀏覽器本機、明確觸發的候選比較；不得背景掃描既有私人媒體、不得將原圖、雜湊、GPS、來源 ID 或文字內容送往第三方。衝突必須保留使用者選擇，不得自動刪除或合併。 | 設計比較層級、誤判處理、私人資料保存期與四條匯入路徑的接線邊界；未完成前不宣稱已有跨來源去重。 |

去重預研採四層候選設計：現有 source key、目前選檔的本機 checksum、明確觸發的 Canvas pHash／dHash，以及正規化短標題與 UTC 日期窗口。`imagehash-web` 具 browser hash 與 Hamming distance 範例但社群規模小，因此目前只作原型參考；`jsdiff` 雖成熟，仍不適合把完整日記作比較輸入。完整評估見 [`IMPORT_DEDUPLICATION_RESEARCH.md`](../research/IMPORT_DEDUPLICATION_RESEARCH.md)。

**已完成。** 秘密掃描以七類模式檢查 181 個 revisions 並通過；production audit 為零已知漏洞。本輪補齊 `PrivateHighlightAssistant` 與 `FamilyMilestoneLayer` 的 co-located 測試，現有元件、資料層與文件回歸共 97 個檔案／274 項通過。依賴基準與現有重量級載入理由已在 CONTRIBUTING 記錄。既有 Issue #9–#12 已核對，新的私有跨匯入去重設計以 Issue #47 建檔，不在本輪假稱已實作。
