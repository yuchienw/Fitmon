# FitMon 專案即時狀態與任務看板 (Project State & Kanban)

> **規則**：本檔案為專案的「即時黑板 (Single Source of Live Truth)」。每次對話啟動時 AI 必須讀取此檔以對齊狀態，每次討論產生決策或任務流轉時必須即時更新。

---

## 1. 專案元資料 (Metadata)

| 欄位 | 當前數值 | 說明 |
|---|---|---|
| **專案名稱** | FitMon (泛運動打卡社群 × 像素紙娃娃與運動科學) | 核心：雙軌紙娃娃、任務金幣、Meme 拍貼、開源科學動作庫 |
| **目前階段** | **Phase 1：Web Demo MVP 交付與實機體驗驗收期 (MVP Ready)** | 🚀 **【已完成 Sprint 1~3 完整可玩 Web Demo MVP】** |
| **當前版本** | `v2.2.0-web-mvp-playable` | 完整實作 5 大 Tab、2D 像素訓練室、運動打卡結算、商城與拍貼工坊 |
| **最後更新時間** | `2026-11-01 21:52 (Asia/Taipei)` | 每次討論結束必須更新時間戳 |
| **最後 Git Commit** | `41c9446` | 與本地儲存庫保持同步 |
| **當前焦點 (Current Focus)** | 實機試玩 `apps/web-demo` (`http://localhost:5173`)，體驗 5 大 Tab 與像素養成手感並微調細節 |

---

## 2. 待辦事項動態看板 (Kanban Board)

### 🔴 進行中 (In Progress)
- [ ] **MVP-PLAYTEST**：使用者實機體驗 `apps/web-demo` MVP，收集視覺體感、操作流暢度與數值反饋

### 🟡 待討論與規劃清單 (Backlog / To-Do)
- [ ] **DISCUSS-NUMERICS**：根據實機試玩感受微調 `economyConfig.ts` 商品定價與體力/金幣參數
- [ ] **MILESTONE-2**：串接 Supabase 雲端資料庫與 OAuth 漸進式綁定
- [ ] **MILESTONE-3**：Capacitor 封裝 iOS / Android 雙端原生 App

### 🟢 最近已完成 (Recently Done)
- [x] **DONE-20261101-22**：完成 `apps/web-demo` 完整可玩 Web Demo MVP（涵蓋 Sprint 1~3：5 大 Tab 外殼、240×150 嵌入式 2D 像素訓練室、5層紙娃娃與6卡槽房間、運動打卡與 `@fitmon/engine` 街機 VICTORY 結算、商城試穿/道具/扭蛋/名人特展、拍立得廣場與 Meme 拍貼 PNG 匯出、本機 TDEE 隱私沙盒與 8-bit 音效合成器）(TASK-016)
- [x] **DONE-20261101-21**：完成 Web Demo MVP 完整系統規格書 ([`fitmon_web_mvp_system_spec.md`](file:///Users/yuchien/.gemini/antigravity-cli/brain/b77c49d1-831b-4f6e-abb3-2c56e8683b35/fitmon_web_mvp_system_spec.md))，對齊 ADR-0002 現代 App 外殼與 5 大 Tab 佈局 (TASK-015)
- [x] **DONE-20261101-20**：確立 5 大 Tab 導覽列（加入商城 Tab）、頂部常駐 Header [⚙️]、名人認證特展、體力值 (Stamina) 防刷與消耗型道具 IAP 商業閉環 (TASK-014)
- [x] **DONE-20261101-19**：通過重大架構決策 [`ADR-0002`](adr/0002-app-shell-with-embedded-pixel-canvas.md)：從全螢幕遊戲引擎轉向「現代 App 外殼 ＋ 局部嵌入像素畫布」架構，確立畫布休眠機制 (TASK-013)
- [x] **DONE-20261101-18**：確立品牌名稱動態解耦 (Brand Decoupling) 與多國語系 (i18n: en / zh-TW) 架構，定案繁中像素字型選型與防爆版佈局規則 (TASK-012)
- [x] **DONE-20261101-17**：確立「批判性思維與非迎合溝通原則」寫入 `AGENT.md` 與 `collaboration_sop.md`，全面凍結程式碼開發 (TASK-011)
- [x] **DONE-20261101-16**：確立產品行為遙測與漏斗分析模組（Facade Pattern 支援 PostHog/GA4，零生理個資埋點原則）(TASK-010)
- [x] **DONE-20261101-15**：確立本機健康沙盒 (Local Biometrics Sandbox) 與 Apple Health / Google Health Connect 串接原則；數據 100% 留存本地，雲端僅驗證防作弊資產 (TASK-009)
- [x] **DONE-20261101-14**：納入 `free-exercise-db` 開源動作庫、雙軌圖解與玩中學每日科普問答 (TASK-008)
- [x] **DONE-20261101-13**：確立 Zero-PII 內容安全防火牆（站內純像素零風控、站外本地合照）、補齊課表模板、行事曆、PR 追蹤、休息日保護與離線同步，全系統收斂為 18 大模組 (TASK-007)
- [x] **DONE-20261101-12**：完成 MVP 前端工程落地藍圖與 Sprint WBS 分解 ([`fitmon_mvp_engineering_plan_v1.md`](file:///Users/yuchien/.gemini/antigravity-cli/brain/fe928b95-a5d1-439f-8ae3-9b7bc574f420/fitmon_mvp_engineering_plan_v1.md))
- [x] **DONE-20261101-11**：完成像素迷因拍貼工坊技術規格書 ([`fitmon_meme_studio_spec.md`](file:///Users/yuchien/.gemini/antigravity-cli/brain/fe928b95-a5d1-439f-8ae3-9b7bc574f420/fitmon_meme_studio_spec.md))
- [x] **DONE-20261101-10**：完成 PixiJS 2D 像素遊戲渲染器規格書 ([`fitmon_pixijs_renderer_spec.md`](file:///Users/yuchien/.gemini/antigravity-cli/brain/fe928b95-a5d1-439f-8ae3-9b7bc574f420/fitmon_pixijs_renderer_spec.md))
- [x] **DONE-20261101-09**：完成 Supabase 遊戲驅動資料庫綱要與原子打賞 RPC 函數 ([`supabase/migrations/20261101_init_fitmon_game_schema.sql`](../supabase/migrations/20261101_init_fitmon_game_schema.sql))
- [x] **DONE-20261101-08**：擴充 GDD 雙軌紙娃娃系統（納入 6 大房間裝潢卡槽與好友串門參觀），更新 [`fitmon_game_design_document_v1.md`](file:///Users/yuchien/.gemini/antigravity-cli/brain/fe928b95-a5d1-439f-8ae3-9b7bc574f420/fitmon_game_design_document_v1.md)
- [x] **DONE-20261101-07**：完成 GDD 遊戲企劃設計書初版
- [x] **DONE-20261101-06**：完成 Grill-me 戰略收斂訪談
- [x] **DONE-20261101-05**：在 `README.md` 與 `AGENT.md` 增設即時狀態看板
- [x] **DONE-20261101-04**：以 TypeScript 實作核心運動科學公式與疲勞衰減引擎 (`packages/engine`)
- [x] **DONE-20261101-03**：撰寫 ADR-0001 Web-First 技術選型評估
- [x] **DONE-20261101-02**：建立初始 8 大主題知識庫至 `wiki/*.md`
- [x] **DONE-20261101-01**：收錄原始 PRD 規格文件至 `raw/`

### ⏸️ 擱置 / 暫不考慮 (Parked / Post-MVP)
- **PARK-001**：外部補劑/品牌電商導購商務（俟社群人氣積累後再行考慮）
- **PARK-002**：複雜 RPG 怪物對戰與數值打怪數值（改採直觀任務與金幣制）

---

## 3. 階段里程碑完成度 (Milestone Tracker)

```mermaid
xychart-beta
    title "各里程碑推進度概況 (%)"
    x-axis ["Phase 0: 商業與規格規劃", "Milestone 1: Web-Demo MVP", "Milestone 2: 裂變與導購", "Milestone 3: 雙端APP上架"]
    y-axis "完成百分比" 0 --> 100
    bar [100, 100, 15, 0]
```
