# T4-D5 決策備忘錄：未達門檻的當天累加計算與進度提示 (T4-D5 Decisions & Daily Progress Accumulation)

- 日期：2026-11-22
- 工單：T4-D5（未達門檻的當天累加計算）
- 儲存鍵：`fitmon-mvp-storage-v6`（維持不變）
- 存檔版本：**4**（維持不變，嚴禁 bump version，嚴禁新增持久化欄位）
- 相關規格：
  - `/workspace/fitmon-tickets/T4-D5-progress-and-accumulation.md`
  - `/workspace/fitmon-tickets/T1-daily-checkin-economy.md`「有效運動紀錄規則」
  - `/workspace/fitmon-tickets/T4-multi-sport-logging.md` (類型表)
  - `/workspace/fitmon-adventure/t1-t4-auto/spec.md` §3.2 與 §5 progress 規格
  - `/workspace/fitmon-adventure/t1-t4-auto/copy-for-coach.md` 第 55–59 條

---

## 1. 存檔架構與即時重算 (Zero Persisted Fields & Dynamic Recomputation)

本工單嚴格遵守產品、資料庫與架構規範：

1. **嚴禁 Bump 存檔版本與變更 Persist Key**：
   - 持久化儲存鍵維持 `fitmon-mvp-storage-v6`。
   - 存檔版本維持 **Version 4**。
2. **不新增任何持久化欄位**：
   - 進度資料一律為計算衍生狀態（derived state），不寫入 Zustand persist。
   - 每次開啟 App、切換頁面或新增運動時，由純函式 `accumulateDayProgress(workoutHistory, { dayKey, now, thresholds, caps })` 從當天運動歷史動態即時重算。
   - **優勢**：若未來在 `dayProgress.ts` 或伺服器調整門檻（例如調整每組折算分鐘、降低游泳門檻），用戶無須進行任何資料庫或 LocalStorage 遷移，即時生效。
3. **純函式與第 2 階段伺服器重算 (Phase 2 Server Authority)**：
   - `accumulateDayProgress` 與內部輔助函式均為純函式，**絕不在函式內呼叫 `Date.now()`**；當前時間戳 `now` 一律由呼叫端傳入。
   - 程式碼明確註記：`// 第 2 階段由伺服器用同一組鍵與預設值重算，不信任客戶端`。客戶端僅提供即時 UI 體驗與離線試玩，未來伺服器在 `POST workout_record` 接收活動時以相同鍵與邏輯裁決。

---

## 2. 舊打卡路徑現況與責任劃分 (Check-in Timing & Legacy Path)

1. **本單不發打卡獎勵**：
   - `accumulateDayProgress` 回傳之資料結構明確**不包含任何金幣 (`coins`) 或經驗值 (`xp`) 發放欄位**。
   - 本單不呼叫 `checkin()`、不調用 `grantCoins()` 或 `grantExp()`。
2. **既有 `finishWorkoutSession` 舊路徑維持現況**：
   - 既有在專注模式結算時呼叫的 `finishWorkoutSession` 中，保留舊有的「結算即打卡」路徑（僅在合理數據 `implausibleEval.countsTowardCheckin` 下維持現狀），本單未改動其發獎時機。
   - 已在程式碼與本備忘錄明確標註：這是舊路徑，自動達標發獎歸 **T1-D2**，打卡按鈕移除與全自動打卡歸 **T1-D3**。

---

## 3. 計算核心與定案規則對齊 (Calculation Rules & Thresholds)

設定集中於 `apps/web-demo/src/config/dayProgress.ts`，並可於純函式選項中自由覆寫：

| 設定鍵 (`DayProgressConfig`) | 預設值 | 規則依據與說明 |
|---|---|---|
| `minMinutes` | 10 | 單日跨運動類型有效總時長門檻（≥ 10 分鐘即達標 `met: true`） |
| `runWalkMinKm` | 1 | 跑步或快走單日有效距離門檻（≥ 1 公里即達標；**跑步與快走分開累加**，不合併計算） |
| `swimMinM` | 200 | 游泳單日有效距離門檻（≥ 200 公尺即達標） |
| `cycleMinKm` | 3 | 單車單日有效距離門檻（≥ 3 公里即達標） |
| `strengthMinSets` | 2 | 重訓／徒手有效組數門檻（≥ 2 組） |
| `strengthSetToMinutes` | 2 | **補記且無每組時間**之重訓每組折算分鐘常數（見第 4 節說明，請教練確認） |
| `minRestGapSec` | 20 | 重訓三條件：至少一半組間隔 ≥ 20 秒 |
| `minRestShare` | 0.25 | 重訓三條件：組間休息佔比 ≥ 25% |
| `pauseGapMin` | 10 | 暫停判定門檻：單次組間或分段間隔 > 10 分鐘（600 秒）自動扣除時長 |

### 累加核心不變量：
1. **日期隔離**：僅採計 `dayKey` 當天紀錄，歷史由 `getSessionDayKey(session, idx, now)`（以 `timestamp` 為主，無則退回 `daysAgo`／`dateLabel`）嚴格比對。
2. **不合理數據整筆排除**：透過 T4-D6 `evaluateImplausibleSession` 檢核，`countsTowardCheckin === false` 的紀錄整筆不進入累加；快走 12–25 km/h 之建議改跑步路徑（`suggestSportType: 'run'`）仍屬有效，照常累加。
3. **時長優先用暫停扣除後之 `totalDurationSec`**：
   - 即時重訓優先讀取扣除 >10 分鐘暫停後之 `totalDurationSec`。
   - 非重訓紀錄若具備 `pauseSegments`，亦將超過 600 秒之間隔扣除。
   - 即時重訓**絕不使用** `strengthSetToMinutes` 換算。
4. **有效性與未達標重訓防穿透**：
   - 即時重訓若未通過 T4-D2 三條件（≥2 組、一半間隔 ≥20s、休息佔比 ≥25%），時長不計入跨類型 `minutes_done`，避免連續亂按繞過 10 分鐘門檻。
   - 但其組數仍累計至 `strength_hint.sets_done`，組間休息不足時標記 `strength_hint.rest_rule_unmet = true`，以準確觸發提示。
5. **門檻判定為「大於或等於 (≥)」**：恰好 10 分鐘、1 公里、200 公尺、3 公里皆判定為達標 (`met === true`)。

---

## 4. `strengthSetToMinutes`（每組 2 分鐘）說明與請教練確認事項

- **背景**：
  工單指出：重訓組數折算成分鐘的常數（教練曾提案每組 2 分鐘）尚未單獨確認；spec §0、§3.2 與 §5 提及「教練 11/14 同意每組 2 分鐘換算，但只用在補記、而且沒有每組時間的情況；即時紀錄一律用實際時長並扣掉 >10 分鐘暫停」。
- **實作設計**：
  - 我們將 `strengthSetToMinutes` 獨立宣告於可調設定模組（`apps/web-demo/src/config/dayProgress.ts`），預設值設定為 `2`。
  - 在 `accumulateDayProgress` 中，嚴格限制只有在 `loggingMode === 'after_the_fact'` 且 `timingIncomplete === true`（無每組時間）時，才採用 `組數 × strengthSetToMinutes` 作為分鐘來源。
- **請教練／產品經理確認事項**：
  1. 請教練確認：補記無每組時間的重訓，每組 2 分鐘常數是否維持預設值 2？若未來欲調整為 2.5 或 3 分鐘，只需修改 `dayProgress.ts` 中的 `strengthSetToMinutes` 即可全面同步。
  2. 補記重訓的備援門檻已對齊工單與定案：需滿足「總組數 ≥ 2 組」且「總時長 ≥ 10 分鐘（或換算後滿 10 分鐘）」。

---

## 5. 門檻缺口與未來工單銜接 (Threshold Gaps & Roadmap)

在此列出本單實作期間梳理的門檻邊界與未來工單責任邊界：

1. **距離類型跨類型換算**：
   - 目前各運動距離門檻為獨立判定（跑步 1km、快走 1km、游泳 200m、單車 3km），任一達標即 `met: true`。
   - 當天若進行 500m 跑步 + 1.5km 單車，目前兩者距離各自未達標；但若兩者總時長合計滿 10 分鐘，則走跨類型分鐘達標。目前未自創「不同運動距離折算比率」，完全符合產品規格。
2. **游泳泳池長度與趟數**：
   - 游泳紀錄目前以 `distanceM`（公尺）累計，輸入介面（25m / 50m 泳池與 +1 趟）屬於 **T4-D4** 範圍。
3. **健康 App 延遲同步**：
   - 健康 App 匯入介面與延遲同步處理屬於 **T4-S1** 與 **T4-D7**，本單已預留 `source: 'health_app'` 與 `loggingMode: 'health_app'` 欄位相容處理。
4. **「我不舒服」減半門檻**：
   - 本單不處理減半門檻計算，亦不處理一週 2 次減半額度扣減，嚴格留待 **T4-D8** 與 **T1-D6** 實作。
5. **TodayHeroCard 提示整合**：
   - 在 `TodayHeroCard` 中掛載 `data-testid="day-progress-hint"`，於未達標且當天有紀錄時顯示「今天的運動 n／10 分」、進度條與主副提示；達標後此區塊自動消失。打卡按鈕與原 hero card 面板維持不變。
