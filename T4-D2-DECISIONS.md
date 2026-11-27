# T4-D2 決策備忘錄與三條件判定說明 (T4-D2 Decisions & Strength Validity)

- 日期：2026-11-21
- 工單：T4-D2（即時重訓的暫停、休息與有效性三條件判定）
- 儲存鍵：`fitmon-mvp-storage-v6`（維持不變）
- 存檔版本：**4**（維持不變，不增加任何新的 persist 欄位）

---

## 1. 經濟與打卡數值不變性 (Economic Invariants)

依據產品經理與幕僚長定案規則，本 PR 嚴格遵守下列不變性：

1. **打卡發獎維持現狀**：
   - 本單實作了重訓三條件純函式判定引擎（`evaluateStrengthSessionTiming`），但**不改變**現有打卡或金幣發放邏輯。
   - `finishWorkoutSession` 仍依現狀呼叫既有結算與 `checkin()` 流程，不因本單三條件之通過與否而扣發或增發打卡金幣／經驗值。
   - 未來自動打卡判定與獎勵門檻交由 **T1-D1（判定引擎）** 與 **T1-D2（自動發獎）** 接續接入。
2. **存檔版本與欄位不變**：
   - 存檔版本維持 **Version 4**。
   - 完全沿用 T4-D1 定義於 `WorkoutSessionRecord` 與 `LoggedSet` 之欄位：`startedAt`、`completedAt`、`restTimerElapsedSec`、`startedEarly`、`pauseSegments`、`totalDurationSec`、`restSec`、`restShare`、`timingIncomplete`、`sportType`、`loggingMode`。
   - 不增加任何持久化的 `passed` 欄位；判定結果由純函式於讀取或結算時即時計算（第 2 階段由伺服器重算）。
3. **無效／未達標紀錄完整留存**：
   - 亂按（例如 2 分鐘內連按 10 組，組間隔約 5 秒，休息佔比近 0）雖判定為三條件不通過（`passed === false`），但該筆訓練紀錄仍**完整寫入歷史（`workoutHistory`）**，不丟失、不刪除。

---

## 2. 核心計算規則與設計對齊

依據 `/workspace/fitmon-tickets/T4-D2-rest-and-pauses.md` 及官方定案 7 大例子：

1. **總時長 (`totalDurationSec`)**：
   - 來源為第一組開始（`sets[0].startedAt`）到最後一組完成（`sets[sets.length - 1].completedAt`）之毫秒差值，並扣除所有暫停段（`pauseSegments`）。
   - 不以 `workoutElapsedSeconds` 為第一基準；僅在計時不完整（`timingIncomplete: true`）時作為 fallback 顯示時長。
2. **暫停 (`pauseSegments`)**：
   - 單次組間隔（上一組 `completedAt` 到下一組 `startedAt`）**嚴格大於 10 分鐘（> 600 秒）** 即判定為暫停。
   - 暫停段寫入 `pauseSegments`（`{ startedAt, endedAt }`）。
   - 邊界條件：恰好 600 秒不算暫停；600.001 秒（600001 ms）或 601 秒視為暫停。
   - 暫停段從總時長扣除，**整段不計入休息 (`restSec`)**，亦不因暫停而判定整次訓練無效（保護等器材、接電話情境）。
3. **組間休息 (`restSec`)**：
   - 累加各組記錄之實際組間休息計時（`restTimerElapsedSec`，包含提早開始／跳過前已休秒數）。
   - 被標記為暫停之組間隔，其前一組之 `restTimerElapsedSec` 不計入 `restSec`（因該段實質為等器材暫停）。
   - 最後一組後的尾端休息（trailing rest）為選填，不影響計時完整性，亦不計入組間休息。
4. **休息佔比 (`restShare`)**：
   - 公式：`restShare = restSec / totalDurationSec`。
   - **只設下限 ≥ 25%，不設上限**（保護大重量長休 85%~90% 或初學者高休息佔比情境）。
5. **重訓三條件判定 (全部都要符合)**：
   - 條件 1：≥ 2 組。
   - 條件 2：至少一半的組間隔 ≥ 20 秒（浮點計算 `qualifiedCount >= intervalCount / 2`；例如 1 個間隔需 1 個、9 個間隔需 5 個）。
   - 條件 3：休息佔比 ≥ 25%。
   - 適用類型：僅限即時記錄之重訓（`strength`）與徒手重訓（`bodyweight`）。
   - 循環訓練／HIIT（`circuit_hiit`）與有氧類型（`run` 等）不適用本三條件（`appliesThreeConditions: false`，`passed: null`），不因低休息佔比被誤判失敗。

---

## 3. 接續工單決策提問與介面規範 (Decision Questions for T1-D1 / T1-D2)

> **決策提問 1（T1-D1 自動打卡門檻裁決）：**
> 本單已將重訓三條件之純函式計算模組（`evaluateStrengthSessionTiming`）落地並單元測試覆蓋。
> - 在 T1-D1 中，自動打卡裁決引擎應將訓練紀錄 `sessionRecord`（或時間順序的 sets）傳入此函式；本函式現已於萃取 `exerciseLogs` 時依 `startedAt` 自動按時間順序排序，確保混和動作交替訓練（mixed-exercise history）之紀錄重算時安全無虞。
> - 當 `passed === true` 時，觸發 T1-D2 之自動發放 +70 金幣、+100 XP 打卡流程。
> - 當 `passed === false` 時（如連續點擊亂按），不觸發打卡發獎，但歷史仍保留，並於 Today 卡提示「組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數」（T1-D4）。
>
> **決策提問 2（循環訓練／HIIT 與有氧）：**
> `circuit_hiit` 及跑步等運動在本單回傳 `appliesThreeConditions: false` 與 `passed: null`。
> - 請 T1-D1 依據定案規格以「時長 ≥ 10 分鐘」或距離作為該等類型的打卡達標判定，不得套用重訓之 25% 休息佔比下限。
>
> **決策提問 3（事後補記 T4-D9）：**
> 事後補記若為未記錄每組細部時間之重訓（`loggingMode === 'after_the_fact'`），本函式回傳 `appliesThreeConditions: false` 與 `passed: null`。
> - T1-D1 應依據定案之備援門檻「總時長 ≥ 10 分鐘且 ≥ 2 組」進行判定。
