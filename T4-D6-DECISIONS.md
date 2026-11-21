# T4-D6 決策備忘錄：不合理數據上限、純函式判定與文案定案 (T4-D6 Decisions & Implausible Caps)

- 日期：2026-11-21
- 工單：T4-D6（不合理數據上限與提示）
- 儲存鍵：`fitmon-mvp-storage-v6`（維持不變）
- 存檔版本：**4**（維持不變，嚴禁 bump version，嚴禁新增持久化欄位）
- 相關規格：`/workspace/fitmon-tickets/T4-D6-implausible-caps.md`、`/workspace/fitmon-adventure/t1-t4-auto/spec.md` §3.10、`copy-for-coach.md` 46–52b

---

## 1. 存檔架構與動態即時重算 (Zero Persisted Fields & Recompute Rule)

本工單嚴格遵守產品與資安指導方針：

1. **不增加任何新的持久化欄位**：
   - 不在 `WorkoutSessionRecord` 新增 `countsTowardCheckin`、`flagReason` 或 `flagDetail`。
   - 不變更 Zustand persist key（維持 `fitmon-mvp-storage-v6`），存檔版本維持 **Version 4**。
2. **純函式動態即時重算 (On-the-fly Recomputation)**：
   - 所有上限裁決一律由決定性純函式 `evaluateImplausibleSession(session, { otherDaySessions, caps, now })` 計算。
   - 在歷史列表顯示（`AnalyticsTab`）、專注模式結算點擊（`WorkoutTab`）及結算存檔流程（`finishWorkoutSession`）時動態求值。
   - **重大效益**：當未來在 `implausibleCaps.ts` 調整任何運動上限預設值時，前端與歷史紀錄即時適用新規則，完全不需執行存檔遷移或修改歷史紀錄。
3. **第 2 階段雲端裁決規範**：
   - 程式碼明確註記：`// 第 2 階段由伺服器用同一組鍵與預設值重算，不信任客戶端`。
   - 客戶端與未來的雲端後端共用同一組設定鍵名與預設上限，後端在 `POST workout_record` 接收時重新裁決。

---

## 2. 上限設定值與邊界規則 (Caps & Strict Boundary Invariants)

設定集中於 `apps/web-demo/src/config/implausibleCaps.ts`，支援可選覆寫：

| 設定鍵 (`ImplausibleCapsConfig`) | 預設值 | 判定規則（嚴格大於） | 判定原因 / 處理路徑 |
|---|---|---|---|
| `maxRunAvgKmh` | 25 | 時速 > 25.0 km/h 判定超限 | `implausible_speed`，不列入打卡 |
| `maxWalkAvgKmh` | 12 | 時速 > 12.0 且 ≤ 25.0 km/h | 詢問 `suggestSportType: 'run'`，**照樣算數** |
| `maxCycleAvgKmh` | 60 | 時速 > 60.0 km/h 判定超限 | `implausible_speed`，不列入打卡 |
| `maxSwimSecPer100m` | 45 | 配速 < 45.0 秒/100m 判定超限 | `implausible_speed`，不列入打卡 |
| `maxStrengthSetKg` | 500 | 任一組 > 500.0 kg 判定超限 | `implausible_strength`，不列入打卡 |
| `maxStrengthSetReps` | 100 | 任一組 > 100 次 判定超限 | `implausible_strength`，不列入打卡 |
| `maxStrengthSetsPerSession` | 60 | 總組數 > 60 組 判定超限 | `implausible_strength`，不列入打卡 |
| `maxSessionHours` | 12 | 單筆時長 > 12.0 小時 判定超限 | `session_too_long`，不列入打卡 |
| `maxDayTotalHours` | 16 | 當日累積時長 (含本筆) > 16.0 小時 | `day_too_long`，不列入打卡 |
| `walkSuggestRunKmh` | 12 | 等於 `maxWalkAvgKmh` | 快走建議改為跑步之門檻 |

### 關鍵邊界規則：
1. **恰好等於上限不算超限**：
   - 跑步 25.0 km/h 通過；25.1 km/h 超限。
   - 快走 12.0 km/h 為正常快走；13.0 km/h 詢問改跑步；25.0 km/h 仍為詢問改跑步；25.1 km/h 判定超限（直接不算打卡，不彈詢問）。
   - 單車 60.0 km/h 通過；60.1 km/h 超限。
   - 游泳 45.0 秒/100m 通過；44.9 秒/100m 超限。
   - 重訓 500 kg、100 次、60 組皆通過；500.1 kg、101 次、61 組超限。
   - 單筆時長 12 小時（43200 秒）通過；43201 秒超限。
   - 單日累積時長 16 小時（57600 秒）通過；57601 秒超限。
2. **時長 0 或缺漏非有效速度**：
   - `durationSec <= 0` 或 `distanceM <= 0` 時無法換算有效時速，不判定超速，亦不觸發快走改跑步詢問。
3. **浮點數精度保護**：
   - 計算平均時速與配速時將結果精確至 6 位小數，避免 IEEE-754 浮點微差（如 `60000 / 3600 * 3.6 = 60.00000000000001`）導致 60.0 km/h 被誤判為超限。

---

## 3. 打卡防護與發獎閘門 (Check-in Gating Rules)

1. **發獎責任劃分**：
   - 本單負責判定「該筆紀錄是否列入打卡計算（`countsTowardCheckin`）」。
   - 打卡發獎機制歸屬 T1，但依 11/14 定案規則，超限紀錄**暫不算進今日打卡**。
2. **結算閘門實作 (`finishWorkoutSession`)**：
   - 當 `implausibleEval.countsTowardCheckin === false` 時，**不呼叫 `state.checkin()`**。
   - `lastCheckinDate`、打卡經驗（+100 XP）、打卡金幣（+70 幣）完全維持不變。
   - 動作訓練容量與 Option A 結算金幣照常結算，紀錄照常寫入 `workoutHistory`。
3. **快走建議跑步路徑**：
   - 時速介於 12 至 25 km/h 之快走，`countsTowardCheckin === true`。
   - 玩家若選擇「改成跑步」，將 `sportType` 更新為 `'run'`，提示 Toast「已改成跑步，這筆照樣算數」，結算照常計入打卡。
   - 玩家若選擇「維持快走」，保持 `'walk'`，結算亦照常計入打卡。
4. **T1 銜接約定**：
   - 未來 T1-D1（門檻判定引擎）與 T1-D2（自動發獎）取代既有結算打卡時，必須呼叫同一個純函式 `evaluateImplausibleSession` 作為打卡門檻的前提過濾器。

---

## 4. 文案定案與教練審核對齊 (Coach-Approved Copy 46–52b)

本單嚴格使用 `copy-for-coach.md` 第 46–52b 條與定稿設計畫面，嚴禁出現「作弊」、「違規」、「處罰」或「比世界紀錄還快」等羞辱性或壓力用詞：

1. **一般超限 Sheet (`ImplausibleSheet`，D6a)**：
   - 標題：`這筆數字好像怪怪的`（第 46 條）
   - 跑步超速：`平均時速 n 公里，比頂尖選手的速度還快，可能是距離或時間填錯了。`（第 47 條）
   - 游泳超速：`平均每 100 公尺 n 秒，比頂尖選手還快，可能是距離或時間填錯了。`（第 52b 條）
   - 單車超速（補齊說明）：依工單要求補齊第 52b 條單車斷句「平均時速 n 公里，比一般騎車快很多…」，以與跑步相同語意結尾定稿為：`平均時速 n 公里，比一般騎車快很多，可能是距離或時間填錯了。`
   - 重訓超限：
     - 重量超限：`單組 n 公斤超過常見範圍（上限 500 公斤），可能是單位或數字打錯了。改好就會重新計算。`（第 52 條）
     - 次數超限：`單組 n 次超過常見範圍（上限 100 次），可能是單位或數字打錯了。改好就會重新計算。`（第 52b 條）
     - 組數超限：`單次 n 組超過常見範圍（上限 60 組），可能是單位或數字打錯了。改好就會重新計算。`（第 52b 條）
   - 時長超限：
     - 單筆：`單筆超過 12 小時，可能是忘了按結束`（第 52b 條）
     - 單日累計：`今天加起來超過 16 小時，可能是忘了按結束`（第 52b 條）
   - 註腳：`這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。`（第 48 條）
   - 按鈕：主要「修改數字」；次要文字「先這樣存」（第 48 條）
2. **快走改跑步 Sheet (`WalkToRunSheet`，D6b)**：
   - 標題：`要不要改成跑步？`（第 49 條）
   - 內文：`平均時速 n 公里，比較像跑步的速度。`（第 49 條）
   - 主要按鈕：`改成跑步`；次要按鈕：`維持快走`（第 50 條）
   - 綠色說明：`都不改也沒關係，這筆照樣算數。`（第 50 條）
   - 改成跑步後 Toast：`已改成跑步，這筆照樣算數`（第 51 條，D6c）
3. **歷史紀錄列表 (`AnalyticsTab`，D6d)**：
   - 超限卡片底色：`#FFFBF0`，邊框：`#F5D58A`（琥珀色系，不用警告紅）
   - 標籤 Badge：`暫不算打卡・可以修正`（第 52 條，`data-testid="history-flagged-badge"`）
   - 按鈕：「修改」，點擊打開輕量修正視窗 `EditFlaggedSessionModal`
   - 說明文字：顯示對應第 52/52b 條之原因說明
   - 快走建議跑步（維持快走或改為跑步者）**絕不顯示**此標籤或琥珀色底色。

---

## 5. UI 與測試約定 (TestIDs & Verification)

提供給自動化測試（Playwright / Node test runner）之專屬 `data-testid` 屬性：
- `implausible-sheet`：超限提示 Sheet 容器
- `implausible-edit`：超限提示 Sheet 之「修改數字」主按鈕
- `implausible-save-anyway`：超限提示 Sheet 之「先這樣存」文字按鈕
- `walk-to-run-sheet`：快走建議跑步 Sheet 容器
- `walk-change-to-run`：快走建議跑步之「改成跑步」主按鈕
- `walk-keep-walk`：快走建議跑步之「維持快走」次要按鈕
- `history-flagged-badge`：歷史紀錄列表上被標記超限之徽章

---

## 6. 教練與產品確認事項備忘 (Notes for Coach & Product)

1. **單車超限文案補齊備查**：第 52b 條表格內單車文案原為「比一般騎車快很多…」，工程已補齊為「平均時速 n 公里，比一般騎車快很多，可能是距離或時間填錯了。」與跑步維持一致之親切語氣。
2. **歷史紀錄修正入口**：本單實作了模範輕量編輯視窗（`EditFlaggedSessionModal`），使用者可直接修正錯誤之重量、次數、距離或時長。修正後重新調用純函式，若合格則超限標記立即消失；不涉及 T4-D4 重構。
