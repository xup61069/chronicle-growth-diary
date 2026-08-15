# 貢獻 Chronicle

感謝你協助讓個人成長史的記錄工具更可靠、更可攜。提交前，請先閱讀 [`AGENTS.md`](./AGENTS.md) 與 [`ideas.md`](./ideas.md)。

## 快速開始

請使用 Node.js 22 與 Corepack。複製 `.env.example` 為 `.env`，填入你所使用開發環境需要的資料庫與整合設定；**不要**將 `.env` 加入提交。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

目前 OAuth、儲存與 AI 仍連結至既有整合環境；可完全自架的提供者抽象正列為後續里程碑。在提出能改善自架能力的變更時，請保留現有流程並補充測試。

## 提交原則

請讓每個 Pull Request 聚焦單一問題，說明使用者影響、資料庫 migration、測試結果與桌面／手機檢視情況。任何新增事件、媒體、分享或 AI 功能，都必須檢查使用者擁有權、分享可見度與個資影響。
