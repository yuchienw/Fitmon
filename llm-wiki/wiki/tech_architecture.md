# 系統技術架構與數據儲存 (System Architecture & Tech Stack)

> **鏈結索引**：[返回索引](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md) ｜ [架構決策 ADR-0001](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md) ｜ [資料庫遷移腳本](file:///Users/yuchien/Project/Github/fitmon/supabase/migrations/20261101_init_fitmon_game_schema.sql)

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

完整 DDL 位於 [`supabase/migrations/20261101_init_fitmon_game_schema.sql`](file:///Users/yuchien/Project/Github/fitmon/supabase/migrations/20261101_init_fitmon_game_schema.sql)：

1. **`profiles`**：儲存 `avatar_config (JSONB)`、`room_config (JSONB)`、金幣餘額與 Streak 天數。
2. **`items`**：包含角色外觀（`avatar_*`）與房間家具（`room_*`）的統一圖鑑，標註金幣價格與 PixiJS 素材 Key。
3. **`quests` & `user_daily_quests`**：定義日常任務、打卡連擊暴擊與玩家每日進度。
4. **`posts`**：儲存拍立得運動成果、自嘲短評、隨拍照 URL 與發文當下的角色/房間外觀快照。
5. **`tips_and_gifts`**：記錄打賞金額與能量水互贈，由資料庫交易保證防刷。
6. **`game_economy_config`**：數值配置表，支持未來動態模擬熱更新。
