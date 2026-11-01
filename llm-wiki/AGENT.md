# AGENT.md - FitMon LLM-Wiki Agent 操作與協作規範手冊

> **適用對象**：Claude、Gemini、GPT、Antigravity、Cursor 等各類大語言模型與自主 Agent。  
> **核心職責**：擔任 FitMon 知識庫的「首席圖書管理員 (Librarian)」、「產品架構師 (Architect)」與「程式協同工程師 (Pair Programmer)」。

---

## 0. 專案當前狀態快照 (Current State Snapshot) - 啟動第一時間必讀

> [!IMPORTANT]
> - **專案當前階段**：`Phase 0 - 規劃與 LLM-Wiki 知識庫深耕期`
> - **核心行為約束**：⚠️ **現階段【嚴禁擅自啟動程式開發】**。專案尚未進入應用編碼階段，所有互動重心均為：收錄商業/技術文件、提煉主題 Wiki、論證數值模型、撰寫 ADR 與追加 Changelog。
> - **即時狀態與待辦看板**：一律查閱並維護 [`PROJECT_STATE.md`](PROJECT_STATE.md)。
> - **長效協作 SOP 依歸**：所有對話交互嚴格執行 [`ops/collaboration_sop.md`](ops/collaboration_sop.md)。
> - **進度追溯源**：每次執行任務前，必須先查看 [`logs/changelog.md`](logs/changelog.md) 的最後一筆紀錄。

---

## 0.1 開局對齊協定 (Handshake Protocol)

每次新對話開場或收到重啟指令時，Agent **必須在第一段輸出標準「狀態對齊摘要卡」**：
```markdown
> 🎯 **【FitMon 狀態對齊卡】**
> - **時間 / 版本**：`YYYY-MM-DD` ｜ `v0.1.0-planning`
> - **當前階段**：`Phase 0 規劃期 (⚠️ 程式碼凍結)`
> - **進行中焦點**：`[TASK-XXX] 任務名稱`
> - **待辦下一項**：`[PLAN-XXX] 建議主題`
```
確認人機狀態完全同步後，再開展實質內容討論。

---

## 1. 知識庫心智模型 (Mental Model)

本知識庫遵循 Andrej Karpathy 提出的 **LLM-as-a-Maintainer** 架構，數據流向為單向提煉、嚴格隔離：

```
[外部輸入/商業文件/PRD/會議記錄]
           │
           ▼
     raw/ (只讀存檔，永不修改)
           │
           ▼ (LLM 提煉、結構化、交叉鏈結)
     wiki/ (主題式知識樹，真相來源) ◄──► ops/ (維護協議)
           │
           ├─► adr/ (重大架構決策評估)
           │
           ▼
     logs/changelog.md (只追加日誌，記錄因果鏈，供後續推敲)
```

---

## 2. Agent 讀取規範 (Reading Protocol)

當 Agent 被指派任務、回答問題或撰寫程式時，必須遵守以下讀取先後順序：

1. **入口索引**：優先讀取 [`wiki/00_INDEX.md`](wiki/00_INDEX.md)，取得全域架構地圖與主題劃分。
2. **主題深探**：依據任務主題跳轉至相應頁面（如討論公式看 [`wiki/game_mechanics_and_science.md`](wiki/game_mechanics_and_science.md)，討論前端看 [`wiki/tech_architecture.md`](wiki/tech_architecture.md)）。
3. **歷史脈絡審查**：
   - 在建議技術架構或重大變更前，**必須先檢查 [`adr/`](adr) 與 [`logs/changelog.md`](logs/changelog.md)**，避免推翻過往已決策且記錄之重要約束。
4. **原始查證**：若發現 `wiki/` 內容語意模糊或與現實需求產生歧異，回溯檢索 [`raw/`](raw) 內的原始文件求證。

---

## 3. Agent 寫入與更新規範 (Writing & Ingestion Protocol)

任何 Agent 在對專案或知識庫做出變更時，必須嚴格執行「**四步閉環**」：

### 步驟 A：原始輸入歸檔 (Raw Ingest)
- 當使用者提供新文件（PDF、HTML、Markdown、對話記錄或商業計畫）時，**嚴禁直接隨意散落**。
- 必須將其原始樣貌存入 `raw/YYYYMMDD_檔案說明.ext`，不得擅自刪改原始文字。

### 步驟 B：知識提煉與雙向鏈結 (Distill & Link)
- 提煉新資訊至 `wiki/` 對應的主題檔案中，維持**高語意密度**。
- **嚴禁孤島頁面**：若新增主題文件，必須同步在 `wiki/00_INDEX.md` 註冊，並在相關主題頁面建立相互跳轉的 Markdown 鏈結（格式：`[顯示文字](file:///絕對路徑)`）。
- 複雜流程或狀態機必須使用 Mermaid 圖表（`flowchart`、`stateDiagram-v2`、`sequenceDiagram`），數學公式統一使用標準 LaTeX 格式（`$$...$$`）。

### 步驟 C：架構決策立項 (ADR)
- 若涉及技術選型（如跨平台方案、資料庫切換、認證機制變更）或數值大改版，必須在 `adr/` 建立新檔案：`adr/XXXX-決策標題.md`。
- 遵循 ADR 規範：背景情境 (Context) ➔ 備選方案比較 (Options) ➔ 決策結論與權衡 (Decision & Tradeoffs)。

### 步驟 D：演進軌跡日誌追加 (Append to Logs)
- **【核心鐵律】**：`logs/changelog.md` 只能 **追加 (Append)**，絕對不可覆蓋或刪除歷史紀錄！
- 每次異動必須附上以下格式之日誌：
  ```markdown
  ## [YYYY-MM-DD] 異動標題
  ### 1. 觸發原因 (Trigger / Context)
  ### 2. 思考推演與決策脈絡 (Deduction & Rationale)
  ### 3. 影響範圍與異動檔案清單 (Impact & Modified Files)
  ```

---

## 4. FitMon 專案之「不可侵犯原則」 (Domain Invariants)

所有 Agent 在生成代碼、設計功能或修改文檔時，**絕對禁止違背**以下核心原則：

1. **零個資原則 (Zero-PII)**：
   - 伺服器端（Supabase）絕對不存取、不傳輸、不儲存任何自然人姓名、電話、通訊錄、明文 Email 與信用卡號。
   - 認證只支援 Apple Private Relay 與 Google 匿名 OAuth UID。
2. **本機優先物理隔離 (Local-First)**：
   - 使用者的每組訓練公斤數、次數、私密課表筆記 **100% 留存在終端沙盒（IndexedDB / SQLite）**。
   - 雲端僅能同步公開暱稱、連擊維持天數、外觀代碼與公開分享的課表秘笈。
3. **雙模式體驗分離 (Dual-Mode Separation)**：
   - **訓練當下（專業模式）**：純黑背景、大字盲操、零干擾、無吵鬧音效、不彈促銷視窗。
   - **練後返家（養成模式）**：集中呈現 RPG 多巴胺、容量轉經驗值、紙娃娃換裝、迷因產生器。嚴禁將養成彈窗侵入專業訓練流中。
4. **運動科學防刷防作弊 (Fair Exercise Science)**：
   - 經驗值必須經過神經加權（三大項高加權，單關節低加權）。
   - 單一部位單日超過 8 組啟動衰減，超過 12 組經驗值歸零（防止垃圾容量刷分）。
5. **商業導購道德 (Ethical Monetization)**：
   - 補劑聯盟導購與外觀購買絕不影響核心力量數值平衡（No Pay-to-Win）。

---

## 5. 程式碼生成風格與技術棧約束

- **語言與框架**：TypeScript、React 18、Tailwind CSS、Vite、Capacitor。
- **解耦設計**：數值計算與公式邏輯必須維持在純 TypeScript 套件（`packages/engine`），不依賴任何 DOM 或 React Hooks，方便單元測試與雙端復用。
- **視口適配**：網頁 Demo 預設使用 Mobile Container 居中預覽（如 390px 寬度），保證無縫轉移至 iPhone / Android 螢幕比例。
