# FitMon 全域知識索引 (Master Knowledge Index)

歡迎查閱 FitMon 產品知識庫。本索引為整體架構知識樹之核心導引入口。

---

## 核心主題清單

| 編號  | 主題檔案                                          | 核心內容摘要                                                                                    |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 01  | [產品定位與零個資隱私原則](product_vision_and_privacy.md) | 泛運動愛好者定位、極速免註冊試玩 ➔ 漸進式無感綁定、Zero-PII 內容防火牆與本機健康沙盒                                                  |
| 02  | [雙軌紙娃娃與雙模式運行機制](dual_mode_experience.md)      | 32x32 角色 5 層精靈換裝 ＋ 專屬像素訓練室 6 大家具卡槽自訂、Tab 1 訓練室與 Tab 2 運動專注分流                                |
| 03  | [遊戲機制與任務數值引擎](game_mechanics_and_science.md)  | 三層任務體系 (日常/Streak/里程碑)、百位數金幣經濟、數值配置化 (Config-Driven)、街機勝利結算、開源動作庫與科普問答        |
| 04  | [拍立得社群與迷因拍貼工坊](meme_and_social.md)            | 像素拍立得布告欄、Meme 拍貼工坊 (解鎖道具變貼紙/自嘲梗庫)、非遮蔽式宣傳 Logo 浮水印、好友串門參觀                                  |
| 05  | [系統技術架構與數據儲存](tech_architecture.md)           | 現代 App 外殼 (底部 4 大 Tab + 頂部 Header) ＋ 局部嵌入像素畫布 (ADR-0002)、Supabase 綱要與原子 RPC、本機健康沙盒、多國語系 (en/zh-TW) |
| 06  | [商業策略與長期變現路徑](business_model.md)              | 精益創業思維、MVP 專注好玩度與交友圈自然口碑、健全內部金幣閉環、後期外觀 IAP 與品牌聯名                                          |
| 07  | [開發里程碑與落地藍圖](roadmap.md)                      | Milestone 1 (2 週遊戲化 Web Demo MVP)、Milestone 2 (社群廣場與朋友圈裂變)、Milestone 3 (Capacitor 雙端原生上架) |

---

## 跨層追溯鏈結

- **即時狀態與任務看板**：[`PROJECT_STATE.md`](../PROJECT_STATE.md)
- **重大架構決策 (ADR)**：[`ADR-0001 (Web-to-Mobile)`](../adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md) ｜ [`ADR-0002 (App 外殼與局部畫布)`](../adr/0002-app-shell-with-embedded-pixel-canvas.md)
- **長期人機協作溝通 SOP**：[`ops/collaboration_sop.md`](../ops/collaboration_sop.md)
- **Agent 讀寫規範手冊**：[`AGENT.md`](../AGENT.md)
- **資料庫遷移腳本**：[`supabase/migrations/20261101_init_fitmon_game_schema.sql`](../../supabase/migrations/20261101_init_fitmon_game_schema.sql)
- **完整演進軌跡**：[`logs/changelog.md`](../logs/changelog.md)
