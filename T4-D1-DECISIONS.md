# T4-D1 決策與數值備忘錄 (T4-D1 Decisions & Economic Invariants)

- 日期：2026-11-21
- 工單：T4-D1（多種運動紀錄資料模型與遷移，Zustand Persist Version 3→4）
- 儲存鍵：`fitmon-mvp-storage-v6`（維持不變）

---

## 1. 經濟數值與規則不變性 (Economic Invariants)

依據專案規範與產品經理／幕僚長拍板規則，本 PR 嚴格遵守下列不變性，絕不改動任何金幣與經驗值發放規則：

1. **每日打卡經濟不變**：
   - 每日打卡發放 +70 金幣、+100 XP（由 `checkin()` 裁決）。
   - 當日打卡狀態、打卡紀錄（`checkinLogs`）及打卡日期鍵（`checkinDayKeys`）完整保留。
2. **訓練單組掉落與結算金幣不變**：
   - 專注模式下單組完成時之金幣掉落維持既有神經加權與部位衰減公式（1~8 組 1.0、9 組 0.5、10 組 0.3、11 組 0.15、12 組以上 0.0）。
   - 每日賺幣上限（`DAILY_COIN_CAP` = 500）維持由 `grantCoins` 集中控管。
3. **Boss 獎勵與每週寶箱不變**：
   - 首通賞金、每週戰隊討伐獎勵週標記（`bossRewardClaimedWeekKey`）、每週 3 天寶箱領取資格與獎勵內容維持不變。
4. **歷史存檔紀錄數值不變**：
   - 存檔升級 2→3→4 過程中，所有歷史訓練列（`workoutHistory`）之 `coinsEarned`、`expEarned`、`totalVolume`、`durationMinutes` 原樣保留，絕不重新計算、收回獎勵或丟失歷史資料。

---

## 2. 引擎計算與有氧／瑜珈兼容性決策 (Engine / XP Compatibility)

### 現狀與問題
既有 `@fitmon/engine` 之 `calculateWorkoutExp` 目前使用 `weightKg * reps` 計算每組的 Raw Volume 與 Experience。在既有 12 項動作型錄中：
- 坡度跑步機慢跑（`cardio_incline_run`）與飛輪單車（`cardio_hiit_bike`）誤將距離（公里數）填入 `weightKg`。
- 徒手棒式核心／動態流瑜珈（`bw_plank_core`）誤將計時秒數填入 `weightKg`。

本單 T4-D1 依規格要求停止誤用欄位：
- 新寫入的有氧動作：儲存 `distanceM = weightKg * 1000`，並將持久化的 `weightKg` 設為 `0`。
- 新寫入的徒手／瑜珈動作：儲存 `durationSec = weightKg`，並將持久化的 `weightKg` 設為 `0`。
- 舊存檔遷移：保留既有 `weightKg` 數值（避免干擾舊版顯示介面），並同時補齊 `distanceM` 或 `durationSec`。

### 決策與處理方式
若在 `finishWorkoutSession` 中直接將新格式持久化的 `weightKg: 0` 傳遞給 `calculateWorkoutExp`，將導致有氧與瑜珈動作算出的結算經驗值與金幣瞬間歸零，實質改變遊戲經濟與玩家收益。

因此，本單採取**暫時相容輸入轉換 (Temporary Compatibility Mapping)**：
在 `finishWorkoutSession` 結算時，針對當前型錄項目，若 `unitLabel === 'km'` 則提供由 `distanceM / 1000` 還原之數值；若 `unitLabel === '秒'` 則提供由 `durationSec` 還原之數值傳入 `calculateWorkoutExp`。此舉保證既有有氧與瑜珈課表的結算經驗值與金幣獎勵與改版前 100% 完全相同。

### 待產品／數值策劃決策事項 (Decision Question for T4-D3)
> **決策提問（T4-D3 運動容量演算法導入前夕）：**
> 當 T4-D3 導入專屬的各運動容量與負荷公式時：
> 1. 跑步、快走、游泳（公尺）、單車（公里／公尺）及循環訓練／HIIT、瑜珈伸展（秒數／分鐘）應如何折算為等效負荷容量（Equivalent Training Volume）？
> 2. 有氧與自重核心動作折算出的結算 EXP 與金幣，與漸進式超負荷的大重量重訓（如三大項 SBD）之間，應設定何種基準倍率以維持公平性，既不產生惡性刷幣漏洞，也不減損非重訓運動玩家之成就感？

---

## 3. 資安與隱私遵守 (Security 11/14 Compliance)

本單新增之 6 項本地 store 欄位及 11/21 追加之 3 項新手引導 (T6 / T6-D3) 旗標欄位，嚴格遵循 11/14 資安審查結論與 T6 規劃：
1. `restDayKeys`（`string[]`，預設 `[]`）：僅記錄本地日期標記。
2. `caringDayKeys`（`string[]`，預設 `[]`）：僅記錄本地日期標記。
3. `unwellHalfUsedByWeek`（`Record<string, number>`，預設 `{}`）：僅記錄週鍵與使用次數，不儲存按壓時間戳。
4. `selfCheckCompletedAt`（`string | null`，預設 `null`）：僅記錄完成日期，不留存問卷答題歷史。
5. `selfCheckAnyYes`（`boolean | null`，預設 `null`）：僅記錄是否有任一題答是之純布林值。**遷移與預設必須為 `null`，絕不可預設為 `false`**，以確保後續能正確觸發初次自我檢查引導流程。
6. `unwellNudgeShownWeek`（`string | null`，預設 `null`）：僅記錄當週是否已顯示過輕提示之週鍵。
7. `onboardingCompletedAt`（`string | null`，預設 `null`）：T6 首次引導看過或略過之時間字串，絕不預設為已完成，非健康資料。
8. `onboardingWorkoutHintSeenAt`（`string | null`，預設 `null`）：T6-g 第一次去記錄運動提示顯示狀態，非健康資料。
9. `onboardingSortieHintSeenAt`（`string | null`，預設 `null`）：T6-h 第一次自動打卡後出擊提示顯示狀態，非健康資料。

以上欄位均為本地 Demo 欄位，絕不得出現在分享卡片、Toast、主控台輸出（console logs）、個人檔案或組隊介面中。重置存檔（`resetDemoState`）時一併清除。

---

## 4. T6 新手引導旗標（同一第 4 版，避免之後再升第 5 版）

為避免 T6 / T6-D3 再 bump 存檔版本，第 4 版一併加入三個僅存本機的旗標，預設與遷移皆為 `null`（尚未看過，不可預設成已完成）。若舊存檔已有合法非空字串則保留。重置存檔時隨 localStorage 一併清除。不是健康資料，不進分享圖、卡片、個人檔案、組隊／好友畫面、分析或 console。

- `onboardingCompletedAt`（看過或略過新手引導的時間）
- `onboardingWorkoutHintSeenAt`（T6-g 第一次去運動提示，只記看過的日期）
- `onboardingSortieHintSeenAt`（T6-h 第一次打卡後引導出擊提示，只記看過的日期）

本 PR 不實作 T6 畫面或寫入邏輯。
