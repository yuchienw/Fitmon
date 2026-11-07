# FitMon 系統演進日誌 (Evolution Traces & Changelog)

> **規則**：本檔案為 **只追加不覆蓋 (Append-only)**。每一次架構演進、功能提案、數值平衡調整，皆須詳細記錄其背景、推演脈絡、影響評估與決策原因。

---

## [2026-11-01] 創世初始化：LLM Wiki 體系確立與 Web-First 架構定案

### 1. 原始事件 (Trigger)
- **輸入來源**：接收首份系統規格與商業模型草案（收錄至 [`raw/20261101_fitmon_prd_original.html`](../raw/20261101_fitmon_prd_original.html)）。
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
- **規範層**：[`ops/wiki_protocol.md`](../ops/wiki_protocol.md)
- **導引層**：[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)
- **提煉知識庫**：
  - [`wiki/product_vision_and_privacy.md`](../wiki/product_vision_and_privacy.md)
  - [`wiki/dual_mode_experience.md`](../wiki/dual_mode_experience.md)
  - [`wiki/game_mechanics_and_science.md`](../wiki/game_mechanics_and_science.md)
  - [`wiki/meme_and_social.md`](../wiki/meme_and_social.md)
  - [`wiki/tech_architecture.md`](../wiki/tech_architecture.md)
  - [`wiki/business_model.md`](../wiki/business_model.md)
  - [`wiki/roadmap.md`](../wiki/roadmap.md)
- **架構決策**：[`adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md`](../adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md)
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
- 新增：[`llm-wiki/AGENT.md`](../AGENT.md)
- 新增：[`AGENT.md (根目錄 Symlink)`](../../AGENT.md)
- 更新：[`llm-wiki/README.md`](../README.md)、[`llm-wiki/wiki/00_INDEX.md`](../wiki/00_INDEX.md)


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
- 新增：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（即時狀態與 Kanban 待辦系統）
- 新增：[`ops/collaboration_sop.md`](../ops/collaboration_sop.md)（4 大標準作業程序）
- 更新：[`AGENT.md`](../AGENT.md)（納入 SOP-1 開局對齊卡強制規則）
- 更新：[`README.md`](../../README.md)、[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)


---

## [2026-11-01] Grill-me 深度對齊：大方向戰略重構、任務金幣社群與遊戲引擎質感技術定調 (TASK-004)

### 1. 觸發原因 (Trigger / Context)
- 使用者啟動 `/grill-me` 互動訪談，對 FitMon 的宏觀定位、玩法機制、社交循環與技術選型進行全方位推演與重構。
- 使用者表明自身為「Web 全端工程師背景，對做手機 App 沒概念」，希望以「打造好玩好用、可執行性高」為核心，依靠朋友圈口碑自然擴散，並強調「看起來要像遊戲引擎設計，而非純 Web UI 畫面；小規模測試完成後能 100% 直接轉 iOS / Android 原生 App」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **客群泛化 (General Fitness Persona)**：
   - 跳脫純健美/健力重訓的小眾局限，擴展至徒手自重、跑步、CrossFit、瑜伽等「泛運動愛好者」，擴大朋友圈傳播半徑。
2. **激勵機制轉型 (Mission & Streak vs RPG Stat Grinding)**：
   - 捨棄繁瑣的 RPG 打怪升級與數值衰減計算，轉為「三層任務體系」（每日日常任務 + 連續運動 Streak 加成 + 長期成就里程碑）與「金幣 (Coins) 經濟」。
3. **金幣消費與社交閉環 (Coin Sinks & Social Plaza)**：
   - 暫緩複雜的外部品牌導購 BD，專注內部娛樂感與好友互動。
   - 金幣用於解鎖 2D 像素紙娃娃裝扮、好友圈動態打賞、贈送虛擬能量水/應援道具。
   - 社交體系採用「好友圈動態 (Friend Feed) + 全站運動廣場 (Public Community) + 達人榜」。
4. **發文與成果卡片 (Visual Quest Card & Meme Generator)**：
   - 發文以自訂像素人物 + 運動成果圖卡為主體，可額外附現場隨拍照與自嘲短文，並內建 Meme 梗圖排版工坊。
5. **註冊漸進式無感體驗 (Progressive Onboarding)**：
   - 首次開啟極速免註冊試玩，觸發發布廣場/加好友/打賞等網路社交動作時引導一鍵綁定 Apple / Google / Email。
6. **技術架構：遊戲畫布 + 跨端容器 (React + PixiJS + Capacitor)**：
   - 視覺採用 **PixiJS 2D 像素遊戲渲染畫布**，打造純正遊戲引擎質感（HUD、9-slice 邊框、精靈動畫、8-bit 音效、金幣粒子）。
   - 平台分發採用 **Web-First PWA ➔ Capacitor 封裝**，朋友點擊連結秒開試玩；驗證完成後由 AI 協助處理 Safe-Area、Haptics 與 Xcode/Android Studio 封裝，使用者完全無需學習 Swift/Kotlin。

### 3. 影響範圍與產出檔案清單 (Impact & Modified Files)
- 產出戰略對齊書：[`alignment_fitmon_v2_strategy.md`](file:///Users/yuchien/.gemini/antigravity-cli/brain/fe928b95-a5d1-439f-8ae3-9b7bc574f420/alignment_fitmon_v2_strategy.md)
- 更新狀態看板：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（版本演進至 `v0.2.0-pivot-aligned`，調整 Backlog 任務池）
- 歷史日誌追加：[`logs/changelog.md`](changelog.md)


---

## [2026-11-01] 知識庫全面同頻：GDD 雙軌紙娃娃、PixiJS 渲染、Meme 工坊與宣傳浮水印全面回寫 (TASK-006)

### 1. 觸發原因 (Trigger / Context)
- 使用者要求確認：所有近期規劃與拍板定案之架構，是否已全數同步更新至產品知識庫（`llm-wiki/wiki/`），確保 Single Source of Truth 絕對有效。

### 2. 核心成果與架構回寫 (Synthesis & Alignment)
1. **`wiki/00_INDEX.md`**：全面改寫 7 大主題摘要，指向全新遊戲化、任務制與雙軌紙娃娃系統。
2. **`wiki/product_vision_and_privacy.md`**：正式更新客群為「泛運動愛好者」，並納入「免註冊試玩 ➔ 漸進式無感綁定」機制。
3. **`wiki/dual_mode_experience.md`**：升級為「雙軌紙娃娃系統」，定義 32x32 角色 5 層精靈規格與房間 6 大家具卡槽規格。
4. **`wiki/game_mechanics_and_science.md`**：確立三層階梯任務體系（日常、Streak 暴擊、里程碑）、百位數金幣體系與數值配置化 (Config-Driven) 原則。
5. **`wiki/meme_and_social.md`**：確立拍立得社群布告欄、Meme 拍貼工坊、三合一底圖、以及非遮蔽式宣傳 APP Logo 浮水印規範。
6. **`wiki/tech_architecture.md`**：確立即時 2D 像素遊戲引擎架構（React + PixiJS 180x320 虛擬低解析度 + NEAREST 無損放大）、小人自主遊蕩 AI 與 Supabase 遊戲驅動資料庫。
7. **`wiki/business_model.md`**：確立精益創業節奏，MVP 階段專注好玩度、內部金幣閉環與朋友圈口碑裂變，暫緩外部複雜商業談判。
8. **`wiki/roadmap.md`**：重構三大里程碑檢核標準，聚焦於「具有遊戲引擎質感的 Web Demo MVP」。

### 3. 異動檔案清單 (Impact & Modified Files)
- 全面更新：[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)、[`wiki/product_vision_and_privacy.md`](../wiki/product_vision_and_privacy.md)、[`wiki/dual_mode_experience.md`](../wiki/dual_mode_experience.md)、[`wiki/game_mechanics_and_science.md`](../wiki/game_mechanics_and_science.md)、[`wiki/meme_and_social.md`](../wiki/meme_and_social.md)、[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)、[`wiki/business_model.md`](../wiki/business_model.md)、[`wiki/roadmap.md`](../wiki/roadmap.md)


---

## [2026-11-01] 確立 Zero-PII 內容安全防火牆與 18 大系統模組終極閉環 (TASK-007)

### 1. 觸發原因 (Trigger / Context)
- 使用者深入反思資安、個資保護與 UGC 內容審查風險（廣告/色情/裸露/暴力）：提出「是否乾脆不要在站內儲存個人真實照片？站內一律以純像素遊戲畫面為主，分享到外部 IG/Threads 時才在前端本地合成生活照？」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **Zero-PII 內容安全防火牆 (Content Firewall)**：
   - **站內純像素零風控**：站內動態廣場與好友圈**嚴禁上傳真人照片至雲端**。貼文一律為純像素視覺（32x32 小人 + 數據 + 房間裝潢）。徹底杜絕色情裸露風險，省下高額第三方 AI 審核 API，伺服器頻寬與容量消耗趨近於 0，資料庫遭受脫庫也絕無人臉個資。
   - **站外本地無痕合成**：Meme 拍貼工坊在手機前端記憶體載入生活隨拍照，合成像素小人貼紙後，一鍵直發 IG 限動/Threads，照片 100% 留在前端，絕不上傳至 Supabase 伺服器，由 Meta 自行負責圖片審查。
2. **擴充並終極收斂 18 大系統模組**：
   - 補齊「課表模板庫與大神秘笈複製」以及「每週分化行事曆」。
   - 補齊「個人最佳紀錄 (1RM PR) 追蹤與獎盃館」。
   - 補齊「排程休息日免打卡保護」與「連擊冰凍卡 (Streak Freeze)」杜絕挫折棄坑。
   - 補齊「智能單次溫和習慣提醒」與「Local-First 離線優先同步」。
   - 補齊「發文公開/僅好友隱私開關」與「UGC 檢舉/封鎖機制」（100% 符合 App Store 審查）。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`supabase/migrations/20261101_init_fitmon_game_schema.sql`](../../supabase/migrations/20261101_init_fitmon_game_schema.sql)（移除 `posts.photo_url`，新增 `routine_templates` 與 `user_workout_schedules`）
- 更新：[`wiki/product_vision_and_privacy.md`](../wiki/product_vision_and_privacy.md)、[`wiki/dual_mode_experience.md`](../wiki/dual_mode_experience.md)、[`wiki/game_mechanics_and_science.md`](../wiki/game_mechanics_and_science.md)、[`wiki/meme_and_social.md`](../wiki/meme_and_social.md)、[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v1.3.0-firewall-aligned`）


---

## [2026-11-01] 納入 free-exercise-db 開源動作庫、雙軌圖解與科普問答 (TASK-008)

### 1. 觸發原因 (Trigger / Context)
- 使用者要求評估：運動科學上 APP 是否應提供客觀、有效且無爭議之運動與飲食知識？是否有現成、可商用、包含器材動作圖解的資料庫？

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **開源商用動作庫選型**：
   - 選定 `yuhonas/free-exercise-db`（採用 Public Domain / The Unlicense，100% 允許無限制商業使用、修改與重新分發）。
   - 包含 800+ 動作詳細步驟說明、主次動肌群、器材類別與運動學標籤。
2. **雙軌圖解架構 (Dual-Track Visuals)**：
   - 動作庫預設提供解剖真人示範圖解；遊戲主場景則以 32x32 像素小人示範搞笑/標準動作，達到專業與像素復古趣味的完美平衡。
3. **玩中學：每日 3 秒科普問答 (FitMon Trivia)**：
   - 每日派發 1 題無爭議之科普小知識（熱量赤字、漸進式超負荷、蛋白質攝取基準、水份代謝）。
   - 答對獲取 20 金幣，新手在玩遊戲同時無形學到正確避坑與防受傷知識。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`wiki/game_mechanics_and_science.md`](../wiki/game_mechanics_and_science.md)
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v1.4.0-science-db-aligned`）


---

## [2026-11-01] 確立本機健康沙盒 (Local Biometrics Sandbox) 與雲端唯一防作弊職責 (TASK-009)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出核心數據治理與個人隱私邊界要求：
  - APP 應能自我紀錄與審視過往狀態曲線圖表（年齡、身高、體重、體脂、飲水量、睡眠、飲食、BMI、基礎代謝 BMR、TDEE、訓練總容量與運動紀錄等）。
  - 可串接 iOS 健康 (HealthKit) 或 Android Google 健康 (Health Connect) 等系統服務。
  - **極致隱私邊界**：上述各項數據屬於極度敏感之私密個資範圍，**一律嚴禁上雲端，絕不對外公開，100% 僅保留於本機 (IndexedDB / SQLite)**。
  - **雲端唯一職責**：雲端唯一保管並驗證的只有「社交打卡紀錄、購買道具、以及金幣錢包」，以防止本機作弊刷錢，其餘生理私密數據在雲端完全「零儲存、零知曉」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **數據分流架構 (Data Bifurcation Architecture)**：
   - **本機沙盒 (Client-Side Local Sandbox)**：
     - 儲存引擎：瀏覽器端使用 IndexedDB (搭配 `idb-keyval` 或 `Dexie.js`)，原生 App 端透過 Capacitor 直接操作本機 SQLite / Keychain。
     - 涵蓋範圍：年齡、身高、體重、體脂率、水分、睡眠時長、飲食紀錄、BMI 計算、BMR (Mifflin-St Jeor 公式)、動態 TDEE (依每週訓練頻率動態建議熱量赤字/盈餘)、過往 7/30/90 天趨勢折線圖。
     - 雙端健康串接：透過 `@capawesome-team/capacitor-health` 授權後一鍵抓取體重、步數與睡眠，無痛寫入本機沙盒，絕不上傳伺服器。
   - **雲端權威 (Server-Authoritative Ledger)**：
     - 雲端資料庫（Supabase）：僅保留不可作弊的經濟資產——金幣餘額 (Wallet)、解鎖裝飾 (Inventory)、純像素社群動態 (Pixel Posts)、打賞紀錄 (Tips/Gifts) 與連擊天數 (Streak)。
     - 即使伺服器被徹底入侵脫庫，駭客完全無法獲取任何自然人的體重、生理特徵或生活隱私，符合全球最高標準之 GDPR / CCPA 零個資設計。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)
- 更新：[`wiki/product_vision_and_privacy.md`](../wiki/product_vision_and_privacy.md)
- 更新：[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v1.5.0-biometrics-sandbox-aligned`）


---

## [2026-11-01] 確立產品行為遙測與漏斗分析模組：Facade 抽象架構與零個資埋點原則 (TASK-010)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出數據分析需求：「是否需要類似 GA 分析模組，從後台搜集使用者的使用紀錄，以利未來做數據分析？」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **分析必要性評估**：
   - 產品需要數據驅動迭代，缺乏埋點將無法洞察 D1/D7/D30 留存率、關鍵漏斗轉化（首頁 ➔ 運動打卡 ➔ 迷因合成 ➔ 分享至 IG）、最受歡迎虛擬裝飾與迷因模板熱度。
2. **個資防禦與邊界劃分 (Zero-PII Telemetry Guardrail)**：
   - 行為遙測嚴格限制在**「匿名操作事件 (Anonymous Action Events)」**。
   - 身高、體重、體脂、睡眠、飲食等生理私密數據**嚴禁作為 Event Properties 上報**，100% 留在本機沙盒中。
3. **技術架構與工具選型 (Facade Pattern)**：
   - 前端採用外觀模式（Facade Pattern）建立統一的 `analytics.ts` 介面，業務代碼透過 `analytics.track()` 觸發。
   - 推薦底層介接 **PostHog**（開源、強大留存與漏斗圖表、100 萬/月免費事件、支援 Web 與 Capacitor），並可無縫切換至 GA4 或內部儲存庫。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)（增訂第 6 節「產品行為遙測與漏斗分析模組」）
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板升級至 `v1.6.0-analytics-facade-aligned`）


---

## [2026-11-01] 確立批判性思維與非迎合溝通原則，全面回歸 Phase 0 深度規劃 (TASK-011)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出核心溝通與協作原則：「這個專案我希望你未來再跟我討論計劃的時候，都要能提出可能的風險與缺點，不要一昧的認同，也不要刻意反駁，適當的提出有效建議與評估。我還在規劃階段，先不要進入寫程式」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **確立「非迎合架構師 (Non-Sycophantic Partner)」心智模型**：
   - 杜絕廉價讚美與一昧認同，避免產品因「倖存者偏差」或「盲目自嗨」而忽視真實的用戶流失與工程複雜度。
   - 杜絕刻意唱反調與槓精發言，所有質疑必須有理有據，並伴隨建設性替代方案。
2. **客觀評估三段式標準 (Three-Dimensional Critical Assessment)**：
   - 🌟 **亮點與核心價值 (Pros)**
   - ⚠️ **潛在風險、缺點與摩擦成本 (Cons & Risks)**
   - 💡 **建設性緩解與折衷建議 (Actionable Mitigations)**
3. **專案狀態校準**：
   - 立即清空暫存的前端工程腳手架，工作區回歸乾淨狀態。
   - 專案階段重設為 **Phase 0 產品規劃與深度論證期**，全面凍結代碼開發，專注於方案推演、邊界情境分析與風險拆解。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`AGENT.md`](../AGENT.md)（增訂第 0.2 節「批判性思維與非迎合溝通原則」）
- 更新：[`ops/collaboration_sop.md`](../ops/collaboration_sop.md)（SOP-2 四階收斂法強化批判性評估階段）
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（回歸 Phase 0，凍結開發，版本升級至 `v1.7.0-critical-thinking-aligned`）


---

## [2026-11-01] 品牌名稱動態解耦 (Brand Decoupling) 與多國語系 (i18n: en / zh-TW) 架構定案 (TASK-012)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出核心品牌與國際化需求：「產品 APP 名稱目前待定，不一定是叫做 FitMon；另外要能支援多國語系，目前至少要能支援英文、繁體中文」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **批判性風險評估 (Critical Risk Assessment)**：
   - **字體檔案與缺字風險**：繁中點陣像素字型若字集不全會出現豆腐塊或破版。
   - **低解析度畫布排版爆炸**：英文詞彙長度約為中文之 2~3 倍，固定 px 按鈕在 180×320 畫布上會嚴重溢出邊界。
   - **動作庫翻譯成本**：`free-exercise-db` 800+ 動作全英文，生硬機翻會出現「槓鈴死舉」等嚴重不符合運動科學的笑柄。
   - **迷因在地文化隔閡**：中文健身自嘲梗與歐美文化差異大，直翻失去幽默感。
2. **建設性落地方案 (Actionable Mitigations)**：
   - **品牌動態解耦**：保留「FitMon」作為內部工程代號，對外顯示由全域設定與 `i18n` 動態注入，浮水印、標題、通知 100% 抽離硬編碼。
   - **雙語系引擎 (i18n)**：首發支援英文（預設/Fallback）與繁體中文（台灣/港澳）。
   - **開源繁中像素字型**：選用 `Fusion Pixel Font` (融合像素體) 或 `Cubic 11` (俐方體 11 號)，100% 覆蓋繁中教育部常用字與 ASCII 英數，12px 乾淨顆粒不破圖。
   - **動作庫分級翻譯 (Tiered Translation)**：Tier 1 前 60 大核心動作人工專業審定繁中術語；Tier 2 冷門動作保留英文原名搭配中文部位標籤。
   - **迷因梗圖庫語系標籤分流**：依 `locales` 標籤分流歐美與華語在地迷因。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)
- 更新：[`wiki/product_vision_and_privacy.md`](../wiki/product_vision_and_privacy.md)
- 更新：[`wiki/meme_and_social.md`](../wiki/meme_and_social.md)
- 更新：[`wiki/game_mechanics_and_science.md`](../wiki/game_mechanics_and_science.md)
- 更新：[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)（增訂第 7 節「多國語系 (i18n)、品牌解耦與像素字型架構」）
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v1.8.0-i18n-brand-decoupled`）


---

## [2026-11-01] 重大架構轉向：從全螢幕遊戲引擎轉向「現代 App 外殼 ＋ 局部嵌入像素畫布」 (TASK-013 / ADR-0002)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出重大架構轉向：「我想改變一個重大決策，應該不是完全使用遊戲引擎製作，我覺得比較像是 web 的操作放入手機 app 中，通常好像都是下方固定會有幾個導覽按鈕，然後跳轉頁也是 loading 就出現，頂多上方導覽列在多個回上一頁的按鈕。是這樣嗎？」。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **批判性評估三段式 (Critical Evaluation)**：
   - 🌟 **核心效益**：
     - **符合全球用戶心智模型**：主流習慣養成 App（Duolingo、Strava、Forest）皆採用標準 App 外殼，大眾對底部 Tab 與頂部 Header 的操作極具熟悉感。
     - **全端工程師人體工學**：90% 的介面回歸 Web DOM (React + Tailwind)，表單輸入、中文文字處理、長列表平滑滾動無需在 Canvas 內手刻，開發速度提升 3~5 倍。
     - **極致省電無發燙**：非遊戲頁面 GPU 佔用歸零，首頁局部畫布切換至其他 Tab 時自動休眠。
   - ⚠️ **潛在風險與摩擦防禦**：
     - **防禦劣質套殼網頁感 (Cheap Web-view)**：嚴禁整頁跳轉重新 Loading，底部 4 大 Tab 必須採用 SPA 毫秒級無感切換，僅非同步載入遠端數據時使用局部骨架屏 (Skeleton)。
     - **防禦狀態重置 (State Loss)**：打卡秒表與填寫進度提升至全域 Zustand 狀態機，跨 Tab 切換計時不中斷。
     - **防禦風格割裂**：統一採用 Neo-Retro（現代極簡復古風），深黑底色搭配精緻點陣圖標。
2. **決策固化 (ADR-0002)**：
   - 正式通過並撰寫 [`ADR-0002`](../adr/0002-app-shell-with-embedded-pixel-canvas.md)。
   - 底部固定 4 大 Tab（Home 訓練室、Workout 運動打卡、Plaza 廣場、Analytics 數據）。
   - PixiJS 畫布縮小為「Tab 1 訓練室」中的嵌入式互動卡片元件 (Embedded Pixel Canvas Widget)。

### 3. 異動檔案清單 (Impact & Modified Files)
- 新增：[`adr/0002-app-shell-with-embedded-pixel-canvas.md`](../adr/0002-app-shell-with-embedded-pixel-canvas.md)
- 更新：[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)（全面更新第 1 節與第 2 節之 App 外殼與生命週期）
- 更新：[`wiki/dual_mode_experience.md`](../wiki/dual_mode_experience.md)（雙模式分流至 Tab 1 與 Tab 2）
- 更新：[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v1.9.0-app-shell-aligned`）


---

## [2026-11-01] 確立 5 大 Tab 導覽、名人認證特展、體力值防刷與消耗型道具 IAP 商業變現模型 (TASK-014)

### 1. 觸發原因 (Trigger / Context)
- 使用者提出一系列核心產品導向與商業變現決策：
  1. 底部導覽列應涵蓋獨立的「🛒 商城 (Shop)」分頁，系統設定則配置於頂部 Header 右上角 `[⚙️]`。
  2. 產品核心 DNA 定調為「**專業運動打卡 × 復古像素雙軌紙娃娃 × 朋友圈病毒社群**」（非封閉 RPG 遊戲）。
  3. 規劃大眾現象級產品願景：數位替身、Threads/IG 迷因擴散、冷啟動傳奇種子房間、官方認證運動員/名人特展與一鍵課表複製。
  4. 確立核心數值與變現規則：**「裝備物件純外觀不影響數值，消耗道具影響數值與收益」**；引入體力值 (Stamina) 扣除機制防止洗幣，並以消耗道具提升獎勵倍率或恢復體力，作為 IAP 內購的主要收入來源。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **批判性評估三段式 (Critical Evaluation)**：
   - 🌟 **核心效益**：
     - **確立真金白銀的現金流飛輪**：消耗型道具（體力水、倍率卡、保命卡）具備高頻復購特性，大幅突破純外觀 2%~4% 的低付費率瓶頸。
     - **名人自發傳播與 B2B2C 贊助**：專屬 32×32 形象刺激名人主動發限動引流；O2O 實體折扣券讓品牌贊助閉環成型。
     - **防刷幣天花板**：每日 100 點體力值自然恢復，形成健康的每日產幣上限。
   - ⚠️ **潛在風險與防禦金律**：
     - **【防運動懲罰感金律】運動記錄永遠 100% 免費無限次**：體力耗盡時，運動記錄、組數、重量、秒表與 PR 100% 永久免費記錄，維護專業運動日誌尊嚴；體力僅卡住「金幣掉落」，徹底杜絕「沒體力就不給運動」的公關災難。
     - **純外觀守則**：聯名裝備嚴禁附加任何數值加成，維護社群公平性。
2. **架構升級 (ADR-0002 延伸)**：
   - 底部導覽定案為 5 大核心 Tab：`[🏠 訓練室]` `[🏋️ 運動]` `[🛒 商城]` `[🌐 廣場]` `[📊 數據]`。
   - 系統設定收納於頂部常駐 Header 右上角 `[⚙️]`。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`adr/0002-app-shell-with-embedded-pixel-canvas.md`](../adr/0002-app-shell-with-embedded-pixel-canvas.md)（升級為 5 大 Tab）
- 更新：[`wiki/tech_architecture.md`](../wiki/tech_architecture.md)（5 Tab 架構圖與組件劃分）
- 更新：[`wiki/business_model.md`](../wiki/business_model.md)（增訂第 3 節 IAP 體力與消耗道具、第 4 節 名人認證與聯名贊助）
- 更新：[`wiki/game_mechanics_and_science.md`](../wiki/game_mechanics_and_science.md)（增訂第 9 節 體力值防刷與道具數值）
- 更新：[`wiki/meme_and_social.md`](../wiki/meme_and_social.md)（增訂第 5 節 名人特展、種子房間與一鍵課表複製）
- 更新：[`wiki/product_vision_and_privacy.md`](../wiki/product_vision_and_privacy.md)（定調核心 DNA）
- 更新：[`wiki/00_INDEX.md`](../wiki/00_INDEX.md)
- 更新：[`supabase/migrations/20261101_init_fitmon_game_schema.sql`](../../supabase/migrations/20261101_init_fitmon_game_schema.sql)（擴充 stamina, verification, consumables, event fields）
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v2.0.0-f2p-stamina-celebrity-aligned`）


---

## [2026-11-01] 完成 Web Demo MVP 系統規格書與完整可玩前端實作 (TASK-015 & TASK-016)

### 1. 觸發原因 (Trigger / Context)
- 使用者批准 `fitmon_web_mvp_system_spec.md` 系統規格書，並下達 `/goal` 指令：「請直接依照規劃完成實際可以用的 mvp，需要擴充的商城物件或是詳細的商品定價、參數都可以待訂，未來透過調整參數或擴充就好」。

### 2. 工程落地與核心交付 (Engineering Deliverables)
1. **參數配置完全解耦 (`config/economyConfig.ts` & `config/catalogConfig.ts`)**：
   - 將初始金幣、體力消耗、任務獎勵、打賞費用、商品定價、動作庫與名人課表全部抽離至獨立設定檔，未來僅需改動常數即可熱調平衡。
2. **現代 5 大 Tab App 外殼 ＋ 局部嵌入 2D 像素畫布 (`ADR-0002` 實踐)**：
   - 頂部常駐 Header（顯示連勝火焰 🔥、體力 ⚡、金幣 🪙 與 `[⚙️]` 系統設定/沙盒測試台）。
   - 首頁 `PixelRoomCanvas`：240×150 虛擬低解析度無損放大，具備 5 層 32×32 角色紙娃娃（4 階段體態演化、髮型、上衣、下褲、手持器材）與房間 6 大裝潢卡槽（牆面、地板、深蹲架、街機/啞鈴塔、獎盃白板、赤柴/黑貓/機器人寵物），切離首頁時自動休眠零耗電。
3. **專業運動打卡 × `@fitmon/engine` 數值結算閉環**：
   - 支援「專業組數計時器（跨 Tab 不中斷 Keep-Alive）」、「推/拉/腿與名人課表一鍵帶入」與「3 秒極速補登」。
   - 實作【防運動懲罰感金律】：體力耗盡時仍 100% 免費無上限記錄組數與 PR，僅暫停金幣掉落。
   - 完成街機風 `VICTORY!` 結算彈窗與零外置音檔依賴之 Web Audio 8-Bit 街機音效合成器 (`SoundManager.ts`)。
4. **商城雙軌試穿、消耗品 IAP 模擬、名人特展與 Meme 拍貼工坊**：
   - 商城頂部提供即時更衣鏡預覽、消耗道具（BCAA 活力水、2X 金幣卡、連勝冰凍卡、幸運扭蛋機）與官方認證名人特展。
   - 社群廣場支援拍立得動態打賞、送能量水、好友/名人房間串門子，以及 HTML5 Canvas 迷因拍貼工坊（支援疊加本機自拍照、貼紙與匯出高清 PNG）。

### 3. 異動檔案清單 (Impact & Modified Files)
- 新增：`apps/web-demo/` 完整 React + TypeScript + Vite + Tailwind + Zustand 專案
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（升級至 `v2.2.0-web-mvp-playable`）


---

## [2026-11-01] 升級《楓之谷》風二頭身 Q 版精細角色、介面減法瘦身與收錄首輪試玩 13 項待辦清單 (TASK-017 & TASK-018)

### 1. 觸發原因 (Trigger / Context)
- 使用者試玩首版 MVP 後回饋：
  1. 初期紅白機方塊人與腦海中「《楓之谷》等級角色細節」有落差，且介面文字過多過雜。
  2. 在升級為《楓之谷》風二頭身 Q 版點陣與介面減法後，使用者表示「覺得好很多」，並進一步提出 **13 項具體體驗與架構迭代需求**，要求先完整記錄為待辦事項（不用馬上修改代碼）。

### 2. 收錄之 13 項核心待辦事項 (`V2-01` ~ `V2-13`)
1. **`V2-01` 單日單次完整運動課表紀錄**：每次健身記為單日單次獨立 Session，內含完整動作、組數、重量、次數與時間明細。
2. **`V2-02` 跨 Tab 運動專注模式懸浮提醒**：運動或組間休息進行中切換至其他 Tab 時，頂部需常駐明顯的運動時間/休息倒數懸浮條。
3. **`V2-03` 迷因拍貼工坊自由度升級**：支援自由拖曳移動貼圖，並可自訂角色的拍照表情與動作姿勢。
4. **`V2-04` 寵物納入可選裝飾體系**：寵物作為裝飾品之一，可自由裝備、替換或收起。
5. **`V2-05` 商城頂部固定試穿 ＋ 真實物件圖案 ＋ 購物車一次結帳**：上半部試穿鏡固定不隨滾動消失；商品顯示物件真實點陣縮圖；支援先試穿多件再放入購物車一次購買。
6. **`V2-06` 各器材獨立組間休息時間 ＋ 泛運動多元支援**：課表可為每個動作設定不同組間休息秒數；訓練類型擴展至有氧、徒手、球類等非重訓項目。
7. **`V2-07` 好友列表、個人主頁 & 雙人同框串門子**：新增好友名單與獨立用戶版面；串門子時**「自己的角色也要同時出現在對方房間裡」**。
8. **`V2-08` 房間通用自由擺設槽位 ＋ 獨立衣櫃/佈置設定**：打破固定位置綁定特定器材限制（深蹲架/電玩機台位置可自由換成其他家具或留空），並提供獨立的個人裝扮與房間佈置介面。
9. **`V2-09` 數據控進階趨勢圖表**：數據頁提供訓練量、力量 PR、體態數據之視覺化折線圖/長條圖看長期趨勢。
10. **`V2-10` 8-Bit 背景音樂 (BGM) 實作**：補齊可循環播放之輕快 Chiptune BGM。
11. **`V2-11` 頂部 Header 數字溢位防護**：防止金幣或連勝數字太長時將右上角 `[⚙️]` 設定按鈕擠出畫面。
12. **`V2-12` 打賞與送禮防刷限制**：設定每日總次數上限，以及對同一使用者每日可送出的次數上限。
13. **`V2-13` 紙娃娃分部位試穿介面**：角色飾品與裝備按部位（頭飾、上衣、下身、手持、表情）清楚分流，打造純正紙娃娃試穿體感。
14. **`V2-14` 動作視覺圖示 ＋ 重量/次數直輸鍵盤 ＋ 完整組數明細**：已完成組數必須標明「哪個動作、多重、幾次」並搭配動作/部位示意圖片；重量與次數除 `±` 外須支援直接點擊彈出數字鍵盤輸入。
15. **`V2-15` 運動打卡核心流程重構（以課表管理為中心）**：
    - 進入運動 Tab 先呈現**已儲存課表與分類**（`我的最愛` / `我的課表` / `引用別人的課表` / `系統推薦模板`）。
    - 若有已存課表：可直接針對該課表執行**「3秒速記」**、**「微調後紀錄」**或**「進入運動專注模式」**。
    - 若無課表或欲新增：透過分類搜尋動作，依序設定器材、組數、重量、次數與組間休息時間以建立新課表。
    - **訓練中現實彈性**：執行專注模式時，支援**「中途替換器材/動作」**（因應健身房器材被佔用）與**「未完整做完課表提前結算」**。
16. **`V2-16` 廣場動態三軌分流**：清楚區分「公開貼文」、「好友貼文」與「我的貼文」。
17. **`V2-17` 主畫面極簡 × 二級點開詳細頁架構 (Drill-Down Architecture)**：主版面保持清爽不雜亂，點擊課表、動作、歷史紀錄或玩家時，推入完整的二級詳細頁呈現深度資訊。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)（看板版本升級至 `v2.5.0-workout-flow-and-plaza-spec-logged`，完整建檔 `V2-01` ~ `V2-17`）
- 更新：[`logs/changelog.md`](changelog.md)



---

## [2026-11-02] 全面完成首輪試玩反饋 18 項升級 (`V2-01` ~ `V2-18`)：課表中心、固定試穿購物車、雙人串門同框與數據趨勢圖 (TASK-019)

### 1. 觸發原因 (Trigger / Context)
- 使用者針對看板上整理之 18 項試玩反饋待辦事項（`V2-01` ~ `V2-18`）下達 `/goal` 指令：「ok，請幫我把剛才說待辦要修改的功能都修正一下吧」。

### 2. 工程落地與 18 項核心升級明細 (Engineering Deliverables)
1. **五大 Tab 名稱定調與頂部防爆版 (`V2-02`, `V2-11`, `V2-18`)**：
   - `BottomNav.tsx` 與 `economyConfig.ts` 定調為 **`房間`**、**`運動`**、**`商城`**、**`社交`**、**`我的`**。
   - `TopHeader.tsx` 實作 `formatCompact()` 大數值縮寫與 `shrink-0` 鎖定 `[⚙️]`，並新增跨 Tab 運動專注模式/組間休息倒數之「頂部動態島懸浮提醒條」。
2. **課表中心驅動之運動打卡與泛運動支援 (`V2-06`, `V2-14`, `V2-15`, `V2-17`)**：
   - `WorkoutTab.tsx` 預設首屏改為「課表管理中心」，分流 `⭐ 我的最愛`、`📁 我的課表`、`🔗 引用他人`、`💡 官方推薦` 四大分類。
   - 支援「⚡ 3秒速記課表（可直接打卡或微調今日數值後打卡）」、「▶️ 開始專注訓練」與「＋ 建立新課表（支援搜尋重訓/有氧/徒手動作並設定各動作組間休息秒數）」。
   - 專注模式支援「🔄 中途替換器材/動作」、「提前完成結算」、重量與次數直接點擊數字鍵盤輸入，以及每筆已完成組數顯示 48×48 點陣動作圖示 (`ExerciseThumbnail.tsx`) 與完整重量×次數明細。
3. **商城頂部固定試穿鏡、真實點陣商品縮圖與購物車一次結帳 (`V2-04`, `V2-05`, `V2-08`, `V2-13`)**：
   - `ShopTab.tsx` 將頂部即時試穿畫布設為 `sticky top-0 z-30` 固定不隨商品列表捲動消失。
   - 每個商品皆以 `ItemSpriteThumbnail.tsx` 繪製真實點陣外觀，並細分紙娃娃 5 大部位（頭飾、臉部、上衣、下身、手持）與房間傢俱/寵物分類。
   - 點選未擁有商品可立即在頂部試穿並加入 `cartItemIds` 購物車，底部浮動購物車支援「一次購買結帳並穿戴」。
   - 新增獨立 `WardrobeModal.tsx` 紙娃娃衣櫃與房間 3 槽自由佈置介面（左/中/右位置皆可自由放置任何器材、電玩、植物、寵物或收起留空）。
4. **社交三軌分流、好友列表、雙人同框串門子與防刷上限 (`V2-03`, `V2-07`, `V2-10`, `V2-12`, `V2-16`)**：
   - `PlazaTab.tsx` 頂部提供 `公開動態`、`好友貼文`、`我的貼文`、`好友列表` 四向切換，並限制每日總打賞/送水 5 次、同對象每日上限 2 次。
   - 點擊玩家開啟 `UserProfileModal.tsx` 獨立個人主頁（可一鍵引用對方課表）；點擊「串門同框」時，`pixelSpriteDrawer.ts` 將玩家本人的 Q 版角色同步繪製在好友房間內並肩互動 (`👋 我來串門！`)。
   - `MemeStudioModal.tsx` 新增 4 種表情切換、4 種動作姿勢切換，並支援在畫布上直接拖曳移動「貼圖框」與「角色位置」。
   - `SoundManager.ts` 實作 Web Audio 8-Bit Chiptune BGM 循環播放。
5. **單日單次完整課表紀錄與數據控趨勢圖表 (`V2-01`, `V2-09`, `V2-17`)**：
   - `AnalyticsTab.tsx`（`[👤 我的]`）提供「單次訓練容量成長折線圖 (SVG Line Chart)」、「三大項 PR 力量成長曲線」、「全身肌群組數分佈圖」與「單日單次課表紀錄列表」，點擊任一紀錄即彈出 `SessionDetailModal.tsx` 檢視當日完整動作與每一組重量/次數/休息明細。

### 3. 異動檔案清單 (Impact & Modified Files)
- 更新：`apps/web-demo/src/` 全部核心組件、狀態機與點陣渲染引擎
- 更新：[`PROJECT_STATE.md`](../PROJECT_STATE.md)、[`logs/changelog.md`](changelog.md)

---

## [2026-11-03] 重大美術與體驗升級 (`v2.7.0`)：全面廢除 8-Bit 馬賽克方塊，升級《楓之谷》級高清 2D 賽璐璐 Q 版引擎、專業運動解剖圖庫與溫暖亮色主題 (TASK-020)

### 1. 觸發原因 (Trigger / Context)
- 使用者明確指出三大核心體驗升級需求：
  1. **角色與房間畫質**：不想要 8-Bit 粗糙馬賽克方塊像素風，而是要像《楓之谷》(MapleStory) 那種圓潤精緻、讓人一看就覺得「可愛或很酷」的 2D Q 版紙娃娃風格（拍板採用方案 A：高清 2D 圓潤賽璐璐向量與漸層骨架引擎）。
  2. **健身動作資料庫專業化**：身為一款主打健身知識與自律的紙娃娃遊戲，運動資料庫不應使用像素圖，而應採用專業的解剖肌群高亮圖解與 `free-exercise-db` 真人動作示範圖庫。
  3. **主視覺告別暗黑科技感**：不要冷硬的暗黑賽博科技風，預設改為溫暖明亮的日常風格（支援偵測系統深淺色、抓不到或初始預設為亮色溫暖版，並提供柔和不科技感的暖深色模式）。

### 2. 工程落地與核心交付 (Engineering Deliverables)
1. **《楓之谷》級高清 2D 圓潤賽璐璐紙娃娃與房間渲染引擎 (`pixelSpriteDrawer.ts`, `PixelRoomCanvas.tsx`, `ItemSpriteThumbnail.tsx`)**：
   - 徹底移除 `image-rendering: pixelated` 與 `fillRect` 馬賽克方塊畫法，畫布升級為 `960×600` Retina 抗鋸齒平滑渲染 (`imageSmoothingQuality = 'high'`)。
   - 採用圓潤貝茲曲線、暖深棕漫畫描邊 (`#2b1d16`) 與多層次光影漸層，打造正宗二頭身 Q 版大頭娃娃：圓潤臉頰與腮紅、三層寶石漸層水汪汪大眼（含雙星芒高光與眨眼動畫）、帶天使光圈的蓬鬆漸層髮束、立體 SBD 健力服/連帽衫/黃金戰甲、超萌圓潤赤柴犬（豆助）/黑貓/懸浮乳清機器人與陽光灑落的木質健身房。
2. **專業運動科學解剖圖庫 × `free-exercise-db` 真人動作示範 (`ExerciseThumbnail.tsx`, `catalogConfig.ts`, `WorkoutTab.tsx`)**：
   - 為全動作庫補齊 `primaryMusclesZh`（主働肌）、`secondaryMusclesZh`（協同肌）、`equipmentZh` 與 `freeExerciseDbId`。
   - `ExerciseThumbnail.tsx` 改為專業運動醫學級 SVG 生物力學與紅/橘主次働肌群高亮解剖圖，並於課表詳情內嵌 `yuhonas/free-exercise-db` 起始與頂峰收縮雙圖示範。
3. **溫暖亮色預設主題 × 柔和暖深色模式 (`index.css`, `App.tsx`, `TopHeader.tsx`, `SettingsModal.tsx`)**：
   - 全域導入 `.theme-light`（燕麥奶白底色 `#faf6f0`、純白立體卡片、暖木棕邊框與深焙咖啡字體）與 `.theme-dark`（暖炭焙深色 `#211d1a` / `#2b2623`，徹底去除冰冷科技霓虹感）。
   - 支援 `light`（預設）/ `dark` / `system`（偵測手機 `prefers-color-scheme` 並以亮色為 Fallback），且在頂部 Header 提供一鍵 `☀️ / 🌙` 切換鈕。


---

## [2026-11-03] 實機體驗第二輪優化 (v2.8.0)：中途新增動作、極簡無括號 UI、加好友與內購模擬、月曆/週檢視、高反差六塊肌紙娃娃與 Capacitor iOS/Android 雙端封裝 (TASK-021)

### 1. 觸發原因 (Trigger / Context)
- 使用者於手機實機測試 `v2.7.0` 後提出 7 項具體優化與封裝需求：
  1. 專注訓練中無法中途「新增動作」，點選後皆為替換。
  2. 介面文字過多、充滿 `(...)` 括號說明與過長按鈕文字，易造成手機窄螢幕換行或 `...` 截斷。
  3. 社交頁面需模擬「還不是好友、可以加好友」的互動情境。
  4. 商城缺乏可見的內購儲值入口（可先以沙盒模擬不串真實金流）。
  5. 健身紀錄需具備「月曆檢視」與「週檢視」，快速確認每日與每週訓練量。
  6. 紙娃娃缺乏展示肌肉的機會，新手菜鳥與健身巨巨的體態辨識度太低。
  7. 完成上述調整後，產出 iOS / Android 原生 App 專案並提供 iPhone 實機安裝測試教學。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **專注訓練「新增 vs 替換」雙軌解耦**：於 `useGameStore.ts` 新增 `addExerciseToActiveQueue(exerciseId)`，並在 `WorkoutTab.tsx` 的動作選擇視窗中為每個動作提供獨立的 **`[替換]`** 與 **`[＋新增]`** 雙按鈕，且在水平動作序列末端加上 **`[＋ 新增]`** 快捷卡。
2. **全域無括號極簡文字規範**：徹底移除五大 Tab 與所有 Modal 中的 `(...)` 補充說明，將所有按鈕精簡為 2～4 字（如 `開始運動`、`拍貼工坊`、`換裝佈置`、`加好友`、`串門`、`結帳穿戴`）。
3. **動態好友關係模擬 (`friendIds`)**：於 `FRIEND_PROFILES` 與初始動態牆加入非好友角色（`街頭健體 · Leo`、`陳巨石`、`林健美`），透過 `store.toggleFriend(id)` 即時切換 **`[＋ 加好友]` ➔ `[✓ 好友]`**，成為好友後其貼文即自動匯入「好友」動態分頁。
4. **商城模擬內購 (`💎 儲值` 分頁 & 沙盒付款彈窗)**：於 `catalogConfig.ts` 定義 `IAP_PACKAGES`（NT$ 30 ~ NT$ 190），並在 `ShopTab.tsx` 實作 Apple App Store / Google Play 風格的模擬付款確認視窗 (`[一鍵模擬付款]`)。
5. **月曆與週訓練量檢視 (`AnalyticsTab.tsx`)**：於 `[👤 我的 -> 月曆與紀錄]` 實作 3 種檢視切換：**`📅 月曆檢視`**（28 日格狀月曆標示訓練日與當日容量 `k`）、**`📊 週訓練量`**（近 7 日垂直長條圖＋本週天數/組數/總量 KPI）與 **`📋 列表明細`**。
6. **高反差肌肉紙娃娃 (`pixelSpriteDrawer.ts`)**：新增免費預設的 `top_bare_muscles`（赤膊健美體態），大幅拉開 `🌱 菜鳥`（窄肩、細手臂、平坦柔和肚皮）與 `⚡ 精實 / 🐻 巨巨 / 👑 泰坦`（斜方肌、立體胸大肌高光、六塊腹肌、3D 三角肌與二頭肌峰）的視覺落差，並在 `[🏠 房間]` 首屏直接提供一鍵體態切換預覽列。
7. **Capacitor iOS / Android 原生專案封裝**：於 `apps/web-demo` 安裝 `@capacitor/core`、`@capacitor/cli`、`@capacitor/ios`、`@capacitor/android`，建立 `capacitor.config.json` 並產出 `apps/web-demo/ios` (Xcode) 與 `apps/web-demo/android` (Android Studio) 原生工程，同時補齊 iOS PWA Standalone Meta 標籤。

### 3. 影響範圍與異動檔案清單 (Impact & Modified Files)
- [catalogConfig.ts](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/config/catalogConfig.ts)
- [pixelSpriteDrawer.ts](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/game/pixelSpriteDrawer.ts)
- [useGameStore.ts](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/stores/useGameStore.ts)
- [HomeTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/HomeTab.tsx)
- [WorkoutTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/WorkoutTab.tsx)
- [ShopTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/ShopTab.tsx)
- [PlazaTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/PlazaTab.tsx)
- [AnalyticsTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/AnalyticsTab.tsx)
- [UserProfileModal.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/modals/UserProfileModal.tsx)
- [WardrobeModal.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/modals/WardrobeModal.tsx)
- [capacitor.config.json](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/capacitor.config.json)
- [PROJECT_STATE.md](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/PROJECT_STATE.md)

---

## [2026-11-07] 遊戲化社交大改版 (v2.9.0)：Tap Titans 關卡推圖、組間休息防作弊懲罰、Boss 隱藏噴裝、2~4人戰隊催促與 GitHub Pages 自動部署 (TASK-022 ~ TASK-026)

### 1. 觸發原因 (Trigger / Context)
- 使用者讓朋友實測後反饋原「社交頁面」僅有單向貼文與送水，較為枯燥，希望進行全面遊戲化大改版，並確立以下核心原則：
  1. 嚴謹健身數據與紀錄為根本地基，遊戲化為附加推動力。
  2. 不鼓勵比拼大重量/大容量（避免逞強受傷），戰鬥力以「完成任務」與「連續簽到 (Streak)」為主。
  3. 裝備 100% 靠運動解任務賺金幣取得（零 P2W），依運動風格賦予「🥊 物攻 / 🪄 魔攻 / 🛡️ 輔助」屬性。
  4. 採《Tap Titans》關卡式推圖（個人試煉 ＋ 2~4 人彈性戰隊雙軌），Boss 為幽默現代生活系怪物，血條殘血累積保存不重置。
  5. 以「組間休息計時完整度」作為防亂按交差判定：3 秒亂按作弊者嚴厲懲罰（傷害 -95% 刮痧拳 ＋ 禁掉寶），並讓戰隊好友可一鍵抓包處刑。
  6. 每關 Boss 具備專屬隱藏掉落神裝 (`hiddenLoot`)，並可依當日運動類型（重訓/有氧/徒手）選擇技能與隊友打 Combo 連攜。
  7. 設定每次 `git push` 自動編譯部署至公開 GitHub Pages。

### 2. 思考推演與決策脈絡 (Deduction & Rationale)
1. **GitHub Pages CI/CD 自動化部署 (`.github/workflows/deploy-pages.yml`)**：配置 Node 20 自動打包 `apps/web-demo/dist` 並將 `vite.config.ts` 與 `manifest.json` 改為相對路徑 `./`。
2. **導覽列更名 `[⚔️ 冒險]` 與三大子視角 (`PlazaTab.tsx`)**：整合 `[👹 討伐推圖]`、`[🏆 榮譽天梯]`（個人關卡榜、戰隊推圖榜、單次最高傷害榜）與 `[👥 戰友動態]`。
3. **組間休息防作弊與隊友連攜技能 (`useGameStore.ts`)**：
   - 實作 `todayWorkoutStatus`（`legit_rest` / `cheated_fast` / `none`）與 `todaySportType`（重訓 `🔨 破甲重擊`、有氧 `🔥 燃脂魔焰` 引爆 2 倍破甲連攜、核心 `🌪️ 聚氣暴擊陣` 掉寶率 ×2）。
   - 實作戰隊成員公開稽核日誌，支援對未出勤隊友 `[🔔 拿啞鈴敲他]`、`[📲 LINE 討伐令]`，以及對作弊隊友 `[🚨 抓包作弊（沒收傷害罰他重練）]`。
4. **Wiki 知識庫全面同步**：將 V2.9 遊戲機制與《FitMon 核心數值平衡總表》完整寫入 `wiki/game_mechanics_and_science.md` 與 `wiki/meme_and_social.md`。

### 3. 影響範圍與異動檔案清單 (Impact & Modified Files)
- [.github/workflows/deploy-pages.yml](file:///Users/yuchien/Project/Github/fitmon/.github/workflows/deploy-pages.yml)
- [catalogConfig.ts](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/config/catalogConfig.ts)
- [economyConfig.ts](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/config/economyConfig.ts)
- [useGameStore.ts](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/stores/useGameStore.ts)
- [BottomNav.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/layout/BottomNav.tsx)
- [PlazaTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/PlazaTab.tsx)
- [ShopTab.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/tabs/ShopTab.tsx)
- [WardrobeModal.tsx](file:///Users/yuchien/Project/Github/fitmon/apps/web-demo/src/components/modals/WardrobeModal.tsx)
- [game_mechanics_and_science.md](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/game_mechanics_and_science.md)
- [meme_and_social.md](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/meme_and_social.md)
- [00_INDEX.md](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md)
- [PROJECT_STATE.md](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/PROJECT_STATE.md)
