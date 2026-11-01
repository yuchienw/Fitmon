# Karpathy-Style LLM Wiki 運作協議與維護手冊 (Wiki Protocol)

> **核心理念**：以 LLM 為主要讀寫者與知識提煉者。將混沌的原始多模態資料（Raw Sources），提煉為高資訊密度、主題化、交叉鏈結的結構化知識（Synthesized Wiki），並透過可追溯的追加式日誌（Append-only Logs & ADR），使任何未來的開發者與 AI 都能精確推敲出每一步演進脈絡。

---

## 1. 目錄職責定義

| 目錄 | 名稱 | 角色與規則 |
|---|---|---|
| `raw/` | 原始資料層 (Ingestion Sink) | **只讀不可更動**。存放最原始的商業文件、PRD、用戶訪談錄音摘要、技術白皮書、競品截圖等。命名規則：`YYYYMMDD_主題_來源.ext`。 |
| `wiki/` | 結構化知識庫 (Knowledge Graph) | **高度提煉與跨頁連結**。由 LLM 將 `raw/` 的資料去蕪存菁，依主題分類組織成 Markdown。嚴禁孤島頁面，彼此必須具備超連結。 |
| `logs/` | 演進與脈絡日誌 (Evolution Traces) | **只追加不覆蓋 (Append-only)**。記錄每次討論、決策與重構的思考推演，確保產品演進過程完全透明、可推敲。 |
| `adr/` | 架構決策記錄 (Architecture Decisions) | 採用經典 ADR 格式（狀態、背景、決策選項、正反權衡、結論）。任何重大技術與架構選擇皆需立項。 |
| `ops/` | 協議與指引 (Operational Rules) | LLM 維護知識庫的作業規範與 Prompt 範本。 |

---

## 2. LLM 維護知識庫三部曲 (Three-Step Lifecycle)

### 步驟一：原始資料收錄 (Raw Ingestion)
1. 將外部傳入的文件放入 `raw/`，不修改原始字句。
2. 在 `logs/changelog.md` 標註新資料的來源、時間與摘要。

### 步驟二：知識提煉與頁面更新 (Synthesize & Cross-link)
1. 評估資料是否對既有概念產生「增補」、「修正」或「衝突」：
   - 若為新增領域：建立新主題 Markdown，並更新 [`wiki/00_INDEX.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md)。
   - 若為細節調整：編輯對應的主題頁面，保留權威性定義。
2. 保持**語意高密度**與**Markdown 互相連結**（使用標準 `[標題](file://...)` 語法）。

### 步驟三：日誌記敘與決策固化 (Log Traces & ADR)
1. 若涉及技術架構或重大產品路線轉折，撰寫獨立 ADR 於 `adr/XXXX-title.md`。
2. 在 `logs/changelog.md` 寫入具體的「推演因果鏈（Why & How）」：
   - 為什麼做出此調整？
   - 考量了哪些替代方案？
   - 對既有模組產生的影響範圍？
