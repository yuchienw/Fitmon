# FitMon 系統演進日誌 (Evolution Traces & Changelog)

> **規則**：本檔案為 **只追加不覆蓋 (Append-only)**。每一次架構演進、功能提案、數值平衡調整，皆須詳細記錄其背景、推演脈絡、影響評估與決策原因。

---

## [2026-11-01] 創世初始化：LLM Wiki 體系確立與 Web-First 架構定案

### 1. 原始事件 (Trigger)
- **輸入來源**：接收首份系統規格與商業模型草案（收錄至 [`raw/20261101_fitmon_prd_original.html`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/raw/20261101_fitmon_prd_original.html)）。
- **使用者需求**：
  1. 建立獨立之 Karpathy-style LLM Wiki 目錄體系，作為後續所有產品演進、推演與執行的唯一真相來源 (Single Source of Truth)。
  2. 開發前先完成可供驗證的網頁 Demo 版，待產品驗證成型後能直接無縫轉為 Android 與 iOS 雙原生 App。
  3. 保障日後每一步產品演進均能從日誌中推敲出歷史脈絡。

### 2. 核心架構推演與知識提煉 (Deduction & Synthesis)
1. **隱私與安全推演**：
   - 傳統健身 App 常強制搜集電話與個資，引發資安與個資法疑慮。
   - **推演結論**：確立即時訓練數據 100% 留存於客戶端本地沙盒（Local-First）；雲端 Supabase 僅接收不可逆之 OAuth 匿名 UID 與公開排行，達成 Zero-PII（零可識別個資）。
2. **使用情境推演 (Dual-Mode)**：
   - 健美健力等規律訓練者最厭惡訓練當下出現花俏彈窗與複雜步驟。
   - **推演結論**：拆分為兩套狀態機——「訓練當下專業模式」（極黑、大字盲操、微動態像素陪練）與「練後返家養成模式」（容量轉 Exp、體態演化、商城換裝、迷因產生器）。
3. **數值防刷演算法推演**：
   - 若單純以重量×次數計算經驗值，玩家會偏向用極低重量（如 1kg 啞鈴）狂做 200 組來洗分。
   - **推演結論**：引入動作神經負荷加權（深蹲/硬舉加權 2.0~2.5x；單關節 0.8x），並增加單一部位超過 8 組遞減、12 組經驗歸零之「疲勞與垃圾容量衰減係數」。
4. **Web-to-Mobile 落地技術評估**：
   - 詳細推演了 React + Vite + Capacitor、React Native 與 Flutter 三條路線。
   - 針對 Canvas 迷因壓圖、Vite 快速預覽、代碼 100% 復用至雙端 App 提出 ADR-0001，決定採用 **React + Vite + Tailwind + Capacitor** 路線。

### 3. 本次產出檔案清單
- **規範層**：[`ops/wiki_protocol.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/ops/wiki_protocol.md)
- **導引層**：[`wiki/00_INDEX.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md)
- **提煉知識庫**：
  - [`wiki/product_vision_and_privacy.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/product_vision_and_privacy.md)
  - [`wiki/dual_mode_experience.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/dual_mode_experience.md)
  - [`wiki/game_mechanics_and_science.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/game_mechanics_and_science.md)
  - [`wiki/meme_and_social.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/meme_and_social.md)
  - [`wiki/tech_architecture.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/tech_architecture.md)
  - [`wiki/business_model.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/business_model.md)
  - [`wiki/roadmap.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/roadmap.md)
- **架構決策**：[`adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md)
- **工程專案框架預留**：`apps/web-demo/`、`packages/engine/`、`apps/mobile/`、`supabase/migrations/`。


---

## [2026-11-01] 補強 Agent 協作規範：建立 AGENT.md 與根目錄符號連結

### 1. 觸發原因 (Trigger / Context)
- 使用者提出關鍵反饋：完善的 LLM-Wiki 體系通常應具備頂層的 `AGENT.md`，為 Claude、Gemini、Antigravity 等各類模型提供明確且即時的讀取、檢索、提煉、寫入與禁忌規範。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
- **規範顯性化**：雖然 `ops/wiki_protocol.md` 定義了維護流程，但多數現代 AI 工具（如 Cursor、Claude Code、Gemini CLI 等）會優先主動在根目錄尋找 `AGENT.md` 或 `CLAUDE.md` 作為 System Context。
- **雙重覆蓋策略**：
  1. 於 `llm-wiki/AGENT.md` 建立高權威性的規範手冊，明訂：心智模型、4步讀取順序、4步寫入閉環（Raw Ingest ➔ Distill ➔ ADR ➔ Append Log）、FitMon 5 大不可侵犯領域約束（零個資、本地優先、雙模式隔離、運動科學防刷、道德導購）。
  2. 於專案根目錄建立 `fitmon/AGENT.md` 軟連結，確保任何自根目錄啟動的 Agent 皆能自動掛載該指令守則。

### 3. 影響範圍與異動檔案清單 (Impact & Modified Files)
- 新增：[`llm-wiki/AGENT.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/AGENT.md)
- 新增：[`AGENT.md (根目錄 Symlink)`](file:///Users/yuchien/Project/Github/fitmon/AGENT.md)
- 更新：[`llm-wiki/README.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/README.md)、[`llm-wiki/wiki/00_INDEX.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md)


---

## [2026-11-01] 專案階段定調：確立「Phase 0 - 知識庫構建與前期架構規劃期」

### 1. 觸發原因 (Trigger / Context)
- 使用者明確指示：專案現階段暫不啟動任何前端或 App 程式碼開發，重心完全聚焦於商業計畫、產品知識庫構建、系統架構論證與原始文件提煉。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
- **避免過早編碼 (Avoid Premature Coding)**：
  在商業模型、運動科學公式邊界、防作弊機制與無個資資料流尚未完全推演成熟前，過早進入寫 Code 容易造成無謂的重構浪費。
- **維護知識庫為首要任務**：
  現階段的核心產出為：
  1. 收集並收錄各類商業文件、競品調研、規格草案至 `raw/`。
  2. 透過 LLM 提煉為高密度、互相鏈結的 `wiki/` 主題頁面。
  3. 利用 `adr/` 與 `logs/` 詳實記錄每一次架構與商業推演的決策因果鏈。
  4. 建立健全的 Git 版本控管，確保每份規劃文件均具備歷史追溯性。

### 3. 影響範圍與異動檔案清單 (Impact & Modified Files)
- 專案開發狀態標記：暫停 `apps/web-demo` 開發任務，凍結程式編寫。
- 當前活動目錄收斂至：`llm-wiki/` 與 Git 版本控制。


---

## [2026-11-01] 確立人機長期協作 SOP 與動態狀態看板體系 (TASK-003)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出核心訴求：建立與 AI 長期持續、可維護的溝通機制。無論是待辦事項（To-Do）流轉或問題討論，都必須具備明確 SOP，使 AI 每次開局能迅速掌握時間戳記、專案版本、當前執行階段、看板進度與討論焦點。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
- **痛點根治**：LLM 本身不具備跨對話的長期記憶，若缺乏標準作業程序，每一次開啟新對話都會陷入「上下文失憶、重複交代背景、待辦混亂、討論發散」的循環。
- **四大 SOP 設計**：
  1. **SOP-1 開局握手協議 (Session Handshake)**：AI 每次開局第一段強制輸出「狀態對齊摘要卡」（時間、版本、階段、當前焦點、建議下一步），消除進度斷層。
  2. **SOP-2 問題討論收斂 (Issue Convergence)**：明確邊界約束 ➔ 多方案權衡 ➔ 使用者拍板 ➔ 提煉至 Wiki 與 ADR。
  3. **SOP-3 待辦事項流轉 (Task Lifecycle)**：以 Kanban（進行中、待辦、完成、擱置）驅動任務，每次完成皆對應 Git Commit。
  4. **SOP-4 結尾交接檢查點 (Session Wrap-up)**：總結產出、維護看板時間戳、執行 Git Commit、提示下次開局入口。
- **單一即時狀態真相源 (Single Source of Live Truth)**：
  增設 `PROJECT_STATE.md` 作為即時狀態看板，與高階規格檔案解耦。

### 3. 影響範圍與異動檔案清單 (Impact & Modified Files)
- 新增：[`PROJECT_STATE.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/PROJECT_STATE.md)（即時狀態與 Kanban 待辦系統）
- 新增：[`ops/collaboration_sop.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/ops/collaboration_sop.md)（4 大標準作業程序）
- 更新：[`AGENT.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/AGENT.md)（納入 SOP-1 開局對齊卡強制規則）
- 更新：[`README.md`](file:///Users/yuchien/Project/Github/fitmon/README.md)、[`wiki/00_INDEX.md`](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md)
