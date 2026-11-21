# T1-D1 決策記錄（有效運動判定引擎）

## 1. 存檔與資料模型（無存檔 Bump、維持 v4）
- **持久化 Key 與 Version 維持不變**：維持 `fitmon-mvp-storage-v6`，存檔版本維持 4。
- **不新增任何持久化欄位**：
  - 減半次數讀取既有 v4 欄位 `unwellHalfUsedByWeek`。
  - 「照顧身體中」讀取既有 v4 欄位 `caringDayKeys`。
  - 休息日讀取既有 v4 欄位 `restDayKeys`。
  - 已打卡記錄讀取既有 v4 欄位 `checkinDayKeys`。
- **引擎即時重算**：所有打卡有效性、減半判定、不合理排除均為純函式即時計算，不寫入任何中介快取狀態。

## 2. 第 2 階段雲端對齊（T1-S1 伺服器重跑同一套）
- **不信任客戶端**：所有門檻、休息佔比、暫停扣除、不合理數據判定與每週減半次數，均設計為純函式（`evaluateCheckinValidity`），內部不呼叫 `Date.now()`，完全由呼叫端傳入 `now`。
- 第 2 階段 T1-S1 於 Supabase Edge Functions / Postgres RPC 將直接重用同一套規則與常數。

## 3. 職責分離：不發獎、不接 `checkin()`
- 本單（T1-D1）為純判定引擎，**絕不發放任何金幣 (coins) 或經驗值 (xp)**。
- 引擎回傳結構保證不包含任何金額發放欄位（如 `coins`, `xp`, `coinsGranted`）。
- 不呼叫 `store.checkin()` 或 `grantCoins()`，亦不將引擎掛入 `finishWorkoutSession()` 的自動打卡發獎流程。發獎邏輯歸 T1-D2 負責。
- 透過回傳 `wouldCheckIn` 與 `wouldGrantRewards` 欄位供後續發獎單（T1-D2 / T1-S1）裁決：
  - 當天即時有效達標：`wouldCheckIn === true` 且 `wouldGrantRewards === true`。
  - 補記過去某一天有效達標：`wouldCheckIn === true` 但 `wouldGrantRewards === false`（11:45 / 11:46 已定案：過去日補記不發獎）。

## 4. `countSameWeekBackfillTowardWeeklyDays` 開關（待 YuChien 確認）
- **背景**：補記本週的日期，是否計入本週有動天數、週條與今天 Boss 傷害倍率。
- **決策**：
  - 產品與資安傾向計入（一天一次、一週最多 7 天），依工單要求「先寫條件版」。
  - **預設值設為 `true`（傾向計入）**。
  - 提供可調設定 `countSameWeekBackfillTowardWeeklyDays`，若 YuChien 最終拍板不計入，改設定即可立即切換為 `false`。
  - **已結算週凍結**：若補記日期屬於已結算的週（評估日的週鍵早於 `now` 所在週），資安 11:48 最終版必修強制凍結，**一律不計入週天數**，不受本開關影響。

## 5. 連續天數是否算補記（待 YuChien 確認，本單不做只列題）
- **資安 11:48 必修**：依連續天數發放的里程碑、稱號、成就、排行，以及隊友看到的連續數，**一律只使用即時打卡**，明確排除補記天數。
- **產品建議**：使用者自己看到的連續打卡天數可算入補記天數。
- **本單處理**：本單只專注於單日有效運動之有效性與達標判定，不計算跨日 streak，將本議題完整列入本決策檔，待 YuChien 拍板後於 T1-D2 或 streak 計算單實作。

## 6. 門檻與數值缺口清單（列給教練確認）
- **重訓組數折算分鐘常數**：在事後補記且無每組時間（`timingIncomplete`）的情境下，目前沿用 T4-D5 可調設定預設每組折算 2 分鐘（`strengthSetToMinutes: 2`）。備援門檻為「總時長 ≥ 10 分鐘且 ≥ 2 組」。此常數仍待教練單獨確認。
- **非既有運動類型（球類、自訂、HIIT 等）之冒險技能與容量公式**：目前門檻統一依 YuChien 11/14 定案之「滿 10 分鐘即算數」，容量部分目前維持 non-earning（T4-D3）。
