# T4-D3 決策與運動類型備忘錄 (T4-D3 Decisions & Multi-Sport Classification)

- 日期：2026-11-21
- 工單：T4-D3（擴充運動類型，含循環訓練／HIIT 與舊動作對應）
- 儲存鍵：`fitmon-mvp-storage-v6`（維持不變）
- 存檔版本：**4**（維持不變，絕不升級版本號）

---

## 1. 經濟與結算數值不變性 (Option A & Economic Invariants)

本工單嚴格遵循 Option A 規範，不自行發明任何新運動類型的容量折算公式，且維持遊戲數值經濟 100% 穩定：

1. **既有 12 項型錄動作結算收益 100% 不變**：
   - 9 項既有重訓器材（`barbell_squat`、`barbell_bench_press`、`conventional_deadlift`、`overhead_press`、`pull_ups`、`barbell_row`、`leg_press`、`lateral_raise`、`dumbbell_curl` 以及歷史別名 `lat_pulldown`）維持原本的 `weightKg × reps` 結合神經係數與衰減係數結算。
   - 跑步機慢跑（`cardio_incline_run`）與飛輪單車（`cardio_hiit_bike`）：抽取純函式 `toLegacySettlementInput`，由 `distanceM / 1000` 完整還原原先寫在 `weightKg` 之公里數傳遞予 `@fitmon/engine`。
   - 徒手棒式核心（`bw_plank_core`）：由 `durationSec` 完整還原原先寫在 `weightKg` 之秒數傳遞予 `@fitmon/engine`。
   - 所有既有 12 項動作算出的總生容量 (`totalRawVolume`)、結算經驗值 (`totalExperience`) 與金幣 (`totalCoins`) 與改版前完全相同。
2. **新運動類型採非獲獎模式 (Non-Earning)**：
   - 既有引擎 `calculateWorkoutExp` 具備底限保護：`finalCoins = Math.max(1, Math.floor(finalExp / 10))`，若直接傳入 `weightKg: 0` 仍會被發放最低 1 金幣。
   - 依規格要求，凡當前無歷史等效對應之新類型（`walk`、`swim`、`ball`、`circuit_hiit`、`custom` 以及新拆分之 `yoga_dynamic_flow`），在專屬容量公式拍板前**均為 non-earning**：直接回傳 0 金幣與 0 經驗值，不調用 `grantCoins`，防止惡性刷幣或數值破壞。
   - 程式碼中已保留明確的 `// TODO: 待 T4-D3 運動容量與負荷公式定案` 註記。
3. **每日打卡與雙倍券機制不變**：
   - 完成訓練觸發打卡發放 +70 金幣、+100 XP 邏輯完全維持現狀。
   - 氮泵雙倍金幣（`doubleCoinUntil`）與乳清蛋白（`hasWheyProtein: true`）加成維持現有狀態。
4. **個人最佳 (PR) 嚴格限定為真實重量 (kg)**：
   - PR 判定僅對 `sportType === 'strength'` 且 `unitLabel === 'kg'` 之重訓項目生效。

---

## 2. 運動類型擴充與型錄對應 (Sport Types & Catalog Mapping)

運動類型由既有 3 項擴充為已於 11/14 定案之 10 項 `WorkoutSessionSportType` / `SportType`：

| 類型 ID | 名稱 | 單位標籤 | 型錄動作對應與說明 |
|---|---|---|---|
| `strength` | 槓鈴／器械重量訓練 | `kg` | 既有 9 項複合與孤立動作，維持原 ID，`sportType: 'strength'`。 |
| `run` | 跑步 | `km` | `cardio_incline_run`（坡度跑步機 / Zone 2 慢跑）及歷史 `treadmill_run` 由 `cardio` 遷移至 `run`。 |
| `cycle` | 單車 | `km` | `cardio_hiit_bike`（飛輪單車 HIIT 間歇衝刺）由 `cardio` 遷移至 `cycle`（非 circuit_hiit）。 |
| `bodyweight` | 徒手自重核心 | `秒` | `bw_plank_core` 維持原 ID，名稱更新為「徒手棒式核心」（去除瑜珈），`sportType: 'bodyweight'`。維持 D1 定案，不改為「重訓輔助」。 |
| `yoga_stretch` | 瑜珈／伸展 | `分鐘` | 新增獨立動作 ID `yoga_dynamic_flow`（動態流瑜珈），`sportType: 'yoga_stretch'`。 |
| `walk` | 快走／健走 | `km` | 新增型錄動作 ID `walk_brisk`（快走／健走），`sportType: 'walk'`。 |
| `swim` | 游泳 | `公尺` | 新增型錄動作 ID `swim_freestyle`（游泳），`sportType: 'swim'`。**距離單位強制為公尺，絕非 km**。 |
| `ball` | 球類運動 | `分鐘` | 新增型錄動作 ID `ball_sports`（球類），`sportType: 'ball'`。 |
| `circuit_hiit` | 循環訓練／HIIT | `分鐘` | 新增型錄動作 ID `circuit_hiit`（循環訓練／HIIT），`sportType: 'circuit_hiit'`。 |
| `custom` | 自訂運動 | `分鐘` | 新增型錄動作 ID `custom_workout`（自訂），`sportType: 'custom'`。 |

對應函式 `mapLegacyExerciseToSportType` 完整支援上述所有 ID 查找；未知項目若 `unitLabel === '公尺'` 或 `'m'` 則推論為 `swim`（絕不誤判為 `strength`），其餘 fallback 沿用既有規則。

---

## 3. 循環訓練／HIIT 與休息佔比判定隔離 (Circuit HIIT In-Memory Session Field)

### 問題背景
`finishWorkoutSession` 原先單純依據第一組動作推論整次訓練之類型。若使用者執行一筆「循環訓練／HIIT」，而課表第一組為槓鈴深蹲（`barbell_squat`），會被誤判為 `strength` 並套用 T4-D2 之重訓三條件（≥2組、組間隔≥20秒、休息佔比≥25%），導致間歇訓練或超級組因休息時間短而被誤判無效。

### 解決方案（無須 Bump Persist 版本，無新增持久化欄位）
1. 在 Zustand Store 增加純記憶體（In-Memory Only）欄位 `activeSessionSportType: WorkoutSessionSportType | null`。
2. 該欄位**嚴格排除**在 `persist partialize` 之外，完全不寫入 `localStorage`，存檔版本穩固維持第 4 版。
3. 進入專注模式 `startWorkoutFocus(routine)` 時，若為自由訓練（無 routine）則保留為 `null`（不強制預設為 strength）；若由課表起始，則依起始課表之 `routine.sportType` 或第一項動作之類型設定並在 session 期間凍結。
4. 自由訓練未記錄任何組數前（`sessionSets.length === 0`），替換或切換選定動作會即時更新 `activeSessionSportType`（例如由深蹲替換為循環訓練／HIIT）；記錄任一組後（或首組記錄時由該組動作類型推論填入）即凍結，不再隨後續動作變更。
5. 退出或結算專注模式（`finishWorkoutSession`、`discardWorkoutSession`）時，重置為 `null`。
6. 結算時優先採用 `activeSessionSportType`，若為 null 則 fallback 至首組動作之推論類型，傳入 `evaluateStrengthSessionTiming`。
7. 單元測試已覆蓋：一筆 `sportType === 'circuit_hiit'` 之訓練，即便其內部組數全部包含深蹲（`barbell_squat`）且休息佔比近乎 0%，三條件計算模組均回傳 `appliesThreeConditions: false` 與 `passed: null`，徹底隔離誤判。

---

## 4. 冒險技能對應決策 (Adventure Skills Alignment)

戰鬥系統中之冒險技能僅支援 `AdventureSportSkillType = 'strength' | 'cardio' | 'bodyweight'`，其傷害與屬性相剋邏輯嚴格綁定：
- 透過純函式 `toAdventureSportSkillType` 裁決：
  - `strength` → `strength`（物攻暴擊）
  - `run`、`cycle`（即原型錄 `cardio`） → `cardio`（魔攻燃脂）
  - `bodyweight`（`bw_plank_core`） → `bodyweight`（核心支援）
  - `walk`、`swim`、`yoga_stretch`、`ball`、`circuit_hiit`、`custom`：**目前維持玩家原本的 `todaySportType` 不變**，不私自猜測或修改戰鬥技能類型，避免破壞數值平衡。

---

## 5. UI 範圍界定 (No D4 UI Scope)

本工單嚴格遵守工單分工邊界，絕不提前實作 T4-D4 專屬記錄表單與類型挑選畫面：
1. **無新增挑選頁或紀錄表單**：完整非重訓專屬計時／距離紀錄畫面交由 T4-D4 依已定稿設計實作。
2. **既有篩選膠囊微幅擴展**：在現有的「自由訓練替換彈窗（Swap Modal）」與「自訂課表彈窗（Routine Builder Modal）」中，將原僅有「全部／重訓／有氧／徒手」之篩選標籤擴展為支援全部 10 種運動類型，並支援水平滑動（`overflow-x-auto`），保證所有型錄項目均能在既有介面中被檢索與選取。

---

## 6. 產品經理與教練決策事項 (Decision Questions for PM / YuChien & Coaches)

> ### 決策提問 1（產品經理 / YuChien：非重訓運動容量折算公式）
> 既有型錄動作之坡度跑步機（`cardio_incline_run`，運動類型 `run`）與飛輪單車（`cardio_hiit_bike`，運動類型 `cycle`）仍依據 Option A 相容對應機制正常結算金幣與經驗值。僅新運動類型（快走 `walk`、游泳 `swim`、球類 `ball`、循環訓練／HIIT `circuit_hiit`、自訂 `custom`）以及新拆分之瑜珈動作（`yoga_dynamic_flow`）在專屬容量公式拍板前採非獲獎模式（0/0 non-earning），避免誤領引擎保底之 1 金幣。
> - 未來新運動類型如何折算為等效訓練負荷（Equivalent Training Volume）？
> - 範例思考：游泳 500 公尺、健走 3 公里、HIIT 20 分鐘、瑜珈 30 分鐘，應折合為多少基礎 EXP 與金幣？其產出上限如何與重訓三大項之疲勞衰減曲線對齊，以防止外掛刷步數或距離破壞遊戲經濟？
>
> ### 決策提問 2（教練團隊：型錄新增動作之三大安全提示文案）
> 本單依規範為新收錄之 6 項動作使用明確的暫存提示文案：
> `['動作說明與安全提示待教練確認', '動作說明與安全提示待教練確認', '動作說明與安全提示待教練確認']`。
> - 請教練團隊針對 `yoga_dynamic_flow`（動態流瑜珈）、`walk_brisk`（快走／健走）、`swim_freestyle`（游泳）、`ball_sports`（球類）、`circuit_hiit`（循環訓練／HIIT）、`custom_workout`（自訂）提供正式的三點安全與動作指導文案。
>
> ### 決策提問 3（教練團隊 / 數值策劃：新運動類型之冒險戰鬥技能歸屬）
> 目前冒險 Boss 討伐僅區分 `strength`（物攻）、`cardio`（魔攻）、`bodyweight`（核心技）。
> - 游泳（`swim`）、快走（`walk`）是否全數歸入 `cardio`？
> - 動態流瑜珈（`yoga_stretch`）應歸入 `bodyweight` 還是獨立為輔助治癒技？
> - 球類（`ball`）與循環訓練（`circuit_hiit`）是否應根據當日主練項目動態判定，抑或作為全能協同加成？
