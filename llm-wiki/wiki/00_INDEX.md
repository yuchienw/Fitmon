# FitMon 全域知識索引 (Master Knowledge Index)

歡迎查閱 FitMon 產品知識庫。本索引為整體架構知識樹之核心導引入口。

---

## 核心主題清單

| 編號  | 主題檔案                                          | 核心內容摘要                                                                                    |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 01  | [產品定位與零個資隱私原則](product_vision_and_privacy.md) | 泛運動愛好者定位、極速免註冊試玩 ➔ 漸進式無感綁定、Zero-PII 內容防火牆與本機健康沙盒                                                  |
| 02  | [雙軌紙娃娃與雙模式運行機制](dual_mode_experience.md)      | 32x32 角色 5 層精靈換裝 ＋ 專屬像素訓練室 6 大家具卡槽自訂、50/50 對半課表工坊、同器材獨立動作區塊隔離紀錄 |
| 03  | [遊戲機制與任務數值引擎](game_mechanics_and_science.md)  | 三層任務體系、單人與組隊雙軌冒險、個人素質專頁、時裝屬性、防作弊組間休息與每日1次秒解限制、Boss尾刀與噴裝分享 |
| 04  | [冒險公會大廳、戰隊共鬥與迷因工坊](meme_and_social.md)    | 隊長邀請組隊共享血量、尾刀擊殺專屬戰報、稀有噴裝分享、抓包作弊公開處刑、三大天梯榜與迷因拍貼 |
| 05  | [系統技術架構與數據儲存](tech_architecture.md)           | 現代 App 外殼 ＋ 局部嵌入像素畫布、月瀏覽 (1號~月底) 與週瀏覽 (週日~週六) 切換切換引擎、主題設定、Server-Authoritative 防作弊與零個資架構 |
| 06  | [商業策略與長期變現路徑](business_model.md)              | 裝備純外觀 vs 道具影響數值、體力水與倍率卡高頻復購 IAP、每日1次秒解防課金失衡、名人品牌聯名挑戰賽 |
| 07  | [開發里程碑與落地藍圖](roadmap.md)                      | Milestone 1 (2 週遊戲化 Web Demo MVP)、Milestone 2 (社群廣場與朋友圈裂變)、Milestone 3 (Capacitor 雙端原生上架) |

---

## 跨層追溯鏈結

- **即時狀態與任務看板**：[`PROJECT_STATE.md`](../PROJECT_STATE.md)
- **重大架構決策 (ADR)**：[`ADR-0001 (Web-to-Mobile)`](../adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md) ｜ [`ADR-0002 (App 外殼與局部畫布)`](../adr/0002-app-shell-with-embedded-pixel-canvas.md) ｜ [`ADR-0003 (每日打卡固定 XP)`](../adr/0003-daily-checkin-fixed-xp.md) ｜ [`ADR-0004 (最低年齡 13 與未成年保護)`](../adr/0004-minimum-age-13-minor-protection.md) ｜ [`ADR-0005 (兩倍券只在遊戲裡賺、買斷外觀)`](../adr/0005-double-coupon-earn-only-cosmetic-revenue.md)
- **長期人機協作溝通 SOP**：[`ops/collaboration_sop.md`](../ops/collaboration_sop.md)
- **Agent 讀寫規範手冊**：[`AGENT.md`](../AGENT.md)
- **資料庫遷移腳本**：[`supabase/migrations/20261101_init_fitmon_game_schema.sql`](../../supabase/migrations/20261101_init_fitmon_game_schema.sql)
- **完整演進軌跡**：[`logs/changelog.md`](../logs/changelog.md)
- **會議紀錄**：[`logs/meetings/`](../logs/meetings/)
