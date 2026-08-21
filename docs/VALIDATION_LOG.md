# 驗證基準

本文件只保留目前可重現的品質基準與已知限制，不作為逐次提交或開發過程的日誌。版本變更請發布於 [GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases)，長篇設計討論與驗證結論請使用 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## 目前品質基準

| 範圍 | 狀態 | 可重現方法 |
| --- | --- | --- |
| 格式、型別、單元測試與正式建置 | 通過 | `pnpm lint && pnpm check && pnpm test`，再分別執行 `./node_modules/.bin/vite build` 與 `pnpm exec esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`。目前基準為 **63 個測試檔、178 項 Vitest**。 |
| 公開首頁 375px | 通過 | 設定 HTTPS `CHRONICLE_E2E_BASE_URL` 後執行 `pnpm test:e2e:mobile-nav`。覆蓋跳至主要內容、行動導覽、範例入口、時間帶鍵盤探索、事件類型篩選的 `aria-pressed`、僅公開欄位的關鍵字搜尋、自動完成的 Escape／Arrow／Enter 選取、搜尋命中 `mark`、日期與類型交集篩選、由新到舊／由舊到新排序、搜尋欄一鍵清除、網址參數同步與分享連結還原、每批三筆的載入更多、零結果插圖、近期事件建議、零結果清除、減少動態下無結果過渡與離線紀錄入口。首頁改採事件、日期、資料可見範圍與操作流程等直接產品文案，已以桌面與 375px 檢查可讀性。 |
| 路由載入邊界 | 通過 | Vite 將資料客戶端、圖表、文件匯出、圖示庫與僅工作台使用的 UI 套件分離為可快取 chunk；公開首頁入口產物由 **151.74 KiB** 降至 **128.53 KiB**（減少 **23.21 KiB／15.00%**）。`RouteLoadingState` 提供 `aria-busy` 與 live status；公開首頁 375px、以及隔離 local-auth 的 375px／桌面 `/editor`、`/dashboard` 與返回導覽回歸均通過。 |
| 按需文件匯出邊界與下載 | 通過 | `diaryExport.ts` 僅以 `import("html2canvas")` 與 `import("jspdf")` 載入大型依賴；`diaryExportCodeSplitting.test.ts` 禁止回歸為靜態 import，`diaryExport.test.ts` 覆蓋多頁 PDF 與長圖片下載的封裝流程。壓縮 Vite 產物確認 `DiaryEditor` 以動態 `import()` 指向 **593.38 KiB** 的 `document-export` chunk，而公開首頁入口沒有此 chunk 參照；`route-preload` 則先於一般 `node_modules` 規則獨立分割。隔離 local-auth 的 `pnpm test:e2e:editor-document-export` 已以真實的「匯出 PDF／匯出長圖片」按鈕確認兩種非空下載；無登入的 `pnpm test:e2e:document-export` 則以小型內容夾具保護動態依賴與下載檔案，並納入 CI。 |
| 隔離 local-auth 編輯器 | 通過 | 設定 HTTPS `CHRONICLE_E2E_BASE_URL` 後執行 `pnpm test:e2e:isolated`。腳本會建立並清除暫時帳號，覆蓋 375px 日記載入、分頁、事件選取、private 語音日記入口與本機優先狀態、家庭反應切換、A5 私人書冊預覽、年度 AI 同意與 private 事件 Markdown 匯出、成長數據儀表板，以及 `diary.get` 逾時／失敗恢復。 |
| 照片 EXIF 批次匯入 | 通過 | 僅接受每批最多 24 張、單張不超過 4MB 的 JPEG；瀏覽器端動態載入 EXIF 解析器，先選取 `DateTimeOriginal`／`CreateDate`，並在目前照片預覽明確提供位置功能時才於本機讀取正規化 GPS。確認前，照片、日期草稿與座標不會上傳，事件也不會建立；確認後每個日期群組以 private 事件與既有受保護媒體上傳流程寫入。每張有效 JPEG 都有本機 `datetime-local` 草稿，EXIF 值可微調，缺少或無法讀取 EXIF 時可手動補填；未補齊的候選會阻止確認，不會被靜默略過。若全數因格式或大小不合格而略過，工作台仍會完整保留每張照片與原因、明示不會上傳或建立事件，且不顯示確認操作。上傳時以具名 `role="progressbar"` 呈現目前照片與完成張數。單元測試覆蓋標準 JPEG `DateTimeOriginal`、分批、手動補填與重新分組；HTTPS local-auth 隔離回歸已於 1280px 與 375px 實際確認缺少 EXIF 的手動補填、日期時間微調、確認阻止與私人建立，並以延遲附件請求驗證進度條、目前檔名與完成張數。 |
| 深色主題、GPS 與批次日期 | 通過 | 新工作階段由載入前 root class 預設進入 dark 模式，首頁導覽可切換至明亮模式並以 localStorage 保留；`dark-mode-home-validation.mjs` 驗證預設、切換與重新載入。照片預覽現在僅在使用者選取 JPEG 後於本機讀取標準 EXIF GPS，允許在確認前手動校正緯度／經度；座標成對驗證，確認後只以 `precise`／`private` 事件位置保存。每張可勾選，批次日期時間僅覆寫明確選取的照片並立即重新分組。標準 JPEG GPS IFD 單元夾具、桌面及 375px HTTPS local-auth 回歸均覆蓋 GPS 讀取、手動校正、批次套用、private 提示及延遲附件進度。 |
| 照片地圖確認與時間遞增 | 通過 | `photoMap.preview` 為已登入使用者才可呼叫的 Maps proxy 程序，僅在使用者於本機座標完整時按下「確認位置地圖」才請求靜態地圖影像。地圖畫布可直接點選，或拖曳標記後放開，透過 Web Mercator 換算回填照片的本機緯經度、使舊地圖失效並要求重新確認；地圖不會持久化，確認後仍僅依既有 `precise`／`private` 規則保存座標。批次日期增加非負整數秒數控制，按預覽中明確選取的穩定順序將第 `n` 張設定為 `base + n × seconds`，保留秒級時間並即時重新分組。`photoMap.test.ts` 覆蓋驗證範圍與登入邊界，照片 helper 測試覆蓋 7 秒遞增、未選取照片保留及地圖中心／偏移點投影；桌面與 375px HTTPS local-auth 回歸以受保護地圖回應驗證地圖拖曳、GPS 回填、舊圖失效、7 秒／5 秒遞增、private 提示與上傳進度，並攔截最終 `diary.createEvent` 請求確認 private 事件包含拖曳後的座標。前一輪深色／GPS 提交已成功推送至 GitHub `main` 的 `570bd54`。 |
| 公開故事閱讀版型 | 通過 | `SharedStory` 測試覆蓋 `editorial`、`gallery` 與 `minimal`；隔離 local-auth 已完成三種版型的 375px 視覺回歸。 |
| 社群分享中繼資料 | 通過 | `socialMetadata.test.ts` 驗證 Open Graph 與 Twitter 圖片皆採 Chronicle 品牌時間帶視覺與替代文字。 |
| 離線快速記事 | 通過 | `/quick-note` 使用目前瀏覽器的 localStorage 保存草稿；單元與 375px 回歸覆蓋儲存、還原、清除與複製行為。 |
| 年度回顧隱私 | 通過 | AI 生成必須每次確認，僅處理指定年份的 private 事件；`public`／`link` 事件不會送往 AI。年度 AI 與 Markdown 匯出控制項僅對日記擁有者呈現，未登入 router 呼叫會被拒絕。 |
| 成長數據儀表板隱私 | 通過 | `stats.growth` 為受保護且 owner-only 的程序；SQL 與第二層 helper 均限制為 private、非 public 事件。前端僅接收摘要、月份密度、階段計數與關鍵字頻率，沒有日記正文、媒體或地點。隔離 local-auth 已完成 375px 與 1280px 視覺驗證。 |
| 語音日記隱私 | 通過 | 語音上傳只接受 private 事件、受保護的事件寫入權限與每次 `confirmAiProcessing` 同意。原音先存於本機 IndexedDB，僅在使用者按下上傳後送往 Whisper；資料表僅保存原音 key／URL 與逐字稿，且公開與連結分享回應一律清空 voiceNotes。單元與 375px local-auth 回歸已覆蓋同意、格式、分享遮罩與入口狀態。 |
| N 年前的今天站內回憶 | 通過 | `diary.getOnThisDay` 會在伺服器先驗證 diary access role；只有 owner 才會執行查詢，editor／commenter 一律取得空集合。資料層只讀取前一個曆年、同月同日、`datePrecision: day`、`shareScope: private` 且非公開事件的最小欄位；月份或年份精度、當年、公開與連結事件均排除。未解鎖膠囊只回傳 ID、年份差與倒數，不回傳標題或事件類型。隔離 local-auth 的桌面與 375px 回歸會建立同日私有事件與鎖定膠囊，驗證遮罩並從卡片開啟既有預覽。第一階段不要求通知權限、沒有背景排程，也不會將日記內容送往外部服務。 |
| 私人月度成長摘要 | 通過 | 工作台只由 owner 取得的 private snapshot 衍生可選月份；`monthlyDigest` 排除 public、link 與 year-only 事件，依選定月份彙整事件數、類型與標籤。月度列印預覽採既有使用者觸發 A5 流程，未解鎖膠囊仍會在文件中遮罩標題、本文、媒體與逐字稿。隔離 local-auth 的桌面與 375px 回歸均建立已解鎖與鎖定的當月事件，確認摘要統計、預覽開啟、可讀事件編排與膠囊標題遮罩。摘要不會自動寄送、推播或公開分享。 |
| 未來信件第一階段 | 通過 | `futureLetters` 只索引 private、非公開且具解鎖日期的事件；鎖定信件依最近解鎖日排序並刻意移除標題，已解鎖信件才提供既有預覽開啟入口。介面標示 30 天內即將開啟的膠囊，且明確說明這是站內索引，不寄送 Email、不建立背景排程或通知。單元測試涵蓋 private 範圍、link/public 排除、排序與標題遮罩；隔離 local-auth 的桌面與 375px 回歸確認已解鎖信件可開啟、鎖定信件不顯示標題。 |
| 成長里程碑範本 | 通過 | 撰寫區提供六個本機範本，包含第一次走幾步、清楚表達、換牙、新練習、自主完成與生活新階段。套用僅填入可覆寫的標題、寫作提示、事件分類、軌道、里程碑類型、標籤與階段關鍵字；保留使用者日期、地點、分享範圍與其他表單內容，不會自動建立事件或傳送日記。單元測試覆蓋欄位保留與集合上限；隔離 375px local-auth 回歸會實際套用範本並確認日期不變、標題及提示可編輯。 |
| 公開分享頁語音隔離 | 通過 | `pnpm test:e2e:shared-story-voice-isolation` 攔截公開分享回應並故意帶入私有原音 URL、檔名與逐字稿；SharedStory 必須仍顯示可分享事件，但不得出現私有文字、URL 或 `<audio>`。此無登入毒化回應回歸已納入 CI，並與資料層清空 `voiceNotes` 的單元測試互補。 |
| A5 私人書冊 | 通過 | 書冊僅由日記擁有者從現有私人工作台資料開啟，使用者在新視窗明確觸發列印／另存 PDF；以生命階段與事件順序編排，未解鎖膠囊的正文、媒體及逐字稿一律遮罩。單元測試覆蓋內容跳脫與膠囊遮罩；隔離 local-auth 已完成 375px 與 1280px 預覽回歸。 |
| 家庭事件反應 | 通過 | 只有日記擁有者與受邀成員可針對 private 事件切換四種反應；資料表以事件、使用者與反應組合唯一索引防止重複。反應只回傳聚合計數與目前使用者選取狀態，並記錄新增／移除稽核動作；分享層明確剔除反應欄位。資料層、路由、375px 與 1280px local-auth 回歸已覆蓋。 |

## 正式 OAuth 驗證邊界

公開預覽的登入按鈕會以既有 nonce、`state`、`appId` 與 callback 契約導向 `https://manus.im/app-auth`。然而，2026-08-20 的檢查顯示：帶參數的導向及不帶參數直接造訪該入口都回傳 CloudFront 403。拒絕在 Chronicle callback 之前發生，因此不是本專案的 state 驗證或 `diary.get` 邏輯所造成。

正式 Manus OAuth 工作階段的 `diary.get` 成功載入仍待外部登入入口恢復後驗證。隔離 local-auth 證據不替代此項正式整合驗證。

## 瀏覽器文件匯出驗證邊界

2026-08-20 進行隔離 local-auth 的完整工作台實際 PDF／長圖片下載整合嘗試時，headless Chromium 曾在不同時點發生 `Target crashed` 或 `Page crashed`；一度在觸發 PDF 下載後中斷。以重建的 local-auth 服務重試後，精簡的 `editor-document-export` 回歸已可建立一筆 private 事件，並直接點擊 DiaryEditor 的「匯出 PDF／匯出長圖片」按鈕，確認兩種下載皆有預期副檔名及非空檔案。無登入的最小化回歸不載入帳號、日記或分享資料，用於 CI 保護動態依賴與下載基本契約。完整工作台的長篇實際內容、跨瀏覽器與使用者裝置驗證仍應在後續釋出前進行。

## 驗證規則

公開介面變更至少需執行 `check`、`test`、`build`，並在桌面與 375px 檢查版面及 `prefers-reduced-motion`。涉及受保護資料、分享、媒體或 AI 的變更，還必須覆蓋擁有權、分享範圍與資料處理邊界。
