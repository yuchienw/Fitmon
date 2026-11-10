# FitMon - 健身遊戲化 APP 專案

> **以運動科學為基底的像素 RPG 養成、專業訓練紀錄與無個資社交生態系統**

---

## 📌 專案即時狀態看版 (Status Board) - AI 與團隊每次必讀

> [!IMPORTANT]
> - **當前階段**：`Phase 0 - 規劃與 LLM-Wiki 知識庫構建期`
> - **開發狀態**：⚠️ **【凍結程式碼開發】**（現階段專注於商業模式、架構論證與日誌推演，尚未進入應用開發階段）
> - **Git 狀態**：Monorepo 初始化完畢，分支 `main`，第一筆創世 Commit `62e6c3c` 已固化
> - **最新演進**：請查閱 [`llm-wiki/logs/changelog.md`](llm-wiki/logs/changelog.md)
> - **AI 協作守則**：請先閱讀 [`AGENT.md`](AGENT.md) 與 [`llm-wiki/wiki/00_INDEX.md`](llm-wiki/wiki/00_INDEX.md)

---

## 專案目錄結構概覽

本專案採用 **「LLM 知識驅動（Karpathy LLM-Wiki）」** 與 **「Web-First 多平台架構」** 雙軸心佈局：

```text
fitmon/
├── llm-wiki/                    # [核心] Karpathy 規範之 LLM 專用知識庫
│   ├── raw/                     # 原始資料層（商業計畫、PRD、研討、會議記錄）
│   ├── wiki/                    # 提煉知識庫（主題化、高度交叉連結的 Markdown）
│   ├── logs/                    # 演進日誌（記敘每次思考推演、變更與脈絡 trace）
│   ├── adr/                     # 架構決策記錄 (Architecture Decision Records)
│   └── ops/                     # LLM Wiki 維護規範與 Prompt 手冊
│
├── apps/                        # 應用程式實作層
│   ├── web-demo/                # Milestone 1: 網頁互動確認版 (Vite + React + Tailwind)
│   └── mobile/                  # Milestone 2-3: 原生 APP 封裝層 (Capacitor iOS & Android)
│
├── packages/                    # 共享核心套件
│   └── engine/                  # 遊戲數值計算、動作加權公式、疲勞衰減純 TypeScript 邏輯
│
└── supabase/                    # 雲端無個資（Zero-PII）資料庫設定與 Migrations
    └── migrations/              # Supabase 匿名使用者、公開榜單與分享捲軸 SQL
```

---

## 快速導覽

1. **產品與架構知識庫**：請查閱 [`llm-wiki/wiki/00_INDEX.md`](llm-wiki/wiki/00_INDEX.md)
2. **LLM 協作與維護規範**：請查閱 [`llm-wiki/ops/wiki_protocol.md`](llm-wiki/ops/wiki_protocol.md)
3. **歷史演進與推演脈絡**：請查閱 [`llm-wiki/logs/changelog.md`](llm-wiki/logs/changelog.md)
4. **技術選型決策記錄 (ADR-0001)**：請查閱 [`llm-wiki/adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md`](llm-wiki/adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md)
5. **資安防護與 Pre-commit 設定**：請查閱 [`docs/security/pre-commit.md`](docs/security/pre-commit.md)
