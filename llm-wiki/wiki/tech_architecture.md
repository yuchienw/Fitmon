# 系統技術架構與數據儲存 (System Architecture & Tech Stack)

> **鏈結索引**：[返回索引](00_INDEX.md) ｜ [架構決策 ADR-0001](../adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md) ｜ [資料庫遷移腳本](../../supabase/migrations/20261101_init_fitmon_game_schema.sql)

---

## 1. 總體技術棧與分層架構 (React + PixiJS + Supabase + Capacitor)

針對 Web 全端工程師背景，系統採用「**Web-First 遊戲化 ➔ 一鍵跨端 Native**」架構：

```mermaid
flowchart TB
    subgraph Client ["前端遊戲與應用層 (Web / Mobile PWA)"]
        PixiCanvas["【底層 Canvas】PixiJS 2D 遊戲渲染引擎\n• 180x320 固定低解析 + NEAREST 無損近鄰放大\n• 32x32 角色 5 層精靈 (身體/表情/髮型/衣服/配件)\n• 房間 6 大家具卡槽 + 小人自主遊蕩 AI\n• 金幣噴發粒子與 8-bit 音效系統"]
        
        ReactDOM["【頂層 DOM】React 18 + Tailwind CSS\n• 9-Slice 像素邊框對話框、任務清單彈窗\n• 原生文字輸入、長列表流暢滾動、Meme 拍貼工坊"]

        StateLayer["狀態與儲存轉接層\n• LocalStorage / IndexedDB (未登入試玩沙盒)\n• Zustand / React Context (遊戲世界狀態樹)"]

        ReactDOM --> StateLayer
        PixiCanvas --> StateLayer
    end

    subgraph NativeWrapper ["Capacitor 原生跨端封裝層"]
        Capacitor["Capacitor Bridge\n(npx cap add ios / android)"]
        Haptics["手機觸覺震動馬達 (Haptics)"]
        SharePlugin["系統原生分享卡 (IG 限動 / Threads / LINE)"]
        
        Client --> Capacitor
        Capacitor --> Haptics
        Capacitor --> SharePlugin
    end

    subgraph Cloud ["雲端後端層 (Supabase)"]
        Auth["Supabase Auth (Apple / Google OAuth 匿名 UID)"]
        DB[("PostgreSQL 雲端庫\n• profiles (雙軌紙娃娃配置)\n• items & quests (圖鑑與任務)\n• workouts & posts (運動與拍立得)\n• tips_and_gifts (打賞明細)\n• game_economy_config (配置化常數)")]
        RPC["原子交易預存程序\n• rpc_send_tip_or_gift\n• rpc_claim_quest_reward"]

        StateLayer -.->|"漸進式綁定時無損合併"| Auth
        StateLayer -.->|"RPC 交易與社群同步"| DB
        DB --- RPC
    end
```

---

## 2. 視口與渲染規格 (Viewport & Rendering)

* **虛擬畫布**：`180 x 320` 經典手持 9:16 像素解析度。
* **放大採樣**：全域使用 `PIXI.SCALE_MODES.NEAREST`，保證在現代高解析螢幕（Retina）上擁有純粹方塊顆粒感，無模糊、極致省電。
* **圖集預載**：所有角色部件與家具打包為 Spritesheet Atlas，單次請求載入完畢，換裝秒切零延遲。

---

## 3. 雲端資料庫綱要 (Supabase Schema 摘要)

完整 DDL 位於 [`supabase/migrations/20261101_init_fitmon_game_schema.sql`](../../supabase/migrations/20261101_init_fitmon_game_schema.sql)：

1. **`profiles`**：儲存 `avatar_config (JSONB)`、`room_config (JSONB)`、金幣餘額與 Streak 天數。
2. **`items`**：包含角色外觀（`avatar_*`）與房間家具（`room_*`）的統一圖鑑，標註金幣價格與 PixiJS 素材 Key。
3. **`quests` & `user_daily_quests`**：定義日常任務、打卡連擊暴擊與玩家每日進度。
4. **`posts`**：儲存拍立得運動成果、自嘲短評、發文當下的角色/房間外觀快照（無真人照片，純像素零風控）。
5. **`routine_templates` & `user_workout_schedules`**：自訂課表模板、每週分化排程與休息日標記。
6. **`tips_and_gifts`**：記錄打賞金額與能量水互贈，由資料庫交易保證防刷。
7. **`game_economy_config`**：數值配置表，支持未來動態模擬熱更新。

---

## 4. Local-First 離線優先同步與智慧推播 (Offline-First & Reminders)

1. **地下室無訊號離線打卡 (Offline-First Sync)**：
   * 在 B1/B2 地下室健身房無收訊環境下，打卡、碼表與換裝依然 100% 順暢存於本地 IndexedDB。
   * 手機重新偵測連網（`online` 事件）時，系統在背景默默批次同步至 Supabase，完全不產生阻礙彈窗。
2. **智慧溫和習慣提醒 (Smart Reminder)**：
   * 玩家可自訂每日提醒時段（如晚上 8:00）。
   * 當日尚未打卡時，小人或柴犬發出一則幽默短通知；當日已完成則自動靜音，絕不嘮叨。

---

## 5. 本機健康沙盒與系統健康串接 (Local Biometrics & HealthKit / Health Connect)

1. **本機審視儀表板 (Local Analytics Charts)**：
   * 包含年齡、身高、體重、體脂率、睡眠時長、飲水量、歷史訓練總容量 (Tonnage)。
   * 本機自動計算 BMI、BMR（Mifflin-St Jeor 公式）與動態 TDEE（依當週運動頻率乘上活動係數給予熱量建議）。
   * 支援 7 天、30 天、90 天平滑趨勢線與柱狀圖，**100% 留存在終端設備 IndexedDB，嚴禁上傳雲端**。
2. **Apple Health 與 Google 健康串接**：
   * 透過 Capacitor 官方外掛（`@capawesome-team/capacitor-health`）在用戶授權下自動讀取 Apple Watch / Android 手機之體重、睡眠與步數。
   * 資料直存本機沙盒，提供最無痛的數據輸入體驗。
3. **雲端防作弊唯一職責 (Server-Authoritative Economy)**：
   * 雲端唯一保管並在伺服器端驗證的只有：**金幣錢包 (Wallet Ledger)、道具庫存 (Inventory)、純像素社群與打賞紀錄**，確保本機無法透過修改記憶體刷金幣作弊。

---

## 6. 產品行為遙測與漏斗分析模組 (Product Telemetry & Funnel Analytics)

1. **零個資匿名埋點原則 (Zero-PII Telemetry Guardrail)**：
   * 遙測數據**嚴禁包含任何生理私密數據**（身高、體重、體脂、睡眠、飲食照片 100% 留存在本地沙盒，不得上傳）。
   * 僅搜集**匿名化產品體驗指標**：D1/D7/D30 留存率、核心功能漏斗轉化（首頁 ➔ 運動打卡 ➔ 迷因合成 ➔ 分享至 IG）、最受歡迎家具/服飾道具、平均單次訓練時長。
2. **統一外觀模式架構 (Facade Pattern)**：
   * 前端封裝統一 `analytics.ts` 抽象接口（如 `analytics.track(eventName, properties)`）。
   * 底層相容支援 **PostHog**（首選：留存熱力圖、漏斗轉化分析、100 萬次/月免費額度）、**Google Analytics 4 (GA4)** 或內部數據表，業務代碼與分析供應商完全解耦。
3. **跨端支援**：
   * Web-Demo 階段透過 Web SDK 監聽使用者操作；Capacitor 雙端打包後自動切換至原生相容模式，確保數據完整不中斷。

---

## 7. 多國語系 (i18n)、品牌解耦與像素字型架構 (Multi-Language & Brand Decoupling)

1. **品牌名稱動態解耦 (Brand Decoupling)**：
   * 專案代碼內部使用 `FitMon` 作為 Codename，但**所有面向使用者的名稱全面抽離硬編碼**。
   * 前端由全域設定檔（`APP_CONFIG.brandName`）與語系檔（`locales/{lang}.json` 中的 `common.brandName`）統一注入。
   * 浮水印、版權聲明、社群分享標題與 App Title 皆由設定檔即時驅動，未來更名或註冊商標時 **0 代碼重構、1 秒全站置換**。
2. **多語系架構 (i18n Core Engine)**：
   * 採用 `i18next` ＋ `react-i18next`。
   * 首發支援：**英文 (`en-US`, 預設/Fallback)** 與 **繁體中文 (`zh-TW`)**。
   * 自動偵測系統語系 (`navigator.language`)，並在設定中提供手動切換開關。
3. **繁中/英文統一開源像素字型 (Pixel Font Strategy)**：
   * 採用 MIT 開源之 **`Fusion Pixel Font` (融合像素體)** 或 **`Cubic 11` (俐方體 11 號)**。
   * 具備完整繁體中文（台灣常用字集）與 ASCII 英數支援，統一 12px 點陣規格，杜絕缺字破圖或豆腐塊（`□`）。
4. **低解析度畫布防爆版佈局規則 (Anti-Overflow Layout)**：
   * 在 180×320 虛擬像素畫布中，嚴禁按鈕與彈窗使用固定寬度（Fixed px）。
   * 一律採用彈性容器（Flex/Grid + `flex-wrap`），並針對長度較長之英文詞彙預留多行折行或動態間距，避免畫面擠壓出界。
