# T1-D2 決策紀錄與架構設計（T1-D2-DECISIONS.md）

- 單號：T1-D2 首筆有效紀錄自動發打卡獎
- 日期：2026-11-22（台北時間）
- 狀態：已實作完成，單元測試與 build 全數通過

---

## 1. 核心決策與不變性保證

### 1.1 不 bump persist version、不新增欄位
- Zustand persist 版本維持 4，persist storage key 維持 `fitmon-mvp-storage-v6`。
- 本單未新增任何持久化新欄位。既有欄位 `unlockCheckinDays`、`checkinDayKeys`、`lastCheckinDate`、`checkinLogs`、`unwellHalfUsedByWeek` 已存在，本單開始以正確規則寫入。
- 補記識別依資安 11:48 方案：透過 `checkinLogs` 中的 `getLocalDayKey(timestamp) !== dayKey` 純粹推斷，完全無需擴充 schema 欄位。

### 1.2 發獎決策在純函式，store 只套 patch
- 新增純函式 `applyCheckinGrant(input)` 於 `apps/web-demo/src/game/checkinGrant.ts`。
- 純函式內部絕不讀取 `Date.now()`、不讀寫 Zustand store、不產生任何副作用。所有時間完全依賴呼叫端傳入之 `nowMs`。
- 第 2 階段雲端接軌（T1-S1）時，可原封不動搬至 Supabase RPC / Edge Function 端重複執行，不信任客戶端計算。

### 1.3 結算幣與打卡獎的關係及共用每日上限
- **每項運動量結算幣**（`source: 'workout'`）：在 `finishWorkoutSession` 中依照完成組數、時長、容量先行計算並透過 `grantCoins` 發放。
- **打卡獎勵**（`source: 'checkin'`）：結算紀錄寫入後，當天若首次達成有效運動門檻且 `wouldGrantRewards === true`，額外發放 +70 打卡幣與 +100 XP。
- **每日上限共享機制**：
  - 兩筆金幣均經由既有 `grantCoins` 邏輯判定，受每日上限 90 幣限制（雙倍券生效時收入與上限均翻倍至 180 幣）。
  - 若結算幣已佔用部分上限（例如已入 30 幣），打卡幣將受容量限制被夾住（例如最多再入 60 幣，並標記 `capReached: true`）。
  - 若今日額度已滿（90/90），打卡幣實際入帳 0 幣，但打卡狀態、+100 XP 與 `unlockCheckinDays` 仍照常記入。
- **第二筆運動與未達標運動**：結算幣照常發放（維持既有 Option A 結算），但不發放打卡幣與打卡 XP。
- **Boss 賞金與週寶箱**：仍走 `grantUncappedCoins`，不計入每日上限、不吃雙倍券。

### 1.4 unlockCheckinDays 解鎖累計天數規則（MASTER-PLAN 4.6）
- `unlockCheckinDays` 嚴格依據 MASTER-PLAN 4.6 定案：「解鎖用累計天數只算即時打卡」。
- 僅在當日即時打卡（`wouldGrantRewards === true` 且當天尚未打卡）時 `+1`，同一天絕對不加第二次，只增不減。
- 補記過去日期時，`unlockCheckinDays` 絕不增加。

### 1.5 補過去某一天（事後補記，T4-D9 / 資安 11:48）
- 補過去某一天且有效運動門檻達標：
  - 寫入該日之 `checkinDayKeys`（歷史打卡）。
  - 新增 `checkinLogs`（`dayKey = 過去日期`，`timestamp = nowMs`）。
  - 絕對不修改 `lastCheckinDate`（維持目前今日狀態，避免破壞 `isCheckedInToday()`）。
  - 絕對不發金幣、不發 XP、不增加 `unlockCheckinDays`。
  - 雙倍券與每日上限對此路徑不適用（無幣可發）。
- 補未來日期：若 `dayKey > todayKey`，一律拒絕（`ok: false, reason: 'future_date'`）。
- 帳號建立日前：早於 `joinDayKey` 一律拒絕（`ok: false, reason: 'before_account'`）。
- 已結算週凍結：補上週或更早之日期，不重開本週寶箱、不改本週 Boss、不影響本週傷害倍率計算。

### 1.6 手動按鈕（CheckInSheet）與自動路徑整合
- 依工單保留 `store.checkin()` 及 `CheckInSheet`（移除留待 T1-D3）。
- 嚴格封堵空按領獎：手動點擊「今天有動」時，先以當天 `workoutHistory` 執行 `evaluateCheckinValidity`。
- 若今日尚未達標或無有效運動：不發獎、不寫打卡，toast 提示「先記下今天的運動，達標就會自動發獎」。
- 若今日已經打過卡：toast 提示「今天已經打過卡了喔！」，不重複發獎。
- 自動與手動共用同一套 `applyCheckinGrant`，保證單日冪等、絕無雙重發獎可能。

### 1.7 VictoryModal 與 CheckInResultModal 不重疊彈出
- 若本次訓練觸發了打卡發獎（`grantedRewards === true`）：
  - 設置 `checkinResult` 開啟 `CheckInResultModal`（顯示 +70 幣、+100 XP、等級條、傷害倍率與寶箱提示）。
  - 將 `victoryModalData` 設為 `null`，不彈出 VictoryModal，避免使用者需連續關閉兩次彈窗。
- 若本次訓練未達門檻、或今日已打卡的第二筆：
  - `checkinResult` 為 `null`。
  - `victoryModalData` 照常開啟，使用者仍可看到課表完成、PR 紀錄與結算幣。

### 1.8 CheckInResultModal 文案對齊
- 標題：升級維持「升上 Lv.X！」，未升級採用設計文案「今天算數了！」。
- 獎勵行：清楚顯示 `+100 XP` 與 `+X 🪙`。當幣因上限被夾至 0 時，顯示 `+0 🪙` 並附註 `今日遊戲幣已達上限`。
- 寶箱提示：當 `daysThisWeek >= WEEKLY_CHEST_DAYS_REQUIRED` (3 天) 且本週寶箱尚未領取（`chestClaimedWeekKey !== currentWeekKey`）時，顯示「本週寶箱可以開了」，不洩漏天數細節與箱內數值。

---

## 2. 待確認項目（待 YuChien／教練／資安）

### 2.1 待 YuChien 確認
1. **補本週日期是否計入本週有動天數、週條與今天 Boss 傷害倍率**：
   - 目前實作：已依工單實作條件開關 `countSameWeekBackfillTowardWeeklyDays`，預設為 `true`（計入）。
   - 若改設為 `false`，則補本週過去日的紀錄不會增加 `daysThisWeek`，也不會提升今天 Boss 傷害倍率。
   - 上週或更早（已結算週）已依資安 11:48 徹底凍結，無論開關為何均不計入本週天數。
2. **自己看到的連續天數（Streak）是否採計補記**：
   - 目前實作：既有 `getCheckinStreak(checkinDayKeys)` 依據 `checkinDayKeys` 計算，因補記過去日會將該日期加入 `checkinDayKeys`，故自己看到的連續數會算入補記（符合產品傾向）。
   - 資安必修保證：隊友端看到的連續天數、以及後續依連續天數發放的稱號／成就／里程碑，必須只採計即時打卡（本單尚未新增里程碑發獎）。

### 2.2 待教練確認
1. **重訓組數換算時長的常數**：
   - 目前保留原始組數與時長判定，做成可調設定。
2. **CheckInResultModal 文案定稿**：
   - 標題「今天算數了！」與寶箱行「本週寶箱可以開了」已依 11:45 定案實作。若教練對運動面語氣有微調建議可再提出。

### 2.3 待資安確認
1. **第 2 階段 RPC 與伺服器權威**：
   - 本單發獎與打卡判定完全封裝於 `applyCheckinGrant` 純函式，與第 1 階段 T1-D1 `evaluateCheckinValidity` 結構一致，已備妥供 T1-S1 移植至伺服器端 `UNIQUE(user, local_date)` RPC。
   - 試玩版防作弊：前端無法透過手動按鈕空按領獎，健康 App 延遲同步不發獎、不補打卡，已結算週凍結。

---

## 3. 工程權衡與選擇（猶豫但做的決定）

1. **CheckInResultModal 與 VictoryModal 的優先級**：
   - 工單要求「與課表勝利窗不要各彈一次」。
   - 當發放打卡獎時，使用者最期待的是打卡獎勵與出擊引導（`CheckInResultModal` 有明確的「去出擊」CTA 與升級動畫）。因此決定在 `grantedRewards === true` 時將 `victoryModalData` 設為 `null`，優先展示 `CheckInResultModal`。而在第二筆運動或未達標時，則保留 `VictoryModal`，完整呈現 PR 與動作回饋。
2. **打卡幣被夾到 0 幣時的呈現**：
   - 若當天先前運動已拿滿 90 幣上限，打卡時實際入帳為 0 幣。若完全隱藏金幣圖示，使用者可能會誤以為漏發；因此選擇顯示 `+0 🪙` 並附帶文字提示 `今日遊戲幣已達上限`，讓驗收與使用者均清楚明瞭。
3. **checkinLogs 補記標記的儲存**：
   - 工單嚴格禁止新增 persist 欄位，同時資安要求區分即時打卡與補記。
   - 我們選擇在寫入補記時，將 `checkinLogs` 的 `dayKey` 設為補記目標日，而 `timestamp` 設為當前執行時間（`nowMs`）。如此一來，任何純函式（如 `getDamageInfo`）只需比較 `getLocalDayKey(entry.timestamp) !== entry.dayKey` 即可精確辨識補記，既滿足資安 11:48，又保證 100% 舊存檔相容且不 bump schema。
