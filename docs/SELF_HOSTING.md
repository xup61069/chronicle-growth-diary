# Chronicle 自架、備份與還原指南

本文說明如何在**自有主機或受信任的本機環境**部署 Chronicle。它以 MySQL 保存結構化日記資料，以 S3 相容物件儲存保存媒體位元組，並以 Node.js 執行應用程式。這三個資料面必須一起備份與還原；只還原資料庫而沒有同步的媒體 bucket，會使影像引用失效。

> Chronicle 的受管理預設仍是 Manus OAuth、Forge 儲存與 Forge LLM。自架環境可改用本機帳密、MinIO/S3 和 OpenAI-compatible LLM，但請先在隔離環境驗證設定，再處理任何真實個人成長資料。

## 1. 目標架構與前置條件

| 元件             | 職責                                                 | 持久化資料                   | 不可提交的設定             |
| ---------------- | ---------------------------------------------------- | ---------------------------- | -------------------------- |
| Node.js 應用程式 | React 靜態資產、Express/tRPC API、登入與簽章 session | 無狀態；可隨時以同版程式重建 | `JWT_SECRET`、LLM 金鑰     |
| MySQL 8.x        | 使用者、日記、事件、標籤、分享設定、媒體 metadata    | MySQL volume 與邏輯備份      | `DATABASE_URL`、資料庫密碼 |
| MinIO 或 S3      | 原始圖片與其他媒體物件                               | bucket 與異地鏡像            | 存取金鑰與 secret key      |
| 反向代理         | TLS、網域、HTTP→HTTPS                                | 憑證設定                     | 私鑰、DNS／憑證帳號        |

MySQL 將備份與還原分為邏輯、實體、完整、增量與時間點復原等策略；選擇必須符合資料量與可接受的復原時間目標。[1] `mysqldump` 可產生可重新執行的 SQL 邏輯備份，適合 Chronicle 的小型到中型單一站點資料庫。[2]

在開始前，請確認主機已安裝 Docker Compose **或** Node.js 22、MySQL 8 與 S3 相容儲存。以下 Docker Compose 範例適用於開發、驗收與單一主機自架；若要承載正式個資，請把資料庫與物件儲存移到受管理服務或具備磁碟冗餘、監控與異地備份的獨立主機。MinIO 官方將容器部署定位為本機開發與評估情境，並建議正式容器編排從秘密檔讀取憑證。[3]

## 2. 環境設定

建立專案根目錄 `.env`；它不可加入 Git。下表的值皆為**欄位名稱與格式提示**，不是可直接使用的秘密。

| 類別        | 變數                                                                            | 設定原則                                                                                |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 應用程式    | `NODE_ENV=production`、`PORT=3000`                                              | 反向代理應連到內網 port，不直接公開資料庫與 MinIO 管理埠。                              |
| 資料庫      | `DATABASE_URL=mysql://<app_user>:<password>@mysql:3306/chronicle`               | 建立僅能存取 `chronicle` 資料庫的應用帳號；不要使用 root。                              |
| Session     | `JWT_SECRET=<至少32位元組隨機值>`                                               | 遺失或變更此值會使現有登入工作階段失效；輪替前先公告並規劃重新登入。                    |
| 本機登入    | `AUTH_DRIVER=local`、`VITE_AUTH_DRIVER=local`                                   | 前後端值必須一起設定；啟用後會呈現本機註冊／登入面板。                                  |
| 物件儲存    | `STORAGE_DRIVER=s3`、`STORAGE_S3_BUCKET=chronicle-media`                        | MinIO 額外設定 `STORAGE_S3_ENDPOINT=http://minio:9000`；保留 `STORAGE_S3_REGION=auto`。 |
| S3 憑證     | `STORAGE_S3_ACCESS_KEY_ID`、`STORAGE_S3_SECRET_ACCESS_KEY`                      | 建立限於單一 bucket 的應用程式憑證；禁止使用 root credential。                          |
| LLM（可選） | `LLM_DRIVER=openai-compatible`、`LLM_BASE_URL=https://<host>/v1`、`LLM_API_KEY` | 未設定時保留 Forge 預設；只在自行承擔模型服務與資料處理責任時切換。                     |

本機帳密模式以 scrypt 保存密碼雜湊，email 會正規化並有唯一索引保護。此版本尚未實作 email 驗證或密碼重設，因此不應直接用作公開、多租戶服務的唯一安全控制。

## 3. 單一主機 Compose 範例

以下為最小範例；將其儲存為 `compose.selfhost.yml`，並在同一目錄準備 `.env`。請在部署前自行替換網域、反向代理與所有秘密；不要將下方 placeholder 寫進真實 `.env`。

```yaml
services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: chronicle
      MYSQL_USER: ${MYSQL_APP_USER}
      MYSQL_PASSWORD: ${MYSQL_APP_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10

  minio:
    image: minio/minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data

  chronicle:
    image: node:22-bookworm
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./:/app:ro
    env_file: .env
    environment:
      DATABASE_URL: mysql://${MYSQL_APP_USER}:${MYSQL_APP_PASSWORD}@mysql:3306/chronicle
      STORAGE_DRIVER: s3
      STORAGE_S3_ENDPOINT: http://minio:9000
      STORAGE_S3_BUCKET: chronicle-media
      STORAGE_S3_REGION: auto
      STORAGE_S3_ACCESS_KEY_ID: ${MINIO_APP_ACCESS_KEY}
      STORAGE_S3_SECRET_ACCESS_KEY: ${MINIO_APP_SECRET_KEY}
    depends_on:
      mysql:
        condition: service_healthy
      minio:
        condition: service_started
    command: >-
      sh -lc "corepack enable && pnpm install --frozen-lockfile &&
      pnpm drizzle-kit migrate && pnpm build && pnpm start"

volumes:
  mysql_data:
  minio_data:
```

啟動前，先在 MinIO 建立 `chronicle-media` bucket 及僅限該 bucket 的應用程式憑證。Chronicle 會透過 `/manus-storage/:key` 取得短效讀取 URL，因此 bucket 不需要公開讀取。啟動時執行 `pnpm drizzle-kit migrate`，再以 `docker compose -f compose.selfhost.yml up -d` 啟動服務。首次部署後，請用 `docker compose ... logs -f chronicle` 檢查 migration、資料庫連線與 S3 簽章是否成功。

## 4. 備份作業

備份的最小單位是「**同一復原點的 SQL dump、媒體 bucket、版本化設定清單**」。設定清單只能記錄變數名稱、程式 commit、migration 版本與備份時間；不得包含 `.env` 或秘密。

| 資料面            | 每日備份範例                                                                      | 驗證方式                                                      | 保存建議                                               |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| MySQL             | `mysqldump --single-transaction --routines --triggers --no-tablespaces chronicle` | 在隔離資料庫執行還原與 `SELECT COUNT(*)`                      | 加密壓縮後異地保存；至少保留 7 個每日與 4 個每週版本。 |
| MinIO/S3          | `mc mirror chronicle/chronicle-media backup/chronicle-media`                      | 隨機比對物件數、key 與 checksum                               | 備份到另一個帳號／區域／主機，不能只是同一磁碟。       |
| 應用程式與 schema | Git commit、`drizzle/` migrations、版本化設定清單                                 | 從乾淨目錄執行 `pnpm install --frozen-lockfile && pnpm build` | Git 遠端與備份清單必須分開保存。                       |

`mysqldump` 需要足以讀取被匯出物件的 MySQL 權限，還原端則需要執行 dump 中 SQL 的建立與寫入權限。[2] Windows PowerShell 不宜直接以 `>` 重新導向 `mysqldump`，因為官方文件指出可能產生 UTF-16 檔案；請使用 `--result-file=chronicle.sql`。[2] `mc mirror` 用於在檔案系統、MinIO 與其他 S3 相容端點之間同步內容，適合用來建立 bucket 的離站副本。[4]

每月至少做一次**演練還原**。備份檔存在不等於可還原；MySQL 也明確建議在系統故障、硬體失效、誤刪或升級前規劃可用的復原策略。[1]

## 5. 安全還原程序

1. **宣告維護並停止應用程式寫入。** 記錄將使用的 SQL dump、bucket mirror、Git commit 與 UTC 時間。不要先覆蓋現場資料。
2. **建立隔離復原目標。** 使用新 MySQL database 與新 bucket，例如 `chronicle-restore-check`，先驗證完整性。
3. **還原資料庫。** 例如 `mysql chronicle_restore < chronicle-<timestamp>.sql`；若使用 Windows，請確保 dump 由 `--result-file` 產生。[2]
4. **還原媒體。** 以 `mc mirror backup/chronicle-media chronicle/chronicle-restore-check` 回填相同復原點的物件。不要混用不同日期的 SQL 與 bucket 副本。
5. **以相同程式版本驗證。** checkout 對應 Git commit、套用既有 migrations、使用隔離 `.env` 啟動，檢查登入、日記、縮圖與分享頁。不得以真實使用者 session 或生產密碼進行驗證。
6. **核准後切換。** 只有在資料列數、最新事件、媒體抽樣與日誌皆合理時，才把應用程式切到已還原目標。保留原資料至少一個觀察期，以便回退。

> **禁止做法：** 不要以「先清空正式資料庫再試看看」驗證還原；不要將 MinIO data directory 當成唯一備份；不要把 SQL dump、S3 secret、JWT secret 或含有使用者媒體的壓縮檔提交 Git。

### 5.1 全量封存 ZIP 的從零演練

全量 ZIP 是**擁有者可攜資料的個別日記還原工具**，不取代上方 SQL dump 加 bucket mirror 的整機復原。至少每次改動封存格式、還原 schema、附件限制或 storage provider 後，應在隔離 Chronicle 實例演練一次下列流程。

1. 在來源的 private 工作台手動建立全量 ZIP，記下 archive 版本、事件數、附件數與產生時間；不要把 ZIP、其媒體或 manifest 內容提交至 Git 或貼進 Issue。
2. 建立新的隔離 database、bucket 與測試 owner，確認該 owner 的日記為空。不得使用正式帳號、cookie、分享密碼或 production bucket。
3. 以隔離 owner 選取 ZIP。瀏覽器必須先驗證 `manifest.json`、可攜 payload、固定附件路徑及每一個 SHA-256，才顯示還原摘要。
4. 等待所有附件完成 staging；伺服器會再次比對 archive 宣告的 byte length 與 SHA-256。若任一附件失敗、逾時或取消，確認既有日記仍為空，且**不要**輸入確認字串。
5. 僅在摘要、事件數與附件數合理時輸入「`還原我的成長史`」並提交。驗證事件、標籤、階段回顧、修訂與附件皆可由隔離 owner 讀取，並抽樣檢查附件內容與 manifest 相符。
6. 驗證所有還原內容為 private：舊 public／link URL、密碼、token、邀請與存取紀錄不應可用或被恢復。最後銷毀隔離 database、bucket 與測試帳號。

> **目前已知限制：** 取消或 30 分鐘逾時的還原 session 不會自動清除已寫入 private storage 的 staging object；它不會改動既有日記 rows，但可能留下孤立附件。未完成受控清理設計前，演練結束要刪除整個隔離 bucket；不要把這個行為誤報為已自動清理。

## 6. 事件回應與維運清單

| 情境                   | 首要動作                                               | 後續動作                                                   |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| 應用程式無法連線 MySQL | 保留現場 log，檢查 `DATABASE_URL`、網路與 MySQL health | 若資料庫損毀，再啟動隔離還原流程。                         |
| 圖片無法顯示           | 檢查 `/manus-storage` 代理、bucket key 與 S3 憑證權限  | 不要將 bucket 改為公開；以短效簽章與最小權限修正。         |
| 誤刪日記或媒體         | 停止進一步寫入，記錄事件時間                           | 依最近一致復原點還原到隔離環境，匯出所需資料後再人工合併。 |
| JWT secret 外洩        | 立即輪替 `JWT_SECRET` 並重啟應用程式                   | 通知使用者重新登入，檢視部署與 log 存取範圍。              |

## References

[1]: https://dev.mysql.com/doc/refman/8.0/en/backup-and-recovery.html "MySQL 8.0 Reference Manual — Backup and Recovery"
[2]: https://dev.mysql.com/doc/en/mysqldump.html "MySQL Reference Manual — mysqldump"
[3]: https://docs.min.io/aistor/installation/container/ "MinIO AIStor Documentation — Container"
[4]: https://docs.min.io/aistor/reference/cli/mc-mirror/ "MinIO AIStor Documentation — mc mirror"
