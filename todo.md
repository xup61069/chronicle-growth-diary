# Current Sprint — Repository Governance

> 歷史工作過程與版本說明不再堆放於本檔；請參閱 [`docs/roadmap/`](./docs/roadmap/README.md)、[GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases) 與 [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions)。

## Active

- [ ] 使用者已要求跳過所有手動操作；不得代為建立本機帳號、登入、OAuth 授權、填寫個人資料或建立／啟用每日回憶排程。本機登入只保留入口，回憶檢查維持預設關閉且不外送內容。
- [x] 將全域 JSON／urlencoded request body 限制由 50MB 收斂為一般端點 2MB，媒體 base64 tRPC 僅在 `/api/trpc` 使用 25MB 專用上限；超限一般請求固定回傳 413 `request-body-too-large`。已以實際 Express 3MB request 回歸確認一般端點拒絕、tRPC 路徑通過，並完成全量品質驗證。
- [x] 新增 production build lazy-route chunk 健康檢查，驗證六個核心延後載入頁面在建置產物中存在並由入口參照，且公開首頁不會重引入曾導致初始化順序故障的 Recharts `charts` 手動共享 chunk；已接入 `pnpm build` 與 CI。
- [x] 盤點並收斂 Drizzle migration 目錄：確認 `drizzle.config.ts` 只輸出至根 `drizzle/`，移除空的舊 `drizzle/migrations/.gitkeep`，文件化 SQL／meta 唯一來源並補足 migration layout 契約測試避免 schema 漂移。
- [x] 漸進拆分過大的 `DiaryEditor.tsx`：已抽出不改資料寫入邊界的每日回憶、回憶檢查、未來信件與月度摘要展示區塊至 `PrivateMemoryStudios`；通過 server-render、隱私契約、lint、型別、全量 Vitest、build 與既有隔離 local-auth 桌面／375px 工作台回歸，確認 owner-only 可見性、鎖定遮罩與列印入口均維持可用，測試資料已清理。
- [x] 移除 Express `res.clearCookie` 已廢棄的 `maxAge`／`expires` 清除選項；登出與帳號刪除改由 Express 原生過期機制處理，保留 Path、HttpOnly、Secure、SameSite=Lax 契約，並補足兩條清除路徑的回歸。
- [x] 修正 GitHub CI 預設 Manus driver 下的 local auth fallback 回歸：測試隔離 mock `AUTH_DRIVER=local`，不依賴部署環境變數，且已在預設 Manus driver 下通過 lint、型別、75 個測試檔／200 項 Vitest 與 production build。
- [x] 盤點並收斂伺服器排程／認證例外日誌：每日回憶與 OAuth callback 僅保留固定操作與錯誤碼，不輸出原始 error、request body、session、授權碼或日記內容；已補足兩條錯誤路徑的 redaction 契約回歸並完成全量品質驗證。

- [x] 驗證本機與 Manus session cookie 的 SameSite、Secure、HttpOnly 與 Path 契約；session 改為 `SameSite=Lax`，OAuth state nonce 維持獨立的 cross-site cookie，並補足 local register、OAuth callback、logout 的安全回歸。安全修正版正式 `/editor?release=13defe98` 亦已確認仍顯示本機帳密面板。
- [x] 更新安全與 AI 交接文件，記錄 session cookie 的 `SameSite=Lax` 邊界、獨立 OAuth state nonce 的 `SameSite=None` 理由，以及對應回歸測試位置。
- [x] 將每日回憶排程 callback 的未預期 500 回應改為固定、安全的 `recall-check-failed` 錯誤碼與 server-side context log，不向平台回傳資料庫或內部錯誤原文，並補足 cron-only／失敗路徑測試。
- [x] 移除未設定 analytics endpoint 時由 `client/index.html` 產生的無效 Umami script request；僅於 endpoint 與 website ID 都存在時動態載入，並通過 source／正式 HTML 產物契約驗證。

- [x] 統一測試放置與文件規則，確認並補強 CI 的 lint、型別、測試、建置與公開／隔離 E2E 範圍；整理 ideas、template 與 pnpm patches 的治理說明，執行工作樹秘密模式掃描、供應鏈盤點與 GitHub 分支保護設定。完整 Git 差異歷史掃描曾超時，且帳號無 secret alert API 讀取權；此限制已記錄於 AI handoff，持續依賴 GitHub secret scanning／push protection 與每次交接的受控掃描。
- [x] 建立使用者可控且預設關閉的「那年今日」與未來信件提醒偏好／遞送基礎，通知不含日記內文；未設定可用郵件或推播提供者時必須優雅停用，並補足 owner、private、到期與失敗路徑測試。（使用者選擇 A：此階段只建立站內的最小檢查狀態，不寄送 Email 或推播。）
- [x] 依使用者選擇 A，實作不依賴外部寄信或推播服務的 owner-only 回憶偏好與每日檢查：預設關閉、可停用、只保存最小檢查狀態、不建立外送內容，並預留日後安全接上遞送提供者的邊界。
- [ ] 使用者發布後，依其明確回覆啟用每日站內回憶檢查；確認僅建立／恢復 owner 的平台排程，且不開啟 Email、推播或任何日記內容外送。
- [ ] 調查並修復使用者回報的正式 OAuth 登入後 404：已重現部署 runtime 回傳 `/manus-oauth/callback` 而落入 SPA fallback 的路徑，並讓其與 `/api/oauth/callback` 共用 nonce 驗證與 token exchange handler；仍待使用者完成正式登入以確認可進入私人工作台。
- [ ] 調查標準 `/api/oauth/callback` 只收到 `state`、未收到 OAuth `code` 而呈現 404 的正式登入故障；已由舊 `/app-auth`、camelCase 參數與 `type=signIn` 遷移至正式 `/login`、`app_id`、`redirect_url` 與 state，並以 HTTPS 預覽登入導向 E2E 驗證。仍待正式重新發布後由使用者登入確認 callback、session 與工作台可達。
- [ ] 使用者重新嘗試後仍只收到 state-only `/api/oauth/callback`，代表其登入路徑未使用新版 `responseType=code` 或 hosted sign-in 未支援該參數；正常正式頁面曾載入舊 `index-fzdnzrFG.js`，但帶 `?release=f32c3362` 的導覽已取得 `index-CnwkAW3T.js`，其中含 `responseType` 且不含 `signIn`。需用新版入口完成實際登入驗證，必要時再建立 state-only callback 相容流程。
- [ ] 使用者已以新版入口重試，仍只得到 state-only callback；停止將問題歸因於 PWA 快取，改為盤點 hosted sign-in 實際回呼契約、可驗證的 server-side exchange 與不降低 nonce／owner 資料邊界的相容方案。
- [ ] 依正式 Manus OAuth 規範將登入入口改為 `/login`，使用 `app_id`、`redirect_url` 與 `state`，保留 host-only nonce cookie、原始 state token exchange 和固定工作台導向；新增契約回歸並以正式登入驗證 code、session 與 `/editor`。
- [ ] 使用者目前被導至 `https://manus.im/app?app_id=…&from=google&redirect_url=…&state=…`，但未回到 Chronicle callback；盤點外部 Manus app 授權頁所需動作／限制，並選擇不繞過 OAuth、保留 owner 資料邊界的可行登入方案。
- [ ] 已確認 `manus.im/app` 會自動導至 Manus 的 `/login?redirectUrl=…`，並顯示 Google、Email、passkey 等登入選項；需使用者完成其 Manus 帳號登入後才會繼續回到 Chronicle callback，再驗證 code、session 與 `/editor`。
- [ ] 使用者在外部 Google／文件授權階段收到 403「沒有存取這個文件的權限」，拒絕尚未到達 Chronicle callback；保留 OAuth nonce 與 owner 邊界，盤點外部限制並設計使用者可控的安全替代登入方案。
- [x] 依使用者選擇 A 啟用既有本機帳密登入 fallback：設定正式 `AUTH_DRIVER=local` 與 `VITE_AUTH_DRIVER=local`；local registration tRPC regression 已確認 scrypt 雜湊與安全 session cookie，未登入 HTTPS 開發版 `/editor` 已顯示既有 Email／密碼登入及建立帳號面板；不移除 Manus OAuth 程式碼。
- [x] 正式 fallback UI 驗證：首次發布的舊入口資產不含 local mode；改為 server-driven `localAuthStatus` 後，帶版本查詢的正式桌面 `/editor` 已顯示 LocalAuthPanel，且只讀 375px 正式 smoke test 已確認 Email、password 與建立帳號入口，未建立帳號或寫入日記。
- [ ] 使用者以自己的 Email、顯示名稱與至少 12 字元密碼建立首個本機帳號後，確認可進入工作台並依明確回覆啟用每日站內回憶檢查；該流程不得開啟 Email、推播或日記內容外送。
- [ ] 調查並修復使用者回報的正式 `chronotime-w3ztsoiq.manus.space` `ERR_CONNECTION_ABORTED`；目前探針已確認 DNS 解析、TLS 驗證、HTTP 200 與獨立瀏覽器首頁渲染均正常，正式執行紀錄未見服務啟動錯誤。待使用者重新連線確認是否為短暫發布切換或其網路路徑中止，恢復後再重試 OAuth。
- [x] 定位並在開發版本修復使用者回報的正式站「整個沒畫面」故障：根因為匿名首頁的 `auth.me` 錯誤被全域自動導向 OAuth；已移除該跳轉、在未登入 HTTPS 開發首頁驗證可見性，並新增靜態回歸測試。
- [x] 重新發布包含公開首頁未登入修正的正式版本到 `chronotime-w3ztsoiq.manus.space`。
- [x] 在正式網域以未登入狀態驗證桌面與 375px 首頁可見性，確認不再自動跳轉 OAuth 且首頁內容可見；已定位並修復第二個根因：Recharts 的 `charts` 手動 chunk 在 React runtime 初始化前讀取 `forwardRef`，使入口 module 評估失敗且 root 空白。已移除此分包；正式桌面匿名頁已可見首頁內容、登入按鈕與搜尋控制，正式網域 375px `pnpm test:e2e:mobile-nav` 亦通過。PWA 另加入立即接管、舊快取清理與設定契約測試以降低舊入口殘留風險。

- [x] 更新雙語 README、架構、測試、安全與功能路線圖，建立 `docs/AI_HANDOFF.md` 和擴充 `AGENTS.md`，讓其他 AI 可重現目前私有資料邊界、驗證流程、外部 OAuth blocker 與 GitHub 交接規則。

- [x] 在照片地圖加入可拖曳標記以直接更新 GPS，並於桌面與 375px 回歸驗證地圖互動後送入最終 private 事件的座標與預覽草稿一致。

- [x] 將照片位置地圖升級為可互動的地圖小工具，支援點選或拖曳標記直接更新緯經度，並補足桌面及 375px 地圖互動後 private 座標一致性回歸。

- [x] 重新推送已保存的深色模式與照片匯入提交至 GitHub；在照片預覽加入可確認／調整 GPS 的地圖小工具，以及多選照片批次日期時間的可設定秒數自動遞增，補足桌面及 375px 回歸與技能更新。

- [x] 建立預設深色模式並保留可切換主題；在照片匯入預覽支援確認前 GPS 讀取／手動位置校正與多選照片的批次日期時間套用，補足桌面及 375px 回歸與隱私驗證。

- [x] 補足 375px 照片匯入回歸：缺少 EXIF 的手動日期時間補填須解鎖確認操作，且延遲媒體上傳時須顯示目前檔名與完成張數進度。

- [x] 將照片日期匯入流程封裝為可重複使用技能，並在確認前提供逐張日期／時間校正、缺少 EXIF 的手動日期補填與批次上傳進度回饋，補足桌面及 375px 回歸。

- [x] 將照片 EXIF 全數略過預覽改為完整列出每張照片與原因，並驗證格式、檔案大小及缺少日期都不會產生上傳或建立操作。

- [x] 照片 EXIF 匯入在全數略過時仍保留結果預覽，逐一顯示缺少日期、格式或檔案大小的原因，並補足回歸驗證。

- [x] 新增照片 EXIF 批次匯入第一階段：僅在瀏覽器端解析拍攝日期、預覽日期分組與缺失資料，使用者確認後才建立 private 事件與附件，並補足檔案限制及行動版回歸。

- [x] 新增可編輯的成長里程碑範本，讓使用者可在撰寫區快速套用常見節點的標題、分類、標籤與寫作提示，並補足行動版回歸。

- [x] 新增 owner-only 未來信件索引：以既有時空膠囊整理鎖定、已解鎖與即將到期事件，提供工作台開啟入口與桌面、行動版遮罩回歸；不安排 Email 或背景遞送。

- [x] 新增 owner-only 月度成長摘要：依選定月份整理 private 事件、遮罩未解鎖膠囊，提供使用者觸發的列印／另存 PDF 入口與桌面、行動版回歸。

- [x] 將「N 年前的今天」改為後端 owner-only 查詢，僅回傳同日 private 事件的最小回憶欄位與膠囊遮罩，並補上 owner／editor／commenter、日期精度與分享範圍的資料層測試。

- [x] 新增僅日記擁有者可讀的「N 年前的今天」站內回憶查詢與工作台回憶卡，涵蓋同月同日、日期精度、時空膠囊遮罩、空狀態及開啟事件入口。

- [x] 設計並確認「N 年前的今天」私有回憶功能的交付方式、通知授權、排程邊界與使用者控制：第一階段採站內 owner-only 回憶卡，不要求推播授權、不安排背景工作、不將內容送出本站；未來推播或 Email 另行建立偏好、授權與已發佈的排程流程。

- [x] 在首頁搜尋欄加入一鍵清除，將公開搜尋與篩選條件同步到網址參數，並以可及的「載入更多」分批呈現大量結果及回歸驗證。

- [x] 建立並驗證可重複使用的時間帶搜尋互動技能，收錄自動完成、命中標記、篩選回饋與可及性驗證流程。
- [x] 在首頁時間帶加入關鍵字自動完成、搜尋命中標記，以及篩選／搜尋的平滑過渡與載入狀態提示，並補足鍵盤與行動版回歸。

- [x] 建立並驗證可重複使用的首頁時間帶篩選技能，收錄資料模型、可及性、測試、視覺檢查與保存流程。
- [x] 在首頁時間帶加入關鍵字搜尋、日期新舊排序，以及包含插圖與事件建議的零結果狀態，並補足行動版與鍵盤回歸。

- [x] 在首頁示範時間帶新增日期與事件類型的搜尋篩選，保留篩選狀態語意、鍵盤操作、空結果與行動版回歸。

- [x] 將首頁與核心入口文案改為克制、直接且具體的產品語氣，降低煽情與過度修辭，並更新桌面與行動導覽回歸。

- [x] 新增公開分享頁的語音日記隔離瀏覽器回歸，確認原音、逐字稿與私有語音欄位不會呈現在 shared story。

- [x] 更新 docs/roadmap/FEATURES.md，反映已完成的私有語音日記、成長儀表板、A5 書冊、家庭事件反應與按需文件匯出驗證。

- [x] 在可用的真實瀏覽器工作階段補驗 PDF／長圖片下載，確認使用者觸發匯出後的檔案下載與基本輸出正常；以最小化私人內容節點避開完整工作台的環境中斷，驗證 PDF／PNG 檔名與非空輸出，並納入 CI。

- [x] 將 jsPDF 與 html2canvas 維持為使用者觸發匯出時才載入，並以靜態回歸、壓縮 Vite 產物與首頁無參照檢查驗證文件匯出 chunk 邊界。

- [x] 更新開源文件，整理近期私有儀表板、語音日記、A5 書冊、家庭反應與路由載入效能的使用方式、資料邊界與驗證連結。

- [x] 重跑隔離 local-auth 的 `/editor` 與 `/dashboard` 瀏覽器回歸，明確驗證路由延遲載入後私有工作台、成長儀表板與返回導覽仍正常，並補入驗證基準。

- [x] 改善路由層級載入效能：延後載入私人工作台與大型依賴，保留公開首頁初始體驗、可及載入狀態與既有路由回歸。

- [x] 實作家庭事件反應 MVP：只允許真實日記成員為私有事件建立或移除反應，公開／連結分享一律隔離，並提供無障礙與行動版回歸。

- [x] 實作私有 A5 印刷準備書冊：以生命階段編排成長事件，提供使用者觸發的列印／另存 PDF 入口與桌面、行動版回歸。

- [x] 修正桌面寬度下工作台索引與預覽面板被 mobile 顯示規則隱藏的回歸，並重新驗證語音日記與三欄工作區。

- [x] 實作語音日記 MVP：每次轉寫前明確同意，將私人事件音檔與逐字稿安全保存，離線錄音先留在裝置並提供上傳、刪除與行動版回歸。

- [x] 依具體場景優先原則重寫公開首頁核心文案與行動入口，保留既有可及性語意、行動導覽與回歸測試。

- [x] 實作 owner-only 成長數據儀表板 MVP：以私有日記事件聚合年度寫作密度、關鍵字與連續紀錄，提供行動版可及性視覺化與完整隱私回歸。

- [x] 將年度回顧的 private 範圍、每次 AI 同意、owner-only 控制項與 Markdown 匯出改善同步至 GitHub `main`。

- [x] 完成年度回顧 MVP 的私有資料範圍：以明確 AI 同意為前提，僅彙整擁有者指定年份的 private 日記事件生成回顧，並提供 Chronicle frontmatter Markdown 匯出與隱私回歸測試。

- [x] 完成 P0/P1/P2 儲存庫治理基準：README 整併、文件治理、測試分層、CI、安全貢獻文件與功能 roadmap。

- [x] 完成年度回顧 MVP 的路由、介面、匯出與資料擁有權驗證。

- [x] 新增年度 AI 回顧隱私回歸：驗證 public/link 事件不會送往 AI，且非擁有者無法生成或匯出他人年度回顧。
- [x] 整併 README 為中文主版與單一英文版，刪除分叉的 README_EN.md，並加入雙向語言切換連結。
- [x] 移除不必要的根目錄 .gitkeep，將驗證文件重整為可重現基準。
- [x] 建立測試檔案的 co-location 與分層規範，整理 client/src 與 server 根層測試的可維護結構。
- [x] 文件化 server/_core、server/routers.ts 與 server/routers 的路由邊界與遷移規範。
- [x] 擴充 GitHub Actions，執行型別檢查、Vitest、正式建置與不需登入的公開首頁 E2E。
- [x] 擴充 SECURITY.md、CONTRIBUTING.md 的 OAuth、AI、家庭與兒童資料處理、漏洞回報及測試規範。
- [x] 建立分階段功能 roadmap，收錄年度回顧、語音日記、成長儀表板、印刷 PDF 與家庭互動功能，標示隱私與技術依賴。

## Blocked — external OAuth

- [ ] 在正式 Manus OAuth 工作階段確認 `diary.get` 實際送出並成功載入日記內容；隔離 local-auth 驗證另行記錄。
- [ ] 在主開發站或正式工作階段實證 `diary.get` 成功送出並載入內容，並記錄可追溯驗證結果。
- [ ] 延後執行需有效登入工作階段的瀏覽器互動驗證：主開發站或正式 OAuth 工作階段的 `diary.get` 成功載入仍待實證。
- [ ] 診斷並修正公開預覽的 OAuth 登入頁面 403；目前證據顯示拒絕發生於外部入口、尚未抵達 Chronicle callback。
